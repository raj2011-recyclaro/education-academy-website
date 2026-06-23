import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { bootcamps } from "./data/bootcamps.js";
import { categories } from "./data/categories.js";
import { getHomepageContent } from "./data/homepage.js";
import { masterclasses } from "./data/masterclasses.js";
import { testimonials } from "./data/testimonials.js";
import { query } from "./db/pool.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

app.use(express.json());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === frontendUrl) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
  }),
);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const cleanString = (value) =>
  typeof value === "string" ? value.trim() : "";

const nullableString = (value) => cleanString(value) || null;

const toBoolean = (value) => value === true || value === "true" || value === "on";

const missingValues = (values, fields) =>
  fields.filter((field) => !cleanString(values[field]));

const sendValidationError = (res, fields) =>
  res.status(400).json({
    error: "Validation failed",
    message: `Missing required field${fields.length > 1 ? "s" : ""}: ${fields.join(", ")}`,
    fields,
  });

const sendEmailValidationError = (res) =>
  res.status(400).json({
    error: "Validation failed",
    message: "A valid email is required",
    fields: ["email"],
  });

const sendDatabaseError = (res, error) => {
  console.error("Database operation failed:", error.message);
  res.status(500).json({
    success: false,
    error: "Database error",
    message: "Could not save your submission. Please try again later.",
  });
};

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "upskillr-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/db/health", async (_req, res) => {
  try {
    const result = await query("SELECT NOW() AS now");
    res.json({
      ok: true,
      databaseTime: result.rows[0].now,
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);
    res.status(500).json({
      ok: false,
      error: "Database connection failed",
    });
  }
});

app.get("/api/masterclasses", (_req, res) => {
  res.json({ data: masterclasses });
});

app.get("/api/homepage", (_req, res) => {
  res.json({ data: getHomepageContent() });
});

app.get("/api/categories", (req, res) => {
  const featuredOnly = req.query.featured === "true";
  const data = categories
    .filter((category) => !featuredOnly || category.featured)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  res.json({ data });
});

app.get("/api/testimonials", (req, res) => {
  const featuredOnly = req.query.featured === "true";
  const data = testimonials.filter((story) => !featuredOnly || story.featured);
  res.json({ data });
});

app.get("/api/masterclasses/:slug", (req, res) => {
  const course = masterclasses.find((item) => item.slug === req.params.slug);
  if (!course) {
    res.status(404).json({ error: "Not found", message: "Masterclass not found" });
    return;
  }
  res.json({ data: course });
});

app.get("/api/bootcamps", (_req, res) => {
  res.json({ data: bootcamps });
});

app.get("/api/bootcamps/:slug", (req, res) => {
  const course = bootcamps.find((item) => item.slug === req.params.slug);
  if (!course) {
    res.status(404).json({ error: "Not found", message: "Bootcamp not found" });
    return;
  }
  res.json({ data: course });
});

