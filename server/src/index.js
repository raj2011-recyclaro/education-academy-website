import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import { bootcamps } from "./data/bootcamps.js";
import { categories } from "./data/categories.js";
import { getHomepageContent } from "./data/homepage.js";
import { masterclasses } from "./data/masterclasses.js";
import { testimonials } from "./data/testimonials.js";
import { query } from "./db/pool.js";
import multer from "multer";
import { requireAuth, requireRole, signAppToken, verifyGoogleAccessToken, verifyGoogleIdToken } from "./lib/auth.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const MATERIAL_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const RESUME_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function getPagination(req, defaultPageSize = 20, maxPageSize = 50) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || defaultPageSize, 1), maxPageSize);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function paginationMeta({ page, pageSize }, total) {
  return { page, pageSize, total, totalPages: Math.max(Math.ceil(total / pageSize), 1) };
}

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;
const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

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

function mapInstructorField(row) {
  if (row.instructor_user_id) {
    return {
      id: row.instructor_user_id,
      name: row.instructor_name,
      role: row.instructor_headline,
      bio: row.instructor_bio,
      image: row.instructor_avatar,
      highlights: row.instructor_highlights || [],
      credentials: row.instructor_credentials || [],
    };
  }
  return null;
}

function mapBootcampRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    code: row.code,
    title: row.title,
    categoryId: row.category_id,
    category: row.category_name,
    instructorId: row.instructor_id || row.instructor_key,
    instructor: mapInstructorField(row),
    visibilityStatus: row.visibility_status,
    duration: row.duration,
    level: row.level,
    deliveryMode: row.delivery_mode,
    liveSessions: row.live_sessions,
    startDate: row.start_date,
    certificate: row.certificate,
    price: row.price,
    status: row.status,
    idealFor: row.ideal_for,
    examBody: row.exam_body,
    examFee: row.exam_fee,
    passMark: row.pass_mark,
    image: row.image,
    summary: row.summary,
    whyCourse: row.why_course,
    aboutCourse: row.about_course,
    whoShouldAttend: row.who_should_attend || [],
    outcomes: row.outcomes || [],
    curriculum: row.curriculum || [],
    refundConditions: row.refund_conditions || [],
    faq: row.faq || [],
    disclaimer: row.disclaimer,
  };
}

function mapMasterclassRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    categoryId: row.category_id,
    category: row.category_name,
    instructorId: row.instructor_id || row.instructor_key,
    instructor: mapInstructorField(row),
    visibilityStatus: row.visibility_status,
    date: row.date,
    time: row.time,
    registered: row.registered,
    price: row.price,
    status: row.status,
    image: row.image,
    summary: row.summary,
    overview: row.overview,
    learn: row.learn || [],
    audience: row.audience || [],
    agenda: row.agenda || [],
    disclaimer: row.disclaimer,
  };
}

const BOOTCAMP_SELECT = `
  SELECT b.*, c.name AS category_name,
    u.id AS instructor_user_id, u.full_name AS instructor_name, u.avatar_url AS instructor_avatar,
    tp.headline AS instructor_headline, tp.bio AS instructor_bio,
    tp.highlights AS instructor_highlights, tp.credentials AS instructor_credentials
  FROM bootcamps b
  LEFT JOIN categories c ON c.id = b.category_id
  LEFT JOIN users u ON u.id = b.instructor_id
  LEFT JOIN teacher_profiles tp ON tp.user_id = b.instructor_id
`;

const MASTERCLASS_SELECT = `
  SELECT m.*, c.name AS category_name,
    u.id AS instructor_user_id, u.full_name AS instructor_name, u.avatar_url AS instructor_avatar,
    tp.headline AS instructor_headline, tp.bio AS instructor_bio,
    tp.highlights AS instructor_highlights, tp.credentials AS instructor_credentials
  FROM masterclasses m
  LEFT JOIN categories c ON c.id = m.category_id
  LEFT JOIN users u ON u.id = m.instructor_id
  LEFT JOIN teacher_profiles tp ON tp.user_id = m.instructor_id
`;

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

app.get("/api/masterclasses", async (_req, res) => {
  try {
    const result = await query(
      `${MASTERCLASS_SELECT} WHERE m.visibility_status = 'published' ORDER BY m.sort_order, m.created_at`,
    );
    res.json({ data: result.rows.map(mapMasterclassRow) });
  } catch (error) {
    console.warn("Falling back to static masterclasses:", error.message);
    res.json({ data: masterclasses });
  }
});

