---
name: platform-auth
description: Use before implementing, extending, or reviewing anything related to login, Google OAuth, user roles (student/teacher/admin), enrollment ("my courses"), admin user management, instructor-application promotion, or admin course/material/video management on this site. Triggers on requests like "add login", "add a role", "who can see this route", "enroll a student", "promote to teacher", "admin can't access", "add a new admin route", "course materials upload", or any work touching server/src/index.js auth middleware, a `users`/`enrollments`/`teacher_profiles`/`course_materials` table, or src/App.jsx route guards.
---

# Platform auth, roles & course management

This project is mid-build on a 3-role (student/teacher/admin) platform authenticated
via Google login only. The full design — and the *why* behind each decision — lives in
[`docs/PLATFORM_AUTH_RBAC_PRD.md`](../../../docs/PLATFORM_AUTH_RBAC_PRD.md). Read the
relevant section there before writing code; this skill is the fast-recall checklist,
not a replacement for it.

Related PRDs this work depends on or reuses:
- [`docs/ADMIN_PORTAL_PRD.md`](../../../docs/ADMIN_PORTAL_PRD.md) — bootcamps/masterclasses
  DB migration (§13) is a **prerequisite** for admin course CRUD; `videos`/`categories`
  schema is reused as-is.
- [`docs/INSTRUCTOR_RESUME_UPLOAD_PRD.md`](../../../docs/INSTRUCTOR_RESUME_UPLOAD_PRD.md) —
  file-storage decision (Option A object storage vs. Option B Postgres `bytea`) must be
  reused for `course_materials`, not re-decided.

## Non-negotiable decisions (do not silently re-derive a different answer)

1. **Identity key is `users.google_sub`, never `email`.** Email is display/search data,
   not the join key.
2. **No password login, ever.** Google is the only identity provider for every role.
3. **The session token is never written to `localStorage` and never sent as a
   cross-site cookie.** It lives in memory (React context) and rides on the
   `Authorization: Bearer` header. See PRD §9.2 for the full reasoning (XSS resistance,
   cross-domain cookie fragility between Hostinger and Render). If you find yourself
   about to call `localStorage.setItem` for a token, stop — that's the exact mistake
   this design corrects from the earlier `ADMIN_PORTAL_PRD.md` draft.
4. **Role is never trusted from client input**, on any route, ever — not on the
   Google-login upsert, not on a course-edit form, nowhere. The only two ways a role
   changes: the `ADMIN_EMAILS` allowlist at first login, or
   `PATCH /api/admin/users/:id/role` (admin-only, with a last-admin self-demotion guard).
5. **`admin` implicitly passes every `requireRole` check.** Don't write a route that
   allows `teacher` but accidentally locks out `admin` — the middleware must treat admin
   as "allowed everywhere," per PRD §8.2.
6. **Every `/api/admin/*` and `/api/teacher/*` route needs `requireAuth` +
   `requireRole(...)` server-side.** A frontend `<RequireRole>` guard hiding a nav link
   is UX only and is never a substitute for the server check.
7. **Every new admin list endpoint is paginated from the start** (`page`/`pageSize`,
   capped). Never ship an unbounded `SELECT *` on `users`, `instructor_applications`,
   or course lists.
8. **JWT verification pins `algorithms: ['HS256']` explicitly.** Never let a JWT
   library infer the algorithm from the token itself.
9. **File uploads (resumes, course materials) share one MIME allowlist / size-cap /
   filename-sanitization policy**, defined in `INSTRUCTOR_RESUME_UPLOAD_PRD.md` §11 —
   don't write a second, slightly different validation routine for course materials.

## Before writing any code in this area

- Check `docs/PLATFORM_AUTH_RBAC_PRD.md` §14 (rollout plan) to see which step you're
  actually on, and whether its prerequisites (a migration, an env var, a prior step)
  are already done. Don't build admin course CRUD before the bootcamps/masterclasses
  DB migration exists (`ADMIN_PORTAL_PRD.md` §13) — there's nothing to persist to.
- Check whether the relevant migration file already exists in `server/sql/` before
  proposing a new one; number it after the highest existing file.
- If a request conflicts with a decision in §"Non-negotiable decisions" above (e.g.
  "just store the JWT in localStorage, it's simpler"), say so explicitly and point to
  the PRD section explaining why, rather than quietly complying or quietly ignoring the
  request.

## Quick review checklist for a new backend route in this area

- [ ] `requireAuth` present if the route needs a logged-in user
- [ ] `requireRole(...)` present if the route is role-restricted, and admin is covered
- [ ] No field on the request body can set/escalate `role` or `status` outside the
      dedicated admin endpoints
- [ ] List endpoints accept `page`/`pageSize` and cap the max page size
- [ ] Queries are parameterized (existing codebase convention via `pg`) — no string-built SQL
- [ ] Any file upload validates MIME type, size, and sanitizes the filename server-side

## Quick review checklist for a new frontend authenticated view

- [ ] Wrapped in `<RequireAuth>` and/or `<RequireRole roles={[...]}>`
- [ ] Reads the user/role from the shared `AuthProvider` context, doesn't re-implement
      its own token storage
- [ ] Never persists the token itself (context state only, re-derived via silent
      Google sign-in on reload — PRD §8.1 step 8)