app.post("/api/registrations", async (req, res) => {
  const legacyPayload = Boolean(req.body.fullName || req.body.itemSlug || req.body.itemType);
  const values = {
    courseType: cleanString(req.body.courseType ?? req.body.itemType),
    courseSlug: cleanString(req.body.courseSlug ?? req.body.itemSlug),
    courseTitle: nullableString(req.body.courseTitle ?? req.body.itemTitle),
    name: cleanString(req.body.name ?? req.body.fullName),
    email: cleanString(req.body.email),
    phone: cleanString(req.body.phone ?? req.body.whatsapp),
    whatsappConsent: toBoolean(req.body.whatsappConsent),
    emailConsent: toBoolean(req.body.emailConsent),
    smsConsent: toBoolean(req.body.smsConsent),
    sourcePage: nullableString(req.body.sourcePage),
    utmSource: nullableString(req.body.utmSource),
    utmMedium: nullableString(req.body.utmMedium),
    utmCampaign: nullableString(req.body.utmCampaign),
  };

  if (legacyPayload && !values.phone) {
    values.phone = "not provided";
  }

  const missing = missingValues(values, ["courseType", "courseSlug", "name", "email", "phone"]);
  if (missing.length) {
    sendValidationError(res, missing);
    return;
  }
  if (!emailPattern.test(values.email)) {
    sendEmailValidationError(res);
    return;
  }

  try {
    const result = await query(
      `INSERT INTO registrations (
        course_type,
        course_slug,
        course_title,
        name,
        email,
        phone,
        whatsapp_consent,
        email_consent,
        sms_consent,
        source_page,
        utm_source,
        utm_medium,
        utm_campaign
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, created_at`,
      [
        values.courseType,
        values.courseSlug,
        values.courseTitle,
        values.name,
        values.email,
        values.phone,
        values.whatsappConsent,
        values.emailConsent,
        values.smsConsent,
        values.sourcePage,
        values.utmSource,
        values.utmMedium,
        values.utmCampaign,
      ],
    );
    const saved = result.rows[0];
    res.status(201).json({
      success: true,
      registrationId: saved.id,
      createdAt: saved.created_at,
      message: "Registration saved successfully",
      data: {
        id: saved.id,
        status: "confirmed",
        fullName: values.name,
        email: values.email,
        phone: values.phone,
        itemSlug: values.courseSlug,
        itemType: values.courseType,
        itemTitle: values.courseTitle,
        createdAt: saved.created_at,
      },
    });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.post("/api/waitlist", async (req, res) => {
  const legacyPayload = Boolean(req.body.interest && !req.body.name && !req.body.phone);
  const values = {
    bootcampSlug: nullableString(req.body.bootcampSlug),
    bootcampTitle: nullableString(req.body.bootcampTitle ?? req.body.interest),
    name: cleanString(req.body.name),
    email: cleanString(req.body.email),
    phone: cleanString(req.body.phone),
    message: nullableString(req.body.message),
    sourcePage: nullableString(req.body.sourcePage),
  };

  if (legacyPayload) {
    values.name = values.name || "Website visitor";
    values.phone = values.phone || "not provided";
  }

  const missing = missingValues(values, ["name", "email", "phone"]);
  if (missing.length) {
    sendValidationError(res, missing);
    return;
  }
  if (!emailPattern.test(values.email)) {
    sendEmailValidationError(res);
    return;
  }

  try {
    const result = await query(
      `INSERT INTO waitlist_entries (
        bootcamp_slug,
        bootcamp_title,
        name,
        email,
        phone,
        message,
        source_page
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at`,
      [
        values.bootcampSlug,
        values.bootcampTitle,
        values.name,
        values.email,
        values.phone,
        values.message,
        values.sourcePage,
      ],
    );
    const saved = result.rows[0];
    res.status(201).json({
      success: true,
      waitlistId: saved.id,
      createdAt: saved.created_at,
      message: "Waitlist entry saved successfully",
      data: {
        id: saved.id,
        status: "joined",
        email: values.email,
        interest: values.bootcampTitle || "Bootcamp pathways",
        createdAt: saved.created_at,
      },
    });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.post("/api/instructor-applications", async (req, res) => {
  const values = {
    fullName: cleanString(req.body.fullName),
    email: cleanString(req.body.email),
    phone: cleanString(req.body.phone),
    topic: cleanString(req.body.topic),
    experience: nullableString(req.body.experience),
    socialLink: nullableString(req.body.socialLink),
    message: nullableString(req.body.message),
  };

  const missing = missingValues(values, ["fullName", "email", "phone", "topic"]);
  if (missing.length) {
    sendValidationError(res, missing);
    return;
  }
  if (!emailPattern.test(values.email)) {
    sendEmailValidationError(res);
    return;
  }

  try {
    const result = await query(
      `INSERT INTO instructor_applications (
        full_name,
        email,
        phone,
        topic,
        experience,
        social_link,
        message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, created_at`,
      [
        values.fullName,
        values.email,
        values.phone,
        values.topic,
        values.experience,
        values.socialLink,
        values.message,
      ],
    );
    const saved = result.rows[0];
    res.status(201).json({
      success: true,
      applicationId: saved.id,
      createdAt: saved.created_at,
      message: "Instructor application saved successfully",
      data: {
        id: saved.id,
        status: "received",
        createdAt: saved.created_at,
      },
    });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.post("/api/contact", async (req, res) => {
  const values = {
    name: cleanString(req.body.name ?? req.body.fullName),
    email: cleanString(req.body.email),
    phone: nullableString(req.body.phone),
    subject: nullableString(req.body.subject ?? req.body.topic),
    message: cleanString(req.body.message),
  };

  const missing = missingValues(values, ["name", "email", "message"]);
  if (missing.length) {
    sendValidationError(res, missing);
    return;
  }
  if (!emailPattern.test(values.email)) {
    sendEmailValidationError(res);
    return;
  }

  try {
    const result = await query(
      `INSERT INTO contact_messages (
        name,
        email,
        phone,
        subject,
        message
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, created_at`,
      [
        values.name,
        values.email,
        values.phone,
        values.subject,
        values.message,
      ],
    );
    const saved = result.rows[0];
    res.status(201).json({
      success: true,
      contactMessageId: saved.id,
      createdAt: saved.created_at,
      message: "Contact message saved successfully",
      data: {
        id: saved.id,
        status: "received",
        fullName: values.name,
        email: values.email,
        topic: values.subject || "General inquiry",
        message: values.message,
        createdAt: saved.created_at,
      },
    });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found", message: "Route not found" });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Server error", message: "Something went wrong" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`UpSkillr.in API listening on 0.0.0.0:${port}`);
});