app.get("/api/homepage", async (_req, res) => {
  try {
    const [masterclassResult, bootcampResult] = await Promise.all([
      query(`${MASTERCLASS_SELECT} WHERE m.visibility_status = 'published' ORDER BY m.sort_order, m.created_at LIMIT 5`),
      query(`${BOOTCAMP_SELECT} WHERE b.visibility_status = 'published' ORDER BY b.sort_order, b.created_at LIMIT 3`),
    ]);
    const masterclassCards = masterclassResult.rows.map(mapMasterclassRow);
    const bootcampCards = bootcampResult.rows.map(mapBootcampRow);
    res.json({
      data: {
        hero: {
          eyebrow: "Finance and trading education, thoughtfully designed",
          headline: "Learn markets from someone who has traded them.",
          subheadline:
            "Join free live sessions and certification-ready courses in stock markets, technical analysis, options, algo trading, NISM, CMT, and CFA — built for ambitious Indian investors and traders.",
          primaryCTA: { label: "Explore masterclasses", href: "/masterclasses" },
          secondaryCTA: { label: "View courses", href: "/bootcamps" },
          proofPoints: ["3,000+ students taught", "SEBI Registered Research Analyst", "13 courses across trading & certification"],
        },
        featuredMasterclass: masterclassCards[0] || null,
        trendingMasterclasses: masterclassCards.slice(1, 5),
        featuredBootcamps: bootcampCards,
        categorySection: { eyebrow: "Find your next leap", title: "What do you want to learn?" },
        testimonialSection: { eyebrow: "Learner stories", title: "Small rooms. Serious progress." },
        finalCTA: {
          eyebrow: "Your next chapter can start small",
          title: "One live session could change how you work.",
          description: "Join thousands of thoughtful learners building future-relevant skills.",
          ctaLabel: "Find your masterclass",
          href: "/masterclasses",
        },
      },
    });
  } catch (error) {
    console.warn("Falling back to static homepage content:", error.message);
    res.json({ data: getHomepageContent() });
  }
});

app.get("/api/categories", async (req, res) => {
  const featuredOnly = req.query.featured === "true";
  try {
    const result = await query(
      `SELECT id, slug, name, description, icon, sort_order, featured
       FROM categories
       ${featuredOnly ? "WHERE featured = true" : ""}
       ORDER BY sort_order, name`,
    );
    res.json({
      data: result.rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        icon: row.icon,
        sortOrder: row.sort_order,
        featured: row.featured,
      })),
    });
  } catch (error) {
    console.warn("Falling back to static categories:", error.message);
    const data = categories
      .filter((category) => !featuredOnly || category.featured)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    res.json({ data });
  }
});

