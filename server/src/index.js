import crypto from "node:crypto";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { bootcamps } from "./data/bootcamps.js";
import { masterclasses } from "./data/masterclasses.js";

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

const createId = (prefix) => `${prefix}_${crypto.randomUUID()}`;

const missingFields = (body, fields) =>
  fields.filter((field) => {
    const value = body[field];
    return typeof value !== "string" || !value.trim();
  });

const sendValidationError = (res, fields) =>
  res.status(400).json({
    error: "Validation failed",
    message: `Missing required field${fields.length > 1 ? "s" : ""}: ${fields.join(", ")}`,
    fields,
  });

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "academy-api",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/masterclasses", (_req, res) => {
  res.json({ data: masterclasses });
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

app.post("/api/registrations", (req, res) => {
  const required = ["fullName", "email", "itemSlug", "itemType", "itemTitle"];
  const missing = missingFields(req.body, required);
  if (missing.length) {
    sendValidationError(res, missing);
    return;
  }

  res.status(201).json({
    data: {
      id: createId("reg"),
      status: "confirmed",
      fullName: req.body.fullName.trim(),
      email: req.body.email.trim(),
      whatsapp: req.body.whatsapp?.trim() || null,
      itemSlug: req.body.itemSlug.trim(),
      itemType: req.body.itemType.trim(),
      itemTitle: req.body.itemTitle.trim(),
      createdAt: new Date().toISOString(),
    },
    message: "Registration received",
  });
});

app.post("/api/waitlist", (req, res) => {
  const missing = missingFields(req.body, ["email"]);
  if (missing.length) {
    sendValidationError(res, missing);
    return;
  }

  res.status(201).json({
    data: {
      id: createId("wait"),
      status: "joined",
      email: req.body.email.trim(),
      interest: req.body.interest?.trim() || "Bootcamp pathways",
      createdAt: new Date().toISOString(),
    },
    message: "Waitlist request received",
  });
});

app.post("/api/contact", (req, res) => {
  const missing = missingFields(req.body, ["fullName", "email", "message"]);
  if (missing.length) {
    sendValidationError(res, missing);
    return;
  }

  res.status(201).json({
    data: {
      id: createId("msg"),
      status: "received",
      fullName: req.body.fullName.trim(),
      email: req.body.email.trim(),
      topic: req.body.topic?.trim() || "General inquiry",
      message: req.body.message.trim(),
      createdAt: new Date().toISOString(),
    },
    message: "Contact message received",
  });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Not found", message: "Route not found" });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Server error", message: "Something went wrong" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Academy API listening on 0.0.0.0:${port}`);
});
