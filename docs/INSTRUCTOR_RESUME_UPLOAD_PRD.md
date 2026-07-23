# PRD: Instructor Application Resume Upload + Notification Email

Status: Draft v1
Owner: Founder (non-technical, content owner) / Engineering (implementer)
Repo: `education-academy-website` (Vite + React frontend, Express + PostgreSQL backend in `server/`)
Related: [`ADMIN_PORTAL_PRD.md`](./ADMIN_PORTAL_PRD.md) (leads inbox, admin JWT auth)

---

## 1. Problem

The "Become an Instructor" form (`src/pages/InfoPage.jsx`, route `/become-instructor`) now lets an applicant attach a resume/portfolio file (PDF or Word doc, up to 5MB) and the frontend will submit it as `multipart/form-data` to `POST /api/instructor-applications` when a file is present (see `src/lib/api.js`'s `submitInstructorApplication`).

The backend does not support this yet:
- `server/src/index.js` only calls `app.use(express.json())` — there is no `multipart/form-data` parser, so a file upload today either gets dropped or 400s.
- The `instructor_applications` table (`server/sql/001_create_lead_tables.sql`) has no column to reference a stored file.
- There is no file storage anywhere in the stack.
- There is no outbound email capability anywhere in the codebase — no SMTP client, no `nodemailer`-style dependency, no `SMTP_*` env vars. Today the founder finds out about a new application only by querying Postgres directly (the admin leads-inbox UI in `ADMIN_PORTAL_PRD.md` §10 is not built yet either).

This PRD specifies what's needed to land the upload end-to-end and to notify the founder (and optionally the applicant) by email when a submission arrives, so an AI coding agent or engineer has a single source of truth to build against.

## 2. Goal

1. Accept an optional resume file on `POST /api/instructor-applications`, validate it server-side, store it durably, and persist a reference on the application row.
2. Give the founder an authenticated way to download a submitted resume (ties into the admin portal's auth from `ADMIN_PORTAL_PRD.md`).
3. Send an email to the founder's inbox the moment a new instructor application arrives (with the resume attached or linked), via a real SMTP service — not console logging.
4. (Stretch) Send the applicant a short confirmation email.
5. Build the SMTP integration as reusable infra, not a one-off — it's the first email capability in the codebase and will also serve registration confirmations and contact-form notifications later.

## 3. Non-goals (v1)

- No virus/malware scanning of uploaded files (flag as a follow-up hardening item; see §11).
- No resumable/chunked upload — single request, 5MB cap, matches the frontend's `MAX_RESUME_BYTES` in `src/pages/InfoPage.jsx`.
- Exactly one file per application, no multi-file upload.
- No "edit my application" flow — submissions are create-only, matching today's behavior for the rest of the form.
- No custom email template builder — a plain transactional HTML email is fine for v1.

## 4. Current state (verified against the repo)

| Area | Current reality |
|---|---|
| Frontend form | `src/pages/InfoPage.jsx` — `<input type="file" name="resume" accept=".pdf,.doc,.docx,...">`, client-side 5MB check, sends `multipart/form-data` via `FormData` when a file is chosen, otherwise falls back to the existing plain-JSON `POST` (unchanged, still works today) |
| Frontend API client | `src/lib/api.js` — `request()` now skips forcing `Content-Type: application/json` when `options.body instanceof FormData`, so the browser sets the correct multipart boundary. Local (`VITE_API_BASE_URL` unset) fallback echoes `resumeFileName` without actually uploading anywhere |
| Backend body parsing | `server/src/index.js` — `express.json()` only. No `multer` or equivalent in `server/package.json` |
| Backend route | `POST /api/instructor-applications` in `server/src/index.js` (~line 292) inserts `full_name, email, phone, topic, experience, social_link, message` into `instructor_applications`. No file field. |
| DB schema | `instructor_applications` (`server/sql/001_create_lead_tables.sql`) has no file columns |
| File storage | None. Render's filesystem is **ephemeral** — anything written to local disk is wiped on every deploy and every dyno restart/scale event, so local disk storage is not viable even for a "quick" v1 |
| Email/SMTP | None anywhere in `server/` or `src/`. No `nodemailer`, no `SMTP_*` in `server/.env.example` |
| Admin auth | Does not exist yet (`ADMIN_PORTAL_PRD.md` §11 specifies JWT auth for `/api/admin/*`, not yet implemented) |

## 5. Proposed architecture

### 5.1 Upload handling
- Add `multer` to `server/package.json`, mounted **only** on the `POST /api/instructor-applications` route (not globally — `express.json()` must keep handling the no-file JSON path unchanged for the rest of the app).
- Use `multer.memoryStorage()` (buffer in memory, not disk) since the file goes straight to object storage — never touches Render's local disk. Cap `limits: { fileSize: 5 * 1024 * 1024 }` server-side (defense in depth — never trust the client's 5MB check alone).
- Validate the uploaded MIME type/extension against an allowlist server-side (`application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`) — reject anything else with `400`, same pattern as the existing `sendValidationError`/`sendEmailValidationError` helpers.

### 5.2 File storage — pick one

Render's ephemeral disk rules out local storage. Two viable options:

**Option A — Object storage (recommended).** Any S3-compatible bucket (AWS S3, Cloudflare R2, Backblaze B2 — R2 has no egress fees, worth a look for a low-traffic lead form). Upload the buffer with a generated key (e.g. `instructor-applications/{applicationId}/{sanitizedFileName}`), store the object key (not a public URL) on the row, and generate a short-lived signed URL on demand when the founder downloads it. Needs a new dependency (`@aws-sdk/client-s3` or the provider's SDK) and 4-5 new env vars (§9).

**Option B — Store bytes in Postgres (`bytea`).** Simplest to ship — no new provider account, no new SDK — at the cost of bloating the DB with binary data. Fine at this submission volume (a handful of applications a month, 5MB cap), but revisit if volume grows or if Postgres storage costs become a factor. If chosen, still stream through the same validation/size-cap logic in §5.1.

Recommendation: **start with Option B** to ship fast with zero new infra accounts, with a documented migration path to Option A (§13) if/when volume or storage cost justifies it. Either way, the API contract in §7 does not change — only what `resume_storage_ref` points to.

### 5.3 Email/SMTP
- Add `nodemailer` to `server/package.json` — the standard Node SMTP client, works with any provider (Gmail SMTP is not reliable for transactional/production mail and commonly gets rate-limited or flagged; use a transactional provider — SendGrid, Postmark, Resend, Mailgun, Amazon SES, or Brevo all offer an SMTP endpoint and a free tier sufficient for lead-notification volume).
- Build one small reusable module, e.g. `server/src/lib/mailer.js`, exporting `sendMail({ to, subject, html, attachments })` wrapping a single `nodemailer.createTransport(...)` configured from `SMTP_*` env vars. Every future email need (registration confirmations, contact-form auto-replies) calls this same module — don't build a second one-off mailer later.
- On successful `POST /api/instructor-applications`, after the DB insert commits, call `sendMail` twice (best-effort, wrapped in try/catch so an SMTP hiccup never fails the user's submission or loses their DB row):
  1. **To the founder** (`SMTP_NOTIFY_TO` env var): subject `New instructor application: {fullName}`, body with the submitted fields, resume attached (Option B: pull the `bytea` back out; Option A: attach or link the signed URL).
  2. **To the applicant** (stretch, §2.4): short "we received your application" confirmation.

## 6. Data model changes

Migration `server/sql/004_add_instructor_application_resume.sql` (next number after `003_seed_categories_and_videos.sql`):

```sql
ALTER TABLE instructor_applications
  ADD COLUMN resume_file_name TEXT,
  ADD COLUMN resume_mime_type TEXT,
  ADD COLUMN resume_file_size INT,
  ADD COLUMN resume_data BYTEA,        -- Option B (drop this column, add resume_storage_key TEXT if Option A)
  ADD COLUMN resume_uploaded_at TIMESTAMPTZ;
```

All new columns are nullable — applications without a resume are unaffected, matching the "resume is optional" behavior already shipped in the frontend.

## 7. API contract

### `POST /api/instructor-applications` (public, existing route — behavior extended, not replaced)
- Accepts **either** `Content-Type: application/json` (unchanged, no-file path — current behavior preserved exactly) **or** `multipart/form-data` with the same text fields (`fullName`, `email`, `phone`, `topic`, `experience?`, `socialLink?`, `message?`) plus an optional `resume` file part.
- Server-side validation (in addition to the existing required-field/email checks):
  - Reject file `> 5MB` → `400 { message: "Resume file is too large. Maximum size is 5MB." }`
  - Reject disallowed MIME/extension → `400 { message: "Resume must be a PDF or Word document." }`
- On success: `201`, same response shape as today (`{ success, applicationId, createdAt }`) — no breaking change to the existing success contract.

### `GET /api/admin/instructor-applications/:id/resume` (new, admin-only)
- Requires `Authorization: Bearer <jwt>` — **depends on the admin JWT middleware specified in `ADMIN_PORTAL_PRD.md` §11**, which does not exist yet. If this ships before that middleware, gate it behind a temporary shared-secret header (`X-Admin-Token` checked against a `ADMIN_DOWNLOAD_TOKEN` env var) and replace with real JWT auth once the admin portal auth lands — do not ship this route with no auth at all, since resumes contain personal data (name, phone, email, employment history).
- Streams the file back with the original `resume_mime_type` and a `Content-Disposition: attachment; filename="..."` header (Option B: read the `bytea` column; Option A: `302` redirect to a freshly generated signed URL).
- `404` if the application has no resume on file.

## 8. Frontend changes

Already shipped as part of this change:
- `src/pages/InfoPage.jsx` — file input, 5MB client-side guard, `RESUME_ACCEPT` MIME/extension allowlist.
- `src/lib/api.js` — `submitInstructorApplication(payload, resumeFile)` branches to `FormData` + `multipart/form-data` only when a file is attached; `request()` skips forcing the JSON content-type header when the body is `FormData` so the browser sets the multipart boundary.

Nothing further needed on the frontend once the backend lands — the existing call site already sends the right shape.

## 9. Environment variables to add

**Render (backend), all new:**
```
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM_EMAIL=no-reply@upskillr.in
SMTP_NOTIFY_TO=founder@upskillr.in
```
(If Option A object storage is chosen instead of Option B, also add `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` — omit for R2/B2-specific endpoint URLs as needed.)

**Hostinger (frontend):** none needed for this feature — the upload rides the existing `VITE_API_BASE_URL`.

Add all backend vars to `server/.env.example` (placeholders, never real credentials) alongside the existing `PORT`/`DATABASE_URL` entries, following the same pattern already used there.

## 10. Dependencies to add

`server/package.json`:
- `multer` — multipart/form-data parsing
- `nodemailer` — SMTP client
- (Option A only) an S3-compatible SDK, e.g. `@aws-sdk/client-s3`

## 11. Security

- MIME/extension allowlist and 5MB cap enforced **server-side**, not just via the HTML `accept` attribute (client-side checks are UX only, never a security boundary).
- Sanitize the original filename before using it anywhere in a storage key or `Content-Disposition` header (strip path separators and control characters) to avoid path traversal or header-injection.
- `GET /api/admin/instructor-applications/:id/resume` must never be publicly reachable — see the auth dependency called out in §7.
- Follow-up hardening (explicitly out of scope for v1, noted for later): virus/malware scanning of uploaded files before they're ever opened by the founder (e.g. ClamAV via a queue, or a scanning API from the chosen object-storage provider).
- SMTP credentials are secrets — same handling as `DATABASE_URL` today: env var only, never committed, never logged.

## 12. Rollout plan

1. **Migration**: `server/sql/004_add_instructor_application_resume.sql` per §6; run via `npm run db:migrate` (existing `server/src/scripts/runMigrations.js` pattern).
2. **Backend — upload**: add `multer`, extend `POST /api/instructor-applications` to accept `multipart/form-data`, add server-side validation, write to the chosen storage (§5.2), save the reference columns.
3. **Backend — mailer**: add `nodemailer`, build `server/src/lib/mailer.js`, wire the founder-notification email into the same route (best-effort, non-blocking on failure).
4. **Backend — download route**: `GET /api/admin/instructor-applications/:id/resume`, gated per §7.
5. **Env vars**: add all of §9 to Render (and choose + sign up for an SMTP provider if one isn't already in use elsewhere for the business).
6. **Verify**: submit a real application with a PDF attached against a staging/local backend; confirm the row lands with resume columns populated, the founder-notification email arrives with the attachment, and the download route returns the file for an authenticated request and `401`/`403` for an unauthenticated one.
7. **Applicant confirmation email** (stretch, §2.4): add as a fast-follow once the founder-notification path is verified working end-to-end.

## 13. Future migration path (Option B → Option A)

If submission volume or Postgres storage size later justifies moving off `bytea`: add `resume_storage_key TEXT`, write a one-off backfill script that reads each `resume_data` row, uploads it to the chosen bucket, populates `resume_storage_key`, then drops `resume_data` in a follow-up migration once the backfill is verified. The `GET .../resume` route's response shape doesn't change for API consumers — only its internal implementation.

## 14. Open questions for the founder

- Which SMTP/transactional-email provider should we use? (SendGrid, Postmark, Resend, Mailgun, Amazon SES, and Brevo all have free tiers well above the volume a lead-notification form generates.) This also becomes the answer for future registration/contact-form emails, so pick one account to reuse rather than one-per-feature.
- What inbox should `SMTP_NOTIFY_TO` point to?
- Is Option B (store in Postgres) acceptable for v1, or is object storage (Option A) worth setting up now given other future upload needs (e.g. course thumbnails, per `ADMIN_PORTAL_PRD.md` §14 "Image upload... (out of scope for v1)")? If more upload features are coming soon, it may be worth doing Option A once rather than migrating later.
