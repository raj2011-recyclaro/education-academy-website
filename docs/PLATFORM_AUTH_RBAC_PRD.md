# PRD: Google Login, Role-Based Access (Student / Teacher / Admin) & Course Management

Status: Draft v1
Owner: Founder (product) / Engineering (implementer)
Repo: `education-academy-website` (Frontend: Vite + React 18 + `react-router-dom` v7, deployed to Hostinger. Backend: Express 4 (ESM) + PostgreSQL via `pg`, deployed to Render)
Supersedes: `ADMIN_PORTAL_PRD.md` §6 ("Client-side route guard checks for a valid JWT (localStorage)") and §11 (single `admin_users` password login) — see §3 "Relationship to existing PRDs" below.
Builds on: `ADMIN_PORTAL_PRD.md` §7–§13 (categories/videos schema, bootcamps/masterclasses DB migration), `INSTRUCTOR_RESUME_UPLOAD_PRD.md` (file storage decision, reused here for course materials).

---

## 1. Problem

The site has no concept of a logged-in user today. Every page is public and stateless:
- There's no way for a student to save an "opted-in" course list, or for the platform to know who registered for what beyond a lead-capture row (`registrations`) keyed by whatever name/email was typed into a form.
- There's no teacher identity — instructors are a hardcoded array (`src/data/instructors.js`), not accounts. `instructor_id` on a bootcamp/masterclass is a free-text key into that file, not a real user.
- Admin capability doesn't exist in code yet at all (`ADMIN_PORTAL_PRD.md` specifies it but it isn't built) and that spec assumed a single hardcoded admin with email/password login.
- There is no authentication library, no session/token handling, no `users` table, anywhere in the codebase.

The founder wants to move to a real 3-role platform (**student**, **teacher**, **admin**) authenticated via **Google login only** (no password system to build or secure), where:
- Students can browse all courses, search, and see the courses they've opted into.
- Admin has full control: can create/edit courses and attribute them to any teacher, attach YouTube videos and subtopics/curriculum to a course, upload supporting documents, see all users by role, and review every instructor application.
- No payment system in v1. Teacher accounts exist and can log in, but self-serve teacher course authoring is explicitly future work — for v1, **admin publishes on a teacher's behalf**.

## 2. Goal

Ship a single, unified Google-OAuth login that issues one role-aware session for the whole app, plus the minimum data model and API surface needed for:

