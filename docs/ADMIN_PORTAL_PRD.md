# PRD: Admin Portal & Content API Pipeline

Status: Draft v1
Owner: Founder (non-technical, content owner) / Engineering (implementer)
Repo: `education-academy-website` (Vite + React frontend, Express + PostgreSQL backend in `server/`)

---

## 1. Problem

All course/masterclass/video content on the public site is hardcoded in JS files (`server/src/data/*.js`, mirrored in `src/data/*.js` as an offline fallback). Every content change today requires a code edit, a commit, and a redeploy. The founder cannot add a new YouTube video, mark it as an orientation session vs. a course video, tag it to a topic, or update homepage content without going through a developer.

Separately, the two lead-gen forms already on the site — **Contact Us** and **Become an Instructor** — write to PostgreSQL (`contact_messages`, `instructor_applications` tables, see `server/sql/001_create_lead_tables.sql`) but there is no UI to read that data. The founder currently has no way to see submissions except a direct DB query.

## 2. Goal

Give the founder a self-serve **Admin Portal** to:
1. Add/edit/remove YouTube videos (paste a link, set title, pick type — *orientation* or *course* — and topic), and have them appear live on the public site with no code change.
2. Manage the topics/categories those videos and courses are organized under.
3. View and manage submissions from the Contact and Become-an-Instructor forms (plus existing Registration/Waitlist leads that already land in Postgres).
4. (Stretch) Edit other static homepage content (banners/announcements) the same way.

This PRD defines the REST API contract and the data model needed to support that pipeline, so implementation (by you or an AI coding agent) has a single source of truth to build against.

## 3. Non-goals (v1)