app.get("/api/videos", async (req, res) => {
  const { type, category, program } = req.query;
  const conditions = ["v.status = 'published'"];
  const params = [];

  if (type) {
    params.push(type);
    conditions.push(`v.video_type = $${params.length}`);
  }
  if (category) {
    params.push(category);
    conditions.push(`c.slug = $${params.length}`);
  }
  if (program) {
    params.push(program);
    conditions.push(`v.related_program_slug = $${params.length}`);
  }

  try {
    const result = await query(
      `SELECT v.id, v.title, v.youtube_url, v.youtube_video_id, v.video_type,
              v.related_program_slug, v.description, v.thumbnail_url, v.status,
              v.sort_order, v.created_at, v.updated_at,
              v.category_id, c.slug AS category_slug, c.name AS category_name
       FROM videos v
       LEFT JOIN categories c ON c.id = v.category_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY v.sort_order, v.created_at DESC`,
      params,
    );
    res.json({ data: result.rows });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.get("/api/testimonials", (req, res) => {
  const featuredOnly = req.query.featured === "true";
  const data = testimonials.filter((story) => !featuredOnly || story.featured);
  res.json({ data });
});

app.get("/api/masterclasses/:slug", async (req, res) => {
  try {
    const result = await query(
      `${MASTERCLASS_SELECT} WHERE m.slug = $1 AND m.visibility_status = 'published'`,
      [req.params.slug],
    );
    if (result.rows.length) {
      res.json({ data: mapMasterclassRow(result.rows[0]) });
      return;
    }
  } catch (error) {
    console.warn("Falling back to static masterclass lookup:", error.message);
  }
  const course = masterclasses.find((item) => item.slug === req.params.slug);
  if (!course) {
    res.status(404).json({ error: "Not found", message: "Masterclass not found" });
    return;
  }
  res.json({ data: course });
});

app.get("/api/bootcamps", async (_req, res) => {
  try {
    const result = await query(
      `${BOOTCAMP_SELECT} WHERE b.visibility_status = 'published' ORDER BY b.sort_order, b.created_at`,
    );
    res.json({ data: result.rows.map(mapBootcampRow) });
  } catch (error) {
    console.warn("Falling back to static bootcamps:", error.message);
    res.json({ data: bootcamps });
  }
});

app.get("/api/bootcamps/:slug", async (req, res) => {
  try {
    const result = await query(
      `${BOOTCAMP_SELECT} WHERE b.slug = $1 AND b.visibility_status = 'published'`,
      [req.params.slug],
    );
    if (result.rows.length) {
      res.json({ data: mapBootcampRow(result.rows[0]) });
      return;
    }
  } catch (error) {
    console.warn("Falling back to static bootcamp lookup:", error.message);
  }
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

// upload.single() only engages for multipart/form-data requests (when a resume is
// attached) and passes through untouched otherwise, so the plain express.json() path
// (no resume) keeps working on this same route exactly as before.
app.post("/api/instructor-applications", upload.single("resume"), async (req, res) => {
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

  let resume = { fileName: null, mimeType: null, fileSize: null, fileData: null };
  if (req.file) {
    if (!RESUME_MIME_TYPES.has(req.file.mimetype)) {
      res.status(400).json({ error: "Validation failed", message: "Resume must be a PDF or Word document" });
      return;
    }
    resume = {
      // Strip path separators/control characters — never trust a client filename verbatim.
      fileName: req.file.originalname.replace(/[/\\?%*:|"<>]/g, "_"),
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      fileData: req.file.buffer,
    };
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
        message,
        resume_file_name,
        resume_mime_type,
        resume_file_size,
        resume_data
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, created_at`,
      [
        values.fullName,
        values.email,
        values.phone,
        values.topic,
        values.experience,
        values.socialLink,
        values.message,
        resume.fileName,
        resume.mimeType,
        resume.fileSize,
        resume.fileData,
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

app.post("/api/auth/google", authRateLimiter, async (req, res) => {
  const idToken = cleanString(req.body.idToken);
  const accessToken = cleanString(req.body.accessToken);
  if (!idToken && !accessToken) {
    res.status(400).json({
      error: "Validation failed",
      message: "Missing idToken or accessToken",
      fields: ["idToken", "accessToken"],
    });
    return;
  }

  let googlePayload;
  try {
    googlePayload = idToken ? await verifyGoogleIdToken(idToken) : await verifyGoogleAccessToken(accessToken);
  } catch (error) {
    console.error("Google token verification failed:", error.message);
    res.status(401).json({ error: "Unauthorized", message: "Google sign-in could not be verified" });
    return;
  }

  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  try {
    const existing = await query("SELECT * FROM users WHERE google_sub = $1", [googlePayload.sub]);
    let user;
    if (existing.rows.length) {
      const updated = await query(
        `UPDATE users
         SET email = $1, full_name = $2, avatar_url = $3, last_login_at = NOW(), updated_at = NOW()
         WHERE google_sub = $4
         RETURNING *`,
        [googlePayload.email, googlePayload.fullName, googlePayload.avatarUrl, googlePayload.sub],
      );
      user = updated.rows[0];
    } else {
      const role = adminEmails.includes(googlePayload.email.toLowerCase()) ? "admin" : "student";
      const inserted = await query(
        `INSERT INTO users (google_sub, email, full_name, avatar_url, role, last_login_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING *`,
        [googlePayload.sub, googlePayload.email, googlePayload.fullName, googlePayload.avatarUrl, role],
      );
      user = inserted.rows[0];
    }

    if (user.status === "suspended") {
      res.status(403).json({ error: "Forbidden", message: "This account has been suspended" });
      return;
    }

    const token = signAppToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        role: user.role,
      },
    });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const result = await query(
      "SELECT id, email, full_name, avatar_url, role FROM users WHERE id = $1",
      [req.user.id],
    );
    const user = result.rows[0];
    if (!user) {
      res.status(404).json({ error: "Not found", message: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      role: user.role,
    });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.get("/api/me/enrollments", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, course_type, course_slug, status, enrolled_at
       FROM enrollments
       WHERE user_id = $1 AND status = 'active'
       ORDER BY enrolled_at DESC`,
      [req.user.id],
    );
    res.json({
      data: result.rows.map((row) => ({
        id: row.id,
        courseType: row.course_type,
        courseSlug: row.course_slug,
        status: row.status,
        enrolledAt: row.enrolled_at,
      })),
    });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.post("/api/me/enrollments", requireAuth, async (req, res) => {
  const courseType = cleanString(req.body.courseType);
  const courseSlug = cleanString(req.body.courseSlug);

  if (!["bootcamp", "masterclass"].includes(courseType) || !courseSlug) {
    sendValidationError(res, ["courseType", "courseSlug"]);
    return;
  }

  // Not validated against server/src/data/{bootcamps,masterclasses}.js: that data has
  // diverged from the real catalog the frontend actually renders (src/data/*.js) and
  // is unused dead content today (see ADMIN_PORTAL_PRD.md §13.1). Once courses move
  // into Postgres per that PRD, validate courseSlug against the real table here.
  try {
    const result = await query(
      `INSERT INTO enrollments (user_id, course_type, course_slug)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, course_type, course_slug)
       DO UPDATE SET status = 'active'
       RETURNING id, course_type, course_slug, status, enrolled_at`,
      [req.user.id, courseType, courseSlug],
    );
    const saved = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        id: saved.id,
        courseType: saved.course_type,
        courseSlug: saved.course_slug,
        status: saved.status,
        enrolledAt: saved.enrolled_at,
      },
    });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.delete("/api/me/enrollments/:id", requireAuth, async (req, res) => {
  try {
    const result = await query(
      `UPDATE enrollments
       SET status = 'cancelled'
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.user.id],
    );
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "Enrollment not found" });
      return;
    }
    res.json({ success: true, data: { id: result.rows[0].id, status: "cancelled" } });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

function mapUserRow(row) {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    status: row.status,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  };
}

app.get("/api/admin/users", requireAuth, requireRole("admin"), async (req, res) => {
  const { role, status, search } = req.query;
  const pagination = getPagination(req);
  const conditions = [];
  const params = [];
  if (role) {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(email ILIKE $${params.length} OR full_name ILIKE $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const countResult = await query(`SELECT COUNT(*) FROM users ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);
    const result = await query(
      `SELECT id, email, full_name, avatar_url, role, status, last_login_at, created_at
       FROM users ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pagination.pageSize, pagination.offset],
    );
    res.json({ data: result.rows.map(mapUserRow), pagination: paginationMeta(pagination, total) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.patch("/api/admin/users/:id/role", requireAuth, requireRole("admin"), async (req, res) => {
  const role = cleanString(req.body.role);
  if (!["student", "teacher", "admin"].includes(role)) {
    sendValidationError(res, ["role"]);
    return;
  }

  try {
    const target = await query("SELECT role FROM users WHERE id = $1", [req.params.id]);
    if (!target.rows.length) {
      res.status(404).json({ error: "Not found", message: "User not found" });
      return;
    }
    if (target.rows[0].role === "admin" && role !== "admin") {
      const adminCount = await query("SELECT COUNT(*) FROM users WHERE role = 'admin'");
      if (parseInt(adminCount.rows[0].count, 10) <= 1) {
        res.status(400).json({ error: "Validation failed", message: "Cannot demote the last remaining admin" });
        return;
      }
    }
    const result = await query(
      `UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, email, full_name, avatar_url, role, status, last_login_at, created_at`,
      [role, req.params.id],
    );
    res.json({ success: true, data: mapUserRow(result.rows[0]) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.patch("/api/admin/users/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
  const status = cleanString(req.body.status);
  if (!["active", "suspended"].includes(status)) {
    sendValidationError(res, ["status"]);
    return;
  }

  try {
    const result = await query(
      `UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, email, full_name, avatar_url, role, status, last_login_at, created_at`,
      [status, req.params.id],
    );
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "User not found" });
      return;
    }
    res.json({ success: true, data: mapUserRow(result.rows[0]) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

function mapApplicationRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    topic: row.topic,
    experience: row.experience,
    socialLink: row.social_link,
    message: row.message,
    status: row.status,
    promotedUserId: row.promoted_user_id,
    resumeFileName: row.resume_file_name,
    createdAt: row.created_at,
  };
}

app.get("/api/admin/instructor-applications", requireAuth, requireRole("admin"), async (req, res) => {
  const { status } = req.query;
  const pagination = getPagination(req);
  const conditions = [];
  const params = [];
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const countResult = await query(`SELECT COUNT(*) FROM instructor_applications ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);
    const result = await query(
      `SELECT id, full_name, email, phone, topic, experience, social_link, message,
              status, promoted_user_id, resume_file_name, created_at
       FROM instructor_applications ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, pagination.pageSize, pagination.offset],
    );
    res.json({ data: result.rows.map(mapApplicationRow), pagination: paginationMeta(pagination, total) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.get("/api/admin/instructor-applications/:id/resume", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const result = await query(
      "SELECT resume_file_name, resume_mime_type, resume_data FROM instructor_applications WHERE id = $1",
      [req.params.id],
    );
    const application = result.rows[0];
    if (!application || !application.resume_data) {
      res.status(404).json({ error: "Not found", message: "No resume on file for this application" });
      return;
    }
    res.set("Content-Type", application.resume_mime_type);
    res.set("Content-Disposition", `attachment; filename="${application.resume_file_name}"`);
    res.send(application.resume_data);
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.patch("/api/admin/instructor-applications/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const status = cleanString(req.body.status);
  if (!["new", "reviewed", "archived"].includes(status)) {
    sendValidationError(res, ["status"]);
    return;
  }

  try {
    const result = await query(
      `UPDATE instructor_applications SET status = $1 WHERE id = $2
       RETURNING id, full_name, email, phone, topic, experience, social_link, message,
                 status, promoted_user_id, resume_file_name, created_at`,
      [status, req.params.id],
    );
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "Application not found" });
      return;
    }
    res.json({ success: true, data: mapApplicationRow(result.rows[0]) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.post("/api/admin/instructor-applications/:id/promote", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const applicationResult = await query(
      "SELECT id, email, promoted_user_id FROM instructor_applications WHERE id = $1",
      [req.params.id],
    );
    if (!applicationResult.rows.length) {
      res.status(404).json({ error: "Not found", message: "Application not found" });
      return;
    }
    const application = applicationResult.rows[0];
    if (application.promoted_user_id) {
      res.status(409).json({ error: "Already promoted", message: "This applicant has already been promoted" });
      return;
    }

    const userResult = await query("SELECT id, role FROM users WHERE email = $1", [application.email]);
    if (!userResult.rows.length) {
      res.status(409).json({
        error: "No matching account",
        message: "Applicant hasn't signed in with Google yet — they'll need to log in once before you can promote them",
      });
      return;
    }

    const user = userResult.rows[0];
    await query("UPDATE users SET role = 'teacher', updated_at = NOW() WHERE id = $1", [user.id]);
    await query(
      `INSERT INTO teacher_profiles (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id],
    );
    const updatedApplication = await query(
      `UPDATE instructor_applications SET promoted_user_id = $1 WHERE id = $2
       RETURNING id, full_name, email, phone, topic, experience, social_link, message,
                 status, promoted_user_id, resume_file_name, created_at`,
      [user.id, req.params.id],
    );
    res.json({ success: true, data: mapApplicationRow(updatedApplication.rows[0]) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

function mapCategoryRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    sortOrder: row.sort_order,
    featured: row.featured,
  };
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

app.get("/api/admin/categories", requireAuth, requireRole("admin"), async (_req, res) => {
  try {
    const result = await query("SELECT * FROM categories ORDER BY sort_order, name");
    res.json({ data: result.rows.map(mapCategoryRow) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.post("/api/admin/categories", requireAuth, requireRole("admin"), async (req, res) => {
  const name = cleanString(req.body.name);
  if (!name) {
    sendValidationError(res, ["name"]);
    return;
  }
  const slug = nullableString(req.body.slug) || slugify(name);
  try {
    const result = await query(
      `INSERT INTO categories (slug, name, description, icon, sort_order, featured)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        slug,
        name,
        nullableString(req.body.description),
        nullableString(req.body.icon),
        parseInt(req.body.sortOrder, 10) || 0,
        toBoolean(req.body.featured),
      ],
    );
    res.status(201).json({ success: true, data: mapCategoryRow(result.rows[0]) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.put("/api/admin/categories/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const name = cleanString(req.body.name);
  if (!name) {
    sendValidationError(res, ["name"]);
    return;
  }
  try {
    const result = await query(
      `UPDATE categories SET name = $1, slug = $2, description = $3, icon = $4,
        sort_order = $5, featured = $6, updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [
        name,
        nullableString(req.body.slug) || slugify(name),
        nullableString(req.body.description),
        nullableString(req.body.icon),
        parseInt(req.body.sortOrder, 10) || 0,
        toBoolean(req.body.featured),
        req.params.id,
      ],
    );
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "Category not found" });
      return;
    }
    res.json({ success: true, data: mapCategoryRow(result.rows[0]) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.delete("/api/admin/categories/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const usage = await query(
      `SELECT
        (SELECT COUNT(*) FROM videos WHERE category_id = $1) AS videos,
        (SELECT COUNT(*) FROM bootcamps WHERE category_id = $1) AS bootcamps,
        (SELECT COUNT(*) FROM masterclasses WHERE category_id = $1) AS masterclasses`,
      [req.params.id],
    );
    const counts = usage.rows[0];
    const total = Number(counts.videos) + Number(counts.bootcamps) + Number(counts.masterclasses);
    if (total > 0) {
      res.status(409).json({
        error: "In use",
        message: "This category is still attached to content and cannot be deleted",
        counts,
      });
      return;
    }
    const result = await query("DELETE FROM categories WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "Category not found" });
      return;
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

function parseYoutubeId(url) {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{6,})/,
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
  ];
  for (const pattern of patterns) {
    const match = String(url || "").match(pattern);
    if (match) return match[1];
  }
  return null;
}

function mapAdminVideoRow(row) {
  return {
    id: row.id,
    title: row.title,
    youtubeUrl: row.youtube_url,
    youtubeId: row.youtube_video_id,
    videoType: row.video_type,
    categoryId: row.category_id,
    relatedProgramSlug: row.related_program_slug,
    description: row.description,
    thumbnailUrl: row.thumbnail_url,
    status: row.status,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

app.get("/api/admin/videos", requireAuth, requireRole("admin"), async (req, res) => {
  const { type, status, categoryId } = req.query;
  const conditions = [];
  const params = [];
  if (type) {
    params.push(type);
    conditions.push(`video_type = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (categoryId) {
    params.push(categoryId);
    conditions.push(`category_id = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  try {
    const result = await query(
      `SELECT * FROM videos ${where} ORDER BY sort_order, created_at DESC`,
      params,
    );
    res.json({ data: result.rows.map(mapAdminVideoRow) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.post("/api/admin/videos", requireAuth, requireRole("admin"), async (req, res) => {
  const values = {
    title: cleanString(req.body.title),
    youtubeUrl: cleanString(req.body.youtubeUrl),
    videoType: cleanString(req.body.videoType),
    categoryId: nullableString(req.body.categoryId),
    relatedProgramSlug: nullableString(req.body.relatedProgramSlug),
    description: nullableString(req.body.description),
    thumbnailUrl: nullableString(req.body.thumbnailUrl),
    status: ["draft", "published"].includes(req.body.status) ? req.body.status : "draft",
    sortOrder: parseInt(req.body.sortOrder, 10) || 0,
  };
  const missing = missingValues(values, ["title", "youtubeUrl", "videoType"]);
  if (missing.length) {
    sendValidationError(res, missing);
    return;
  }
  if (!["orientation", "course"].includes(values.videoType)) {
    res.status(400).json({ error: "Validation failed", message: "videoType must be 'orientation' or 'course'" });
    return;
  }
  const youtubeId = parseYoutubeId(values.youtubeUrl);
  if (!youtubeId) {
    res.status(400).json({ error: "Validation failed", message: "That doesn't look like a YouTube link" });
    return;
  }

  try {
    const result = await query(
      `INSERT INTO videos (title, youtube_url, youtube_video_id, video_type, category_id,
        related_program_slug, description, thumbnail_url, status, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        values.title, values.youtubeUrl, youtubeId, values.videoType, values.categoryId,
        values.relatedProgramSlug, values.description, values.thumbnailUrl, values.status, values.sortOrder,
      ],
    );
    res.status(201).json({ success: true, data: mapAdminVideoRow(result.rows[0]) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.put("/api/admin/videos/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const values = {
    title: cleanString(req.body.title),
    youtubeUrl: cleanString(req.body.youtubeUrl),
    videoType: cleanString(req.body.videoType),
    categoryId: nullableString(req.body.categoryId),
    relatedProgramSlug: nullableString(req.body.relatedProgramSlug),
    description: nullableString(req.body.description),
    thumbnailUrl: nullableString(req.body.thumbnailUrl),
    status: ["draft", "published"].includes(req.body.status) ? req.body.status : "draft",
    sortOrder: parseInt(req.body.sortOrder, 10) || 0,
  };
  const missing = missingValues(values, ["title", "youtubeUrl", "videoType"]);
  if (missing.length) {
    sendValidationError(res, missing);
    return;
  }
  const youtubeId = parseYoutubeId(values.youtubeUrl);
  if (!youtubeId) {
    res.status(400).json({ error: "Validation failed", message: "That doesn't look like a YouTube link" });
    return;
  }

  try {
    const result = await query(
      `UPDATE videos SET title = $1, youtube_url = $2, youtube_video_id = $3, video_type = $4,
        category_id = $5, related_program_slug = $6, description = $7, thumbnail_url = $8,
        status = $9, sort_order = $10, updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [
        values.title, values.youtubeUrl, youtubeId, values.videoType, values.categoryId,
        values.relatedProgramSlug, values.description, values.thumbnailUrl, values.status,
        values.sortOrder, req.params.id,
      ],
    );
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "Video not found" });
      return;
    }
    res.json({ success: true, data: mapAdminVideoRow(result.rows[0]) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.patch("/api/admin/videos/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
  const status = cleanString(req.body.status);
  if (!["draft", "published"].includes(status)) {
    sendValidationError(res, ["status"]);
    return;
  }
  try {
    const result = await query(
      "UPDATE videos SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
      [status, req.params.id],
    );
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "Video not found" });
      return;
    }
    res.json({ success: true, data: mapAdminVideoRow(result.rows[0]) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.delete("/api/admin/videos/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const result = await query("DELETE FROM videos WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "Video not found" });
      return;
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

function bootcampValuesFromBody(body) {
  return {
    slug: cleanString(body.slug),
    title: cleanString(body.title),
    code: nullableString(body.code),
    categoryId: nullableString(body.categoryId),
    instructorId: nullableString(body.instructorId),
    duration: nullableString(body.duration),
    level: nullableString(body.level),
    deliveryMode: nullableString(body.deliveryMode),
    liveSessions: nullableString(body.liveSessions),
    startDate: nullableString(body.startDate),
    certificate: body.certificate !== false,
    price: nullableString(body.price),
    status: nullableString(body.status),
    idealFor: nullableString(body.idealFor),
    examBody: nullableString(body.examBody),
    examFee: nullableString(body.examFee),
    passMark: nullableString(body.passMark),
    image: nullableString(body.image),
    summary: nullableString(body.summary),
    whyCourse: nullableString(body.whyCourse),
    aboutCourse: nullableString(body.aboutCourse),
    whoShouldAttend: Array.isArray(body.whoShouldAttend) ? body.whoShouldAttend : [],
    outcomes: Array.isArray(body.outcomes) ? body.outcomes : [],
    curriculum: Array.isArray(body.curriculum) ? body.curriculum : [],
    refundConditions: Array.isArray(body.refundConditions) ? body.refundConditions : [],
    faq: Array.isArray(body.faq) ? body.faq : [],
    disclaimer: nullableString(body.disclaimer),
    visibilityStatus: ["draft", "published"].includes(body.visibilityStatus) ? body.visibilityStatus : "draft",
  };
}

const BOOTCAMP_WRITE_COLUMNS = [
  "slug", "title", "code", "category_id", "instructor_id", "duration", "level",
  "delivery_mode", "live_sessions", "start_date", "certificate", "price", "status",
  "ideal_for", "exam_body", "exam_fee", "pass_mark", "image", "summary", "why_course",
  "about_course", "who_should_attend", "outcomes", "curriculum", "refund_conditions",
  "faq", "disclaimer", "visibility_status",
];

function bootcampWriteValues(values) {
  return [
    values.slug, values.title, values.code, values.categoryId, values.instructorId,
    values.duration, values.level, values.deliveryMode, values.liveSessions, values.startDate,
    values.certificate, values.price, values.status, values.idealFor, values.examBody,
    values.examFee, values.passMark, values.image, values.summary, values.whyCourse,
    values.aboutCourse, JSON.stringify(values.whoShouldAttend), JSON.stringify(values.outcomes),
    JSON.stringify(values.curriculum), JSON.stringify(values.refundConditions),
    JSON.stringify(values.faq), values.disclaimer, values.visibilityStatus,
  ];
}

app.get("/api/admin/bootcamps", requireAuth, requireRole("admin"), async (req, res) => {
  const { status } = req.query;
  const where = status ? "WHERE b.visibility_status = $1" : "";
  try {
    const result = await query(
      `${BOOTCAMP_SELECT} ${where} ORDER BY b.sort_order, b.created_at DESC`,
      status ? [status] : [],
    );
    res.json({ data: result.rows.map(mapBootcampRow) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.post("/api/admin/bootcamps", requireAuth, requireRole("admin"), async (req, res) => {
  const values = bootcampValuesFromBody(req.body);
  const missing = missingValues(values, ["slug", "title"]);
  if (missing.length) {
    sendValidationError(res, missing);
    return;
  }
  try {
    const result = await query(
      `INSERT INTO bootcamps (${BOOTCAMP_WRITE_COLUMNS.join(", ")})
       VALUES (${BOOTCAMP_WRITE_COLUMNS.map((_, i) => `$${i + 1}`).join(", ")})
       RETURNING id`,
      bootcampWriteValues(values),
    );
    res.status(201).json({ success: true, data: { id: result.rows[0].id } });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.get("/api/admin/bootcamps/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const result = await query(`${BOOTCAMP_SELECT} WHERE b.id = $1`, [req.params.id]);
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "Bootcamp not found" });
      return;
    }
    res.json({ data: mapBootcampRow(result.rows[0]) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.put("/api/admin/bootcamps/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const values = bootcampValuesFromBody(req.body);
  const missing = missingValues(values, ["slug", "title"]);
  if (missing.length) {
    sendValidationError(res, missing);
    return;
  }
  try {
    const setClause = BOOTCAMP_WRITE_COLUMNS.map((col, i) => `${col} = $${i + 1}`).join(", ");
    const result = await query(
      `UPDATE bootcamps SET ${setClause}, updated_at = NOW() WHERE id = $${BOOTCAMP_WRITE_COLUMNS.length + 1} RETURNING id`,
      [...bootcampWriteValues(values), req.params.id],
    );
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "Bootcamp not found" });
      return;
    }
    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.patch("/api/admin/bootcamps/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
  const visibilityStatus = cleanString(req.body.visibilityStatus);
  if (!["draft", "published"].includes(visibilityStatus)) {
    sendValidationError(res, ["visibilityStatus"]);
    return;
  }
  try {
    const result = await query(
      "UPDATE bootcamps SET visibility_status = $1, updated_at = NOW() WHERE id = $2 RETURNING id",
      [visibilityStatus, req.params.id],
    );
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "Bootcamp not found" });
      return;
    }
    res.json({ success: true, data: { id: result.rows[0].id, visibilityStatus } });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.delete("/api/admin/bootcamps/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const result = await query("DELETE FROM bootcamps WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "Bootcamp not found" });
      return;
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

function masterclassValuesFromBody(body) {
  return {
    slug: cleanString(body.slug),
    title: cleanString(body.title),
    categoryId: nullableString(body.categoryId),
    instructorId: nullableString(body.instructorId),
    date: nullableString(body.date),
    time: nullableString(body.time),
    registered: parseInt(body.registered, 10) || 0,
    price: nullableString(body.price),
    status: nullableString(body.status),
    image: nullableString(body.image),
    summary: nullableString(body.summary),
    overview: nullableString(body.overview),
    learn: Array.isArray(body.learn) ? body.learn : [],
    audience: Array.isArray(body.audience) ? body.audience : [],
    agenda: Array.isArray(body.agenda) ? body.agenda : [],
    disclaimer: nullableString(body.disclaimer),
    visibilityStatus: ["draft", "published"].includes(body.visibilityStatus) ? body.visibilityStatus : "draft",
  };
}

const MASTERCLASS_WRITE_COLUMNS = [
  "slug", "title", "category_id", "instructor_id", "date", "time", "registered", "price",
  "status", "image", "summary", "overview", "learn", "audience", "agenda", "disclaimer",
  "visibility_status",
];

function masterclassWriteValues(values) {
  return [
    values.slug, values.title, values.categoryId, values.instructorId, values.date, values.time,
    values.registered, values.price, values.status, values.image, values.summary, values.overview,
    JSON.stringify(values.learn), JSON.stringify(values.audience), JSON.stringify(values.agenda),
    values.disclaimer, values.visibilityStatus,
  ];
}

app.get("/api/admin/masterclasses", requireAuth, requireRole("admin"), async (req, res) => {
  const { status } = req.query;
  const where = status ? "WHERE m.visibility_status = $1" : "";
  try {
    const result = await query(
      `${MASTERCLASS_SELECT} ${where} ORDER BY m.sort_order, m.created_at DESC`,
      status ? [status] : [],
    );
    res.json({ data: result.rows.map(mapMasterclassRow) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.post("/api/admin/masterclasses", requireAuth, requireRole("admin"), async (req, res) => {
  const values = masterclassValuesFromBody(req.body);
  const missing = missingValues(values, ["slug", "title"]);
  if (missing.length) {
    sendValidationError(res, missing);
    return;
  }
  try {
    const result = await query(
      `INSERT INTO masterclasses (${MASTERCLASS_WRITE_COLUMNS.join(", ")})
       VALUES (${MASTERCLASS_WRITE_COLUMNS.map((_, i) => `$${i + 1}`).join(", ")})
       RETURNING id`,
      masterclassWriteValues(values),
    );
    res.status(201).json({ success: true, data: { id: result.rows[0].id } });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.get("/api/admin/masterclasses/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const result = await query(`${MASTERCLASS_SELECT} WHERE m.id = $1`, [req.params.id]);
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "Masterclass not found" });
      return;
    }
    res.json({ data: mapMasterclassRow(result.rows[0]) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.put("/api/admin/masterclasses/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const values = masterclassValuesFromBody(req.body);
  const missing = missingValues(values, ["slug", "title"]);
  if (missing.length) {
    sendValidationError(res, missing);
    return;
  }
  try {
    const setClause = MASTERCLASS_WRITE_COLUMNS.map((col, i) => `${col} = $${i + 1}`).join(", ");
    const result = await query(
      `UPDATE masterclasses SET ${setClause}, updated_at = NOW() WHERE id = $${MASTERCLASS_WRITE_COLUMNS.length + 1} RETURNING id`,
      [...masterclassWriteValues(values), req.params.id],
    );
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "Masterclass not found" });
      return;
    }
    res.json({ success: true, data: { id: result.rows[0].id } });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.patch("/api/admin/masterclasses/:id/status", requireAuth, requireRole("admin"), async (req, res) => {
  const visibilityStatus = cleanString(req.body.visibilityStatus);
  if (!["draft", "published"].includes(visibilityStatus)) {
    sendValidationError(res, ["visibilityStatus"]);
    return;
  }
  try {
    const result = await query(
      "UPDATE masterclasses SET visibility_status = $1, updated_at = NOW() WHERE id = $2 RETURNING id",
      [visibilityStatus, req.params.id],
    );
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "Masterclass not found" });
      return;
    }
    res.json({ success: true, data: { id: result.rows[0].id, visibilityStatus } });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.delete("/api/admin/masterclasses/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const result = await query("DELETE FROM masterclasses WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "Masterclass not found" });
      return;
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

function mapMaterialRow(row) {
  return {
    id: row.id,
    courseType: row.course_type,
    courseSlug: row.course_slug,
    title: row.title,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

app.get("/api/admin/courses/:type/:slug/materials", requireAuth, requireRole("admin"), async (req, res) => {
  const { type, slug } = req.params;
  if (!["bootcamp", "masterclass"].includes(type)) {
    res.status(400).json({ error: "Validation failed", message: "type must be 'bootcamp' or 'masterclass'" });
    return;
  }
  try {
    const result = await query(
      `SELECT id, course_type, course_slug, title, file_name, mime_type, file_size, sort_order, created_at
       FROM course_materials WHERE course_type = $1 AND course_slug = $2 ORDER BY sort_order, created_at`,
      [type, slug],
    );
    res.json({ data: result.rows.map(mapMaterialRow) });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.post(
  "/api/admin/courses/:type/:slug/materials",
  requireAuth,
  requireRole("admin"),
  upload.single("file"),
  async (req, res) => {
    const { type, slug } = req.params;
    if (!["bootcamp", "masterclass"].includes(type)) {
      res.status(400).json({ error: "Validation failed", message: "type must be 'bootcamp' or 'masterclass'" });
      return;
    }
    if (!req.file) {
      sendValidationError(res, ["file"]);
      return;
    }
    if (!MATERIAL_MIME_TYPES.has(req.file.mimetype)) {
      res.status(400).json({ error: "Validation failed", message: "File must be a PDF, Word, or PowerPoint document" });
      return;
    }
    const title = cleanString(req.body.title) || req.file.originalname;
    // Strip path separators and control characters — never trust a client-supplied filename verbatim.
    const safeFileName = req.file.originalname.replace(/[/\\?%*:|"<>]/g, "_");

    try {
      const result = await query(
        `INSERT INTO course_materials (course_type, course_slug, title, file_name, mime_type, file_size, file_data, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, course_type, course_slug, title, file_name, mime_type, file_size, sort_order, created_at`,
        [type, slug, title, safeFileName, req.file.mimetype, req.file.size, req.file.buffer, req.user.id],
      );
      res.status(201).json({ success: true, data: mapMaterialRow(result.rows[0]) });
    } catch (error) {
      sendDatabaseError(res, error);
    }
  },
);

app.get("/api/admin/materials/:id/download", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const result = await query(
      "SELECT file_name, mime_type, file_data FROM course_materials WHERE id = $1",
      [req.params.id],
    );
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "Material not found" });
      return;
    }
    const material = result.rows[0];
    res.set("Content-Type", material.mime_type);
    res.set("Content-Disposition", `attachment; filename="${material.file_name}"`);
    res.send(material.file_data);
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.delete("/api/admin/materials/:id", requireAuth, requireRole("admin"), async (req, res) => {
  try {
    const result = await query("DELETE FROM course_materials WHERE id = $1 RETURNING id", [req.params.id]);
    if (!result.rows.length) {
      res.status(404).json({ error: "Not found", message: "Material not found" });
      return;
    }
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    sendDatabaseError(res, error);
  }
});

app.get("/api/teacher/me/courses", requireAuth, requireRole("teacher"), async (req, res) => {
  try {
    const bootcampsResult = await query(
      `${BOOTCAMP_SELECT} WHERE b.instructor_id = $1 ORDER BY b.created_at DESC`,
      [req.user.id],
    );
    const masterclassesResult = await query(
      `${MASTERCLASS_SELECT} WHERE m.instructor_id = $1 ORDER BY m.created_at DESC`,
      [req.user.id],
    );
    res.json({
      data: {
        bootcamps: bootcampsResult.rows.map(mapBootcampRow),
        masterclasses: masterclassesResult.rows.map(mapMasterclassRow),
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