1. **Auth**: "Sign in with Google" for every user type; new sign-ins default to `student`; roles are promoted by an admin (or auto-assigned to `admin` for a pre-approved founder email — see §8.1).
2. **Student**: browse all published courses, search/filter, and view "My Courses" (what they've enrolled in).
3. **Admin**: full CRUD on courses (title, summary, subtopics/curriculum, YouTube video links, uploaded documents), attributing any course to any teacher account; a paginated, filterable directory of all users by role; a full inbox of instructor applications (already partially specified in `ADMIN_PORTAL_PRD.md` §10) with a "promote to teacher" action.
4. **Teacher** (v1 scope, intentionally minimal): can log in and see a read-only profile page listing the courses admin has attributed to them. No authoring UI yet — that's Phase 2 (§13).

## 3. Relationship to existing PRDs

- **Auth supersedes `ADMIN_PORTAL_PRD.md` §6/§11.** That PRD proposed a single `admin_users` table with bcrypt password login and a JWT stored in `localStorage`. This PRD replaces that entirely with Google-only login for all three roles, and a JWT that is **never stored in `localStorage`** (see §9.2 for why — XSS token-theft resistance). If any part of `ADMIN_PORTAL_PRD.md`'s admin-auth section has already been built, it should be migrated/retired in favor of this design rather than run in parallel — two auth systems is a maintenance and security liability, not a feature.
- **Course content still depends on `ADMIN_PORTAL_PRD.md` §13 (Phase 2)** — the bootcamps/masterclasses-into-Postgres migration. You cannot "post a course" through an admin UI into a hardcoded `src/data/bootcamps.js` file. If §13 hasn't shipped yet, it should ship alongside or immediately before the admin course-management piece of this PRD (§7.3 below assumes `bootcamps`/`masterclasses` are DB tables, per that spec).
- **Course document uploads reuse the storage decision in `INSTRUCTOR_RESUME_UPLOAD_PRD.md` §5.2** (object storage vs. Postgres `bytea`) rather than making a second, inconsistent choice. Whichever option gets picked for resumes should be reused for course materials — see §7.4.
- **`videos` table and `/api/admin/videos` CRUD are reused as-is** from `ADMIN_PORTAL_PRD.md` §7/§8 for "admin can add YouTube links to a course" — no new video schema needed here.

## 4. Non-goals (v1)

- **No payment/checkout system.** Enrollment ("opt in") is free and instant — a row in a new `enrollments` table, not a purchase.
- **No teacher self-serve course authoring.** Teachers can log in and view their attributed courses; they cannot create or edit a course in v1. (Phase 2, §13.)
- **No password-based login, ever, for any role.** Google is the only identity provider. (Simplifies the security surface enormously — no password storage, no reset-password flow, no credential-stuffing risk.)
- **No email/SMS notifications** beyond what `INSTRUCTOR_RESUME_UPLOAD_PRD.md` already specifies for instructor applications.
- **No course reviews/ratings, no in-app messaging, no live video conferencing.**
- **No fine-grained permissions beyond the 3 roles** (e.g., no "editor" vs. "publisher" split within admin) — v1 RBAC is exactly `student | teacher | admin`.

## 5. Users (roles)

| Role | Can do | Cannot do (v1) |
|---|---|---|
| **Student** (default for every new sign-in) | Browse all published courses; search/filter; enroll ("opt in") in any course; view "My Courses" | Create/edit courses; see other users; see admin data |
| **Teacher** (promoted by admin, or auto-promoted on instructor-application approval) | Everything a student can do, plus: view a read-only "My Teaching" page listing courses admin has attributed to them | Create/edit courses; publish; see other users |
| **Admin** (bootstrapped via `ADMIN_EMAILS` allowlist, see §8.1; further admins promoted by an existing admin) | Everything, unconditionally: full course CRUD on behalf of any teacher, user directory by role, role promotion/demotion, instructor-application inbox, video/category management (existing `ADMIN_PORTAL_PRD.md` scope) | — |

## 6. Current state (verified against the repo)

| Area | Current reality |
|---|---|
| Auth | None. No login, no session, no `users` table, no auth middleware anywhere in `server/src/index.js` |
| Identity | `src/data/instructors.js` is a hardcoded array (currently one instructor); `instructor_id` on a bootcamp/masterclass is a free-text string key into it, not a foreign key to any account |
| "Registration" today | `registrations`/`waitlist_entries` (`server/sql/001_create_lead_tables.sql`) are anonymous lead-capture rows (name/email/phone typed into a form each time) — not tied to a persistent identity, so there is no real "my courses" concept possible today |
| Course content | Hardcoded in `server/src/data/{bootcamps,masterclasses}.js`, mirrored in `src/data/*.js` as an offline fallback (see `ADMIN_PORTAL_PRD.md` §5) — no admin-editable path exists yet |
| Instructor applications | `instructor_applications` table exists and accepts submissions (`POST /api/instructor-applications`, extended in `INSTRUCTOR_RESUME_UPLOAD_PRD.md` to accept a resume) but there is no admin UI to review them yet |
| Dependencies | `server/package.json`: `cors`, `dotenv`, `express`, `pg` only. No auth library, no JWT library, no Google SDK |
| Deployment | Frontend on Hostinger, backend on Render, `FRONTEND_URL` env var already used for CORS origin allowlisting in `server/src/index.js` |

## 7. Data model

New migration(s) — exact numbering assigned at implementation time based on ship order relative to `INSTRUCTOR_RESUME_UPLOAD_PRD.md`'s proposed `004_add_instructor_application_resume.sql`; referred to here as `00X_*` :

### 7.1 `users` — the new identity table, everything else hangs off this
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| google_sub | text unique not null | Google's stable subject identifier — **the real key**, not email (see §9.1 for why) |
| email | text unique not null | from verified Google ID token, kept in sync on every login |
| full_name | text | |
| avatar_url | text nullable | Google profile picture URL |
| role | text not null default `'student'` check in (`'student'`, `'teacher'`, `'admin'`) | server-authoritative, never set from client input except via the admin role-change endpoint |
| status | text not null default `'active'` check in (`'active'`, `'suspended'`) | lets admin disable an account without deleting history |
| last_login_at | timestamptz | updated on every successful login |
| created_at / updated_at | timestamptz | |

Index: unique on `google_sub`, unique on `email`, index on `role` (the user-directory list filters by role constantly — see §10.3).

### 7.2 `teacher_profiles` — 1:1 with a `users` row where `role = 'teacher'`
Mirrors the exact shape `src/data/instructors.js` already uses and `InstructorCard` (`src/components/Common.jsx`) already renders (`name`, `role`, `bio`, `image`, `highlights`, `credentials`), so migrating off the static file is a data-source swap, not a component rewrite.

| column | type | notes |
|---|---|---|
| user_id | uuid pk, fk → users.id | |
| headline | text | e.g. "Founder, Unfluke \| SEBI Registered Research Analyst..." — maps to `instructors.js`'s `role` field |
| bio | text | |
| highlights | jsonb | array of strings, ≤5 per `InstructorCard`'s existing UI (bullet list, see recent frontend change) |
| credentials | jsonb | array of strings (fallback list if `highlights` empty, matching existing component logic) |
| created_at / updated_at | timestamptz | |

### 7.3 `enrollments` — powers "My Courses" / opt-in
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| user_id | uuid fk → users.id | |
| course_type | text check in (`'bootcamp'`, `'masterclass'`) | |
| course_slug | text | matches `bootcamps.slug` / `masterclasses.slug` (see dependency note in §3 — assumes those tables exist per `ADMIN_PORTAL_PRD.md` §13; if not yet migrated, this can temporarily reference the static slug strings from `src/data/*.js` with no FK constraint, and gain a real FK once §13 ships) |
| status | text not null default `'active'` check in (`'active'`, `'cancelled'`) | soft-delete pattern — don't hard-delete enrollment history |
| enrolled_at | timestamptz default now() | |

Unique constraint on `(user_id, course_type, course_slug)` — enrolling twice is a no-op, not a duplicate row.

### 7.4 `course_materials` — admin-uploaded documents per course
| column | type | notes |
|---|---|---|
| id | uuid pk | |
| course_type | text check in (`'bootcamp'`, `'masterclass'`) | |
| course_slug | text | |
| title | text | display name, e.g. "Week 3 slide deck" |
| file_name | text | original filename |
| mime_type | text | allowlisted server-side: PDF, PPT/PPTX, DOC/DOCX only for v1 |
| file_size | int | |
| storage_ref | — | **same column shape as whichever option `INSTRUCTOR_RESUME_UPLOAD_PRD.md` §5.2 lands on** — either `file_data bytea` (Option B) or `storage_key text` (Option A). Do not make a second, different storage decision here. |
| sort_order | int default 0 | |
| uploaded_by | uuid fk → users.id | which admin uploaded it |
| created_at | timestamptz | |

### 7.5 `instructor_applications` — one new column
Add `promoted_user_id uuid nullable fk → users.id` — set when an admin approves an application and it results in promoting (or creating, if the applicant hasn't signed in yet) a `teacher` account. Lets the applications inbox show "already promoted" vs. "pending" without inferring it from email matching.

### 7.6 `bootcamps` / `masterclasses` — one field reinterpreted, not changed
Per `ADMIN_PORTAL_PRD.md` §13.3, `instructor_id` is already specified as `text`. Once this PRD ships, that column's value **is** a `users.id` (uuid, cast to text or changed to `uuid fk → users.id` directly — recommend making it a real FK once §13's migration is written, since it hasn't shipped yet and there's no reason to ship it with a weaker constraint now that real teacher accounts exist).

## 8. Authentication design

### 8.1 Login flow (Google Identity Services, ID-token verification — no OAuth "consent screen" server round-trip needed)

1. Frontend loads the Google Identity Services script and renders a "Sign in with Google" button (recommend the `@react-oauth/google` package — a thin, actively-maintained wrapper over GIS; do **not** use the old `react-google-login` package, which is unmaintained and targets Google's deprecated Auth2 API).
2. On successful sign-in, the browser receives a Google **ID token** (a signed JWT) directly from Google — the frontend never sees a password or handles OAuth redirect/callback plumbing.
3. Frontend `POST`s that ID token to `POST /api/auth/google`.
4. Backend verifies it server-side using the official `google-auth-library` (`OAuth2Client.verifyIdToken()`), checking signature, `aud` (matches our `GOOGLE_CLIENT_ID`), issuer, and expiry. **Never trust a client-decoded token payload — always verify server-side.**
5. Backend upserts the `users` row by `google_sub`:
   - New user → `role = 'student'`, **unless** the verified email is in the `ADMIN_EMAILS` env var (comma-separated allowlist) → `role = 'admin'`. This is how the founder's own account becomes the first admin, with zero manual DB editing and no separate seed script to run in production.
   - Existing user → update `email`/`full_name`/`avatar_url`/`last_login_at`; **role is never overwritten by the login path**, only by the explicit role-change endpoint (§10.4).
6. Backend issues its own short-lived JWT (`{ sub: user.id, role, email }`, 1 hour expiry, `HS256`, signed with `JWT_SECRET`) in the **response body** (not a cookie — see §9.2 for why).
7. Frontend keeps this token **in memory only** (React context), attaches it as `Authorization: Bearer <token>` on every API call.
8. **Session persistence across page reloads**: on app load, the frontend re-runs Google's silent sign-in (GIS one-tap / automatic sign-in for a user who's still signed into their Google account) to get a fresh ID token with no user interaction, and silently repeats steps 3–7. If Google has no active session for the user (they're signed out of Google, or declined), the app treats them as logged out and shows the sign-in button. This avoids needing a custom refresh-token cookie and the cross-domain cookie complications that come with the frontend (Hostinger) and backend (Render) living on different origins (see §9.2).
9. **Logout**: clear the in-memory token and call `google.accounts.id.disableAutoSelect()` so silent sign-in doesn't immediately re-log the user in.

### 8.2 Authorization middleware (backend)

- `requireAuth` — verifies the `Authorization: Bearer` JWT, attaches `req.user = { id, role, email }`, `401` if missing/invalid/expired.
- `requireRole(...roles)` — `403` unless `req.user.role` is in the allowed set; **`admin` is implicitly allowed on every `requireRole` check** (admin has full access, per §5), so route definitions only need to name the non-admin roles they additionally permit.
- Every `/api/admin/*` route (existing and new) gets `requireAuth, requireRole('admin')`. Every `/api/teacher/*` route gets `requireAuth, requireRole('teacher')`. Student-only routes (enrollment) get plain `requireAuth`.

## 9. Security

### 9.1 Why `google_sub`, not `email`, is the identity key
Email addresses can be reassigned or reused at the provider level in edge cases; Google's `sub` claim is documented as the stable, permanent identifier for a Google account and is what Google itself recommends keying on. Email is still stored and kept in sync (for display and admin search) but is never the join key for authorization decisions.

### 9.2 Session storage: superseded (2026-07-21) — now `localStorage`, by explicit decision
This section originally specified an in-memory-only access token, restored via silent Google One Tap on reload, on the reasoning that follows below (kept for the record). In practice, on real deployment:
1. **One Tap/FedCM was unreliable** across browsers (third-party-cookie-dependent) and produced intermittent failed-login errors even when correctly implemented.
2. Its from-scratch replacement — an httpOnly, `SameSite=None; Secure` refresh-token cookie, rotated on every use — was built next, and *did* work, verified via direct testing. But it depends on the exact cross-origin cookie behavior §9.2 originally flagged as fragile, and reproducing/debugging it consumed disproportionate effort relative to the app's actual risk profile.
3. Founder decision: store the access token itself in `localStorage`, restored and re-validated via `GET /api/auth/me` on every page load. No separate refresh token. Token lifetime extended to 7 days (`server/src/lib/auth.js`) since it's now the sole session artifact.

This knowingly reintroduces the XSS-exfiltration exposure described in the original reasoning below — accepted as the right tradeoff for this app: reliability and simplicity over the marginal hardening a cookie-based design would have bought. If a future XSS-hardening pass is warranted (e.g. once the app handles more sensitive data), revisit with the frontend and backend on the same parent domain (see the original point 2 below), which removes the cross-site cookie fragility that made the cookie design costly to operate.

**Original reasoning (for context on the design space, no longer the implementation):**
- **Not `localStorage`**: any XSS on the page (a compromised dependency, an injected script) can read `localStorage` and exfiltrate the token. This is the exact weakness `ADMIN_PORTAL_PRD.md`'s original draft had (§6: "JWT (localStorage)").
- **Not a cross-site cookie either**: frontend (Hostinger) and backend (Render) are different origins/domains. A cookie-based session needs `SameSite=None; Secure`, which is fragile across browsers (Safari ITP and similar third-party-cookie restrictions) unless the two are put on the same parent domain (e.g. `www.upskillr.in` + `api.upskillr.in`) — an infra change not yet done.

### 9.3 Other security requirements
- `JWT_SECRET` ≥ 32 random bytes, env var only, never committed (same handling as `DATABASE_URL` today).
- JWT verification must pin `algorithms: ['HS256']` explicitly (never accept `alg: none` or let the library infer the algorithm from the token — classic algorithm-confusion vulnerability class).
- Role is **never** accepted from client input on any write path. The only way a role changes is: (a) the `ADMIN_EMAILS` allowlist at first login, or (b) `PATCH /api/admin/users/:id/role`, admin-only, and an admin can never demote themselves as the last remaining admin (guard against locking everyone out — check `count(*) where role='admin'` before allowing a self-demotion).
- Rate-limit `POST /api/auth/google` and `PATCH /api/admin/users/:id/role` (`express-rate-limit`) — both are abuse-sensitive (auth spam / privilege-escalation attempts).
- CORS stays locked to `FRONTEND_URL` (existing pattern in `server/src/index.js`) — the header-token design means `credentials: true` isn't even needed for auth to work, one less thing to misconfigure.
- File uploads for `course_materials` (§7.4) follow the exact same server-side MIME allowlist / size cap / filename sanitization rules specified in `INSTRUCTOR_RESUME_UPLOAD_PRD.md` §11 — don't re-derive a second policy.
- Frontend route guards (`<RequireAuth>`, `<RequireRole>`) are UX only — hiding an "Admin" nav link from a student is not a security boundary. The only real boundary is `requireRole` on the API. State this plainly in code comments at the guard components so nobody mistakes client-side hiding for enforcement.
- Parameterized queries throughout (already the established pattern via `pg` in `server/src/index.js` — maintain it, no raw string interpolation into SQL, ever).

## 10. API contract

### 10.1 Auth
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/auth/google` | `{ idToken }` | `{ token, user: { id, email, fullName, avatarUrl, role } }` |
| GET | `/api/auth/me` | — (requires `Authorization`) | `{ id, email, fullName, avatarUrl, role }` — used to validate an in-memory token is still fresh on demand |

### 10.2 Student
| Method | Path | Notes |
|---|---|---|
| GET | `/api/courses` | Public, unchanged in shape from today's `/api/bootcamps` + `/api/masterclasses` (or a unified endpoint — implementer's call); supports `?search=&category=` |
| GET | `/api/me/enrollments` | `requireAuth`. Returns the logged-in student's opted-into courses (joins `enrollments` → course tables) |
| POST | `/api/me/enrollments` | `requireAuth`. Body: `{ courseType, courseSlug }`. Idempotent (unique constraint from §7.3) |
| DELETE | `/api/me/enrollments/:id` | `requireAuth`, owner-only (a student can only cancel their own enrollment — check `enrollment.user_id === req.user.id` or `404`, not `403`, to avoid leaking existence of other users' enrollments) |

### 10.3 Admin — users
| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/users` | `requireRole('admin')`. Query: `role`, `status`, `search` (name/email), pagination (`page`, `pageSize`, capped e.g. at 50) — **never unbounded**, matching the pagination requirement already noted in `ADMIN_PORTAL_PRD.md` §8's leads inbox |
| PATCH | `/api/admin/users/:id/role` | Body: `{ role }`. Self-demotion-of-last-admin guard per §9.3 |
| PATCH | `/api/admin/users/:id/status` | Body: `{ status: 'active'|'suspended' }` |

### 10.4 Admin — instructor applications (extends `ADMIN_PORTAL_PRD.md` §8's stub)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/instructor-applications` | `requireRole('admin')`. Query: `status`, pagination |
| PATCH | `/api/admin/instructor-applications/:id` | Body: `{ status }` (existing, per `ADMIN_PORTAL_PRD.md`) |
| POST | `/api/admin/instructor-applications/:id/promote` | **New.** Looks up (or, if the applicant hasn't signed in with Google yet, leaves pending until they do — can't create a `users` row without a `google_sub`) the `users` row matching the application's email, sets `role = 'teacher'`, creates a blank `teacher_profiles` row, sets `instructor_applications.promoted_user_id`. Returns `409` with a clear message if no matching `users` row exists yet ("Applicant hasn't signed in with Google — they'll need to log in once before you can promote them") |

### 10.5 Admin — courses (depends on `ADMIN_PORTAL_PRD.md` §13's DB migration)
| Method | Path | Notes |
|---|---|---|
| GET / POST | `/api/admin/bootcamps`, `/api/admin/masterclasses` | Per `ADMIN_PORTAL_PRD.md` §13.4, unchanged — now gated by `requireRole('admin')` instead of that PRD's original single-admin-JWT middleware |
| PUT | `.../:id` | Includes `instructor_id` — admin picks any `role='teacher'` user from a dropdown (`GET /api/admin/users?role=teacher`) to attribute the course to |
| GET / POST / DELETE | `/api/admin/courses/:type/:slug/materials` | **New**, powers §7.4. `POST` is `multipart/form-data`, same validation rules as the resume upload |
| (existing) | `/api/admin/videos*` | Reused as-is from `ADMIN_PORTAL_PRD.md` §8 for attaching YouTube links to a course via `related_program_slug` |

### 10.6 Teacher
| Method | Path | Notes |
|---|---|---|
| GET | `/api/teacher/me/courses` | `requireRole('teacher')`. Read-only list of courses where `instructor_id = req.user.id` |

## 11. Frontend changes

- **`AuthProvider`** (new, wraps the app in `src/App.jsx`): holds `{ user, role, token, loading, login, logout }` in React context; runs the silent-sign-in check on mount (§8.1 step 8).
- **Route guards**: `<RequireAuth>` (redirect to a `/login` prompt — likely a modal or dedicated route rendering the Google button, implementer's call) and `<RequireRole roles={[...]}>`, wrapping the relevant `react-router-dom` routes in `src/App.jsx`.
- **Nav** (`src/components/Layout.jsx`): show "Sign in" when logged out; show avatar + role-appropriate links (My Courses / My Teaching / Admin) when logged in.
- **Student**: extend the existing course browse pages (`BootcampsPage.jsx`, `MasterclassesPage.jsx`) — search/filter already exist (`SearchBar`, `CategoryFilter` in `src/components/Common.jsx`), just need enrollment wiring. New `/my-courses` page.
- **Admin**: new `/admin` route tree per `ADMIN_PORTAL_PRD.md` §10, extended with `/admin/users` (table + role/status controls) and course material upload UI on the course edit form.
- **Teacher**: new `/teacher` page, read-only course list.
- Reconcile with the existing public `RegistrationForm`/`StickyRegistrationCard` (`src/components/Common.jsx`) used today for anonymous lead capture: **keep that flow for logged-out visitors** (don't force login just to express interest), and add a separate one-click "Enroll" action (calls `POST /api/me/enrollments`) that only appears when a student is logged in. Don't conflate the two — anonymous lead capture and authenticated enrollment serve different purposes and audiences.

## 12. Scalability

- Stateless JWT auth (no server-side session store) → the backend can scale horizontally on Render with no sticky-session requirement.
- Indexes called out in §7 (`users.google_sub`, `users.email`, `users.role`, `enrollments(user_id)`, unique `(user_id, course_type, course_slug)`).
- Every admin list endpoint is paginated from day one (§10.3) — no unbounded `SELECT *` as the user/application/course tables grow.
- Course browsing (`GET /api/courses`) stays cacheable/public (no auth required to read), keeping the highest-traffic path cheap; only the write paths (enrollment, admin CRUD) touch auth middleware.

## 13. Phase 2 (explicitly out of scope now, per founder's own framing — "future pipeline")

- **Teacher self-serve authoring**: `/teacher/courses/new`, draft/submit-for-review workflow, admin approval before publish.
- **Payments/checkout**: paid course enrollment, replacing the free `enrollments` insert with a payment-gated one.
- **Audit log**: track role changes and admin actions on courses (who posted what on whose behalf, when) — worth adding once the user base is large enough that "who did this" becomes a real support question.
- Promote `bootcamps.instructor_id` to a hard FK constraint (§7.6) once §13's migration is actually written (can be done in the same migration rather than as a later `ALTER`).

## 14. Rollout plan

1. **Google Cloud setup** (founder/engineering, one-time): create a Google Cloud project, configure the OAuth consent screen, create an OAuth Client ID (Web application type), register both the Hostinger production origin and `http://localhost:5173` as authorized JavaScript origins. Yields `GOOGLE_CLIENT_ID` (public, used by both frontend and backend) — no client secret needed for the ID-token-verification flow in §8.1.
2. **Migration**: `users`, `teacher_profiles`, `enrollments`, `course_materials` tables; `promoted_user_id` on `instructor_applications`; per §7, numbered to not collide with `INSTRUCTOR_RESUME_UPLOAD_PRD.md`'s pending migration.
3. **Backend — auth**: add `google-auth-library`, `jsonwebtoken`, `express-rate-limit` to `server/package.json`; build `POST /api/auth/google`, `GET /api/auth/me`, `requireAuth`/`requireRole` middleware.
4. **Backend — student**: `/api/me/enrollments` CRUD.
5. **Backend — admin**: `/api/admin/users*`, `/api/admin/instructor-applications/:id/promote`, gate existing/new `/api/admin/*` routes behind `requireRole('admin')` (retiring any interim auth from `ADMIN_PORTAL_PRD.md` if already built), `/api/admin/courses/:type/:slug/materials`.
6. **Backend — teacher**: `/api/teacher/me/courses`.
7. **Frontend — auth**: `AuthProvider`, Google sign-in button, `RequireAuth`/`RequireRole` guards, nav updates.
8. **Frontend — student**: enrollment button on course detail pages, `/my-courses`.
9. **Frontend — admin**: `/admin/users`, course-material upload on the course editor, "promote to teacher" action on the applications inbox.
10. **Frontend — teacher**: `/teacher`.
11. **Env vars**: `GOOGLE_CLIENT_ID` (frontend as `VITE_GOOGLE_CLIENT_ID`, backend as `GOOGLE_CLIENT_ID`), `JWT_SECRET`, `ADMIN_EMAILS` — all on Render/Hostinger per §15.
12. **Verify**: sign in as the founder's allowlisted email → confirm `admin` role; sign in as a second test Google account → confirm `student` default; promote it to `teacher` via the admin UI → confirm `/teacher` access unlocks and `/admin/*` still correctly `403`s for it.

## 15. Environment variables to add

**Backend (Render):**
```
GOOGLE_CLIENT_ID=
JWT_SECRET=
ADMIN_EMAILS=founder@upskillr.in
```

**Frontend (Hostinger build-time, Vite):**
```
VITE_GOOGLE_CLIENT_ID=
```
(Same value as the backend's `GOOGLE_CLIENT_ID` — it's a public identifier, safe to ship in the frontend bundle; this is normal for Google Identity Services.)

## 16. Dependencies to add

`server/package.json`: `google-auth-library`, `jsonwebtoken`, `express-rate-limit`.
Frontend `package.json`: `@react-oauth/google`.

## 17. Custom skill

A project skill (`.claude/skills/platform-auth/SKILL.md`) has been added alongside this PRD — it keeps future implementation sessions anchored to the decisions above (identity key, token storage, role-check placement, migration dependencies) without re-deriving them each time. See that file for what it enforces.

## 18. Open questions for the founder

- Confirm the exact list of `ADMIN_EMAILS` for initial admin bootstrap (can be more than one).
- Should a suspended (`status='suspended'`) user's existing enrollments stay visible to them read-only, or should suspension also block login entirely? (Recommend: block login — simpler, and matches "suspended" meaning "no platform access.")
- For the "promote to teacher" action (§10.4) when the applicant hasn't signed in with Google yet: acceptable to leave it pending until their first login, or is there a need to invite them by email first? (v1 assumption: pending is fine, matches "no email system" scope already true today outside of `INSTRUCTOR_RESUME_UPLOAD_PRD.md`'s separate notification work.)
- Is `ADMIN_PORTAL_PRD.md` §13 (bootcamps/masterclasses → Postgres) already being built, or should it be scheduled as a prerequisite sprint before §10.5 (admin course CRUD) here?