- No multi-admin / role-based permissions — **one admin account only**.
- No video file hosting — YouTube links only, rendered via embedded iframe (existing pattern in `src/components/Common.jsx`'s `VideoThumbnail`).
- No WYSIWYG rich-text editor — plain text/textarea fields are fine for v1.
- No full migration of `bootcamps`/`masterclasses` hardcoded data into the DB in v1 (see Phase 2, §9). v1 adds videos, categories, and lead-inbox views without ripping out the existing bootcamp/masterclass content pipeline.

## 4. Users

- **Founder (Admin)**: one login, full access to the admin portal. Not a developer — the UI must be self-explanatory (paste-a-link simplicity, no raw video IDs, no markdown).

## 5. Current state (for context — verified against the repo)

| Area | Current reality |
|---|---|
| Frontend | Vite + React 18 SPA, `react-router-dom` v7, deployed to Hostinger as static `dist/` |
| Backend | Express 4 (ESM), single route file `server/src/index.js`, deployed to Render |
| DB | PostgreSQL via `pg`, connected through `server/src/db/pool.js`. Only lead tables exist today (`registrations`, `waitlist_entries`, `instructor_applications`, `contact_messages`) |
| Content | Hardcoded in `server/src/data/{masterclasses,bootcamps,categories,homepage,testimonials}.js`, served as static JSON by GET routes. `src/data/*.js` mirrors it as a fallback if the API call fails |
| Video rendering | `youtubeId` field on masterclass/bootcamp objects → `VideoThumbnail` component in `src/components/Common.jsx` embeds `youtube-nocookie.com/embed/{id}` on click |
| "Orientation" videos today | Not a distinct type — just a masterclass entry whose slug/title happens to say "Free Orientation Session" |
| Auth | None exists anywhere in the codebase |
| Admin UI | None exists |

This means v1 is mostly **additive**: new tables, new admin-only API routes, new `/admin` route tree in the existing React app — not a rewrite of what's already working.

## 6. Proposed architecture

- **Admin UI lives in the same React app**, under a new `/admin/*` route tree (e.g. `src/pages/admin/`), so there's one build and one Hostinger deployment — no second hosting setup.
  - Client-side route guard checks for a valid JWT (localStorage) and redirects to `/admin/login` if absent. This is a UX gate, not the security boundary — the real boundary is the API requiring a valid JWT on every `/api/admin/*` call.
- **Admin API lives in the same Express app** (`server/src/index.js` or split into `server/src/routes/admin.js` as it grows), under a new `/api/admin/*` prefix, protected by JWT middleware.
- **New PostgreSQL tables** for videos and categories (see §7), migrated the same way the existing lead tables were (`server/sql/00X_*.sql` + `npm run db:migrate`).
- **Public read endpoints** (`/api/videos`, `/api/categories`) become DB-backed instead of static-JSON-backed, so the admin's changes show up on the live site immediately after publish — no redeploy needed. This is the core of "the pipeline."

## 7. Data model (new tables)

### `admin_users`
Single row in v1, but modeled as a table (not an env var) so the founder can change their own password later without a code change.

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| email | text unique | |
| password_hash | text | bcrypt |
| created_at / updated_at | timestamptz | |

### `categories` (topics)
Replaces the hardcoded `server/src/data/categories.js` as the source of truth once migrated.

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| slug | text unique | url-safe, auto-generated from name |
| name | text | |
| description | text nullable | |
| icon | text nullable | matches existing icon-key convention in `categories.js` |
| sort_order | int default 0 | |
| featured | boolean default false | |
| created_at / updated_at | timestamptz | |

### `videos`
The core new entity.

| column | type | notes |
|---|---|---|
| id | uuid pk | |
| title | text | |
| youtube_url | text | raw URL as pasted by the founder |
| youtube_video_id | text | parsed server-side from `youtube_url` (see §8 validation) |
| video_type | text check in (`'orientation'`, `'course'`) | drives where it surfaces on the site |
| category_id | uuid fk → categories.id, nullable | "topic" |
| related_program_slug | text nullable | optional free-text link to an existing bootcamp/masterclass slug, so a course video can be attached to its program page without a full FK to two different hardcoded tables |
| description | text nullable | |
| thumbnail_url | text nullable | defaults to `https://img.youtube.com/vi/{youtube_video_id}/hqdefault.jpg` if not overridden — no upload needed |
| status | text check in (`'draft'`, `'published'`) default `'draft'` | lets the founder stage a video before it goes live |
| sort_order | int default 0 | |
| created_at / updated_at | timestamptz | |

### Lead tables (already exist — no schema change required for read access)
`contact_messages`, `instructor_applications`, `registrations`, `waitlist_entries` — v1 adds a **nullable `status` column** (`'new' | 'reviewed' | 'archived'`, default `'new'`) to each via a small migration, so the founder can triage submissions in the UI. Everything else about these tables is unchanged.

## 8. API contract

All `/api/admin/*` routes require `Authorization: Bearer <jwt>`. JWT is issued at login and expires (recommend 7 days, refresh-on-login — no need for refresh tokens in v1).

### Auth
| Method | Path | Body / Query | Response |
|---|---|---|---|
| POST | `/api/admin/auth/login` | `{ email, password }` | `{ token }` |
| GET | `/api/admin/auth/me` | — | `{ email }` (validates token) |

### Videos (admin)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/videos` | query: `type`, `category_id`, `status`; returns all (draft + published) |
| POST | `/api/admin/videos` | body: title, youtube_url, video_type, category_id?, related_program_slug?, description?, status? — server parses `youtube_video_id` from `youtube_url` and rejects if it can't (see validation below) |
| GET | `/api/admin/videos/:id` | |
| PUT | `/api/admin/videos/:id` | full update |
| PATCH | `/api/admin/videos/:id/status` | body: `{ status: 'draft'|'published' }` — quick publish/unpublish toggle |
| DELETE | `/api/admin/videos/:id` | |
| PATCH | `/api/admin/videos/reorder` | body: `[{ id, sort_order }]` |

### Categories (admin)
| Method | Path |
|---|---|
| GET | `/api/admin/categories` |
| POST | `/api/admin/categories` |
| PUT | `/api/admin/categories/:id` |
| DELETE | `/api/admin/categories/:id` (block delete if videos reference it; return 409 with count) |

### Leads inbox (admin, read + status update only — no create/delete)
| Method | Path |
|---|---|
| GET | `/api/admin/contact-messages` | query: `status`, pagination |
| GET | `/api/admin/instructor-applications` | query: `status`, pagination |
| GET | `/api/admin/registrations` | query: `status`, pagination |
| GET | `/api/admin/waitlist` | query: `status`, pagination |
| PATCH | `/api/admin/contact-messages/:id` | body: `{ status }` (same shape for the other three) |

### Public (existing routes, now DB-backed instead of static-JSON-backed)
| Method | Path | Change |
|---|---|---|
| GET | `/api/categories` | now reads `categories` table instead of `categories.js` |
| GET | `/api/videos` | **new**. query: `type=orientation\|course`, `category=slug`, `program=slug`. Returns only `status='published'` rows |
| GET | `/api/masterclasses`, `/api/bootcamps`, `/api/homepage` | unchanged in v1 (still static JS files — see Phase 2) |

### YouTube link validation
Accept any of: `https://www.youtube.com/watch?v=ID`, `https://youtu.be/ID`, `https://www.youtube.com/embed/ID`. Parse `ID` with a single regex server-side on create/update; return `400` with a plain-English error ("That doesn't look like a YouTube link") if it doesn't match — this is the one place a non-technical user is most likely to make a mistake, so the API (not just the UI) must validate it.

## 9. Frontend changes (public site)

- New `<VideoSection>`-style component (reusing the existing `VideoThumbnail` embed pattern from `src/components/Common.jsx`) fed by `GET /api/videos?type=orientation` and `GET /api/videos?type=course&program=<slug>`.
- Orientation videos surface wherever "Free Orientation Session" content currently lives (today: a masterclass entry) — once the admin can publish orientation videos directly, that hardcoded entry becomes redundant and can be retired.
- Course videos surface on `BootcampDetailPage.jsx` / `MasterclassDetailPage.jsx` via `related_program_slug`, alongside the existing hardcoded content.
- `src/lib/api.js`'s existing fallback-to-local-data pattern should extend to `/api/videos` (fallback = empty list, not stale hardcoded videos, since videos are admin-authored and have no meaningful static fallback).

## 10. Admin UI (high level — implementer has latitude on exact components)

- `/admin/login` — email + password form.
- `/admin` (dashboard) — counts: unread contact messages, unread instructor applications, published/draft video counts.
- `/admin/videos` — table (title, type, topic, status), "Add Video" opens a form: paste YouTube link → auto-preview thumbnail/title fetch client-side (oEmbed, no API key needed) → pick type (orientation/course) → pick topic from dropdown (backed by `/api/admin/categories`) → optional linked program → Save as Draft / Publish.
- `/admin/categories` — simple list + add/edit/delete.
- `/admin/leads` — tabs for Contact / Instructor Applications / Registrations / Waitlist, each a table with a status filter and mark-as-reviewed action.

## 11. Security

- Passwords: bcrypt hashed, never logged.
- JWT secret via new `JWT_SECRET` env var on Render (never committed — follow existing `.env.example` pattern).
- Rate-limit `/api/admin/auth/login` (e.g. 5 attempts/15min per IP) to blunt brute force — single-admin accounts are an easy target.
- CORS: `/api/admin/*` should still only be reachable from the same `FRONTEND_URL` origin already configured (no new origin needed since admin UI ships in the same SPA bundle).
- Seed the one admin account via a one-off migration/CLI script (`server/src/scripts/seedAdmin.js`), not a public signup route — there is intentionally no `POST /api/admin/auth/register`.

## 12. Rollout plan

1. **Migration**: add `admin_users`, `categories`, `videos` tables; add `status` column to the four lead tables. Follow existing pattern in `server/sql/001_create_lead_tables.sql` + `server/src/scripts/runMigrations.js`.
2. **Backend**: JWT auth middleware + all `/api/admin/*` routes + DB-backed `/api/categories` and new `/api/videos`.
3. **Seed**: run `seedAdmin.js` once against production DB with founder's chosen email/password.
4. **Frontend**: `/admin/*` route tree + login flow + video/category/leads CRUD screens.
5. **Public site**: wire orientation/course video sections to `/api/videos`.
6. **Cutover**: founder adds real videos through the UI; verify they render on the live site with no redeploy.
7. **Env vars to add**: `JWT_SECRET` (Render), nothing new needed on Hostinger (frontend still just needs `VITE_API_BASE_URL`, already set).

## 13. Phase 2 (explicitly out of scope for v1, noted for future planning)

- Migrate `bootcamps`, `masterclasses`, `homepage`, `testimonials` from hardcoded JS into Postgres + give the founder full CRUD over them (this is the "every direction" version of the admin portal — v1 covers videos + topics + leads, which is the highest-leverage slice since it's the founder's most frequent, most static-code-blocked task today).
- Image upload for course/thumbnail overrides (v1 relies on YouTube's auto-thumbnail).
- Multiple admin users with roles.
- Drag-and-drop reordering UI (v1's `reorder` endpoint exists but UI can start with a simple numeric `sort_order` field).

## 14. Open questions for the founder

- Exact wording/taxonomy for "orientation" vs "course" — is it strictly binary, or will more types (e.g. "testimonial video", "webinar recording") come later? (API's `video_type` is a constrained enum in Postgres — adding a third value is a one-line migration, so not a blocker either way, just want to scope v1 correctly.)
- Should published videos require a linked topic, or can "topic" be optional/blank at publish time?
