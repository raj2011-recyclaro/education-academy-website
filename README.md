# UpSkillr.in

UpSkillr.in is a Vite + React learning marketplace with a separate Node.js +
Express API in the same repository.

## Project Structure

```text
.
├── src/                 # Vite + React frontend
├── server/              # Express API for Render
├── vercel.json          # Frontend SPA rewrite
└── .env.example         # Frontend environment example
```

## Frontend Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Frontend environment variables:

```bash
VITE_API_BASE_URL=http://localhost:4000
```

If `VITE_API_BASE_URL` is not set, the frontend falls back to local mock data so
the Vercel build and static preview still work.

## Backend Setup

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Backend environment variables:

```bash
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://user:password@host:5432/database
DATABASE_SSL=true
```

The API binds to `0.0.0.0` and reads `process.env.PORT`, which is required by
Render and similar hosts.

Run database migrations after configuring `DATABASE_URL`:

```bash
cd server
npm run db:migrate
```

Check database connectivity:

```bash
curl http://localhost:4000/api/db/health
```

## API Routes

- `GET /health`
- `GET /api/db/health`
- `GET /api/masterclasses`
- `GET /api/masterclasses/:slug`
- `GET /api/bootcamps`
- `GET /api/bootcamps/:slug`
- `POST /api/registrations`
- `POST /api/waitlist`
- `POST /api/instructor-applications`
- `POST /api/contact`

Unknown slugs return JSON `404` responses. Form endpoints lightly validate
required fields, save lead submissions to PostgreSQL, and return generated IDs.

## Frontend Routes

- `/`
- `/masterclasses`
- `/bootcamps`
- `/masterclasses/:slug`
- `/bootcamps/:slug`
- `/registration-success`
- `/become-instructor`
- `/contact`
- `*` graceful 404

## Build

```bash
npm run build
npm run preview
```

## Deploy Frontend On Vercel

Import the repository into Vercel as the frontend app.

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variable: `VITE_API_BASE_URL=https://your-render-api.onrender.com`

The included `vercel.json` rewrites all frontend routes to `/index.html`.

## Deploy Backend On Render

Create a new Render Web Service from the same GitHub repo.

- Root directory: `server`
- Runtime: `Node`
- Build command: `npm install`
- Start command: `npm start`
- Environment variables:
  - `DATABASE_URL`
  - `DATABASE_SSL=true`
  - `FRONTEND_URL=https://your-vercel-app.vercel.app`
  - `NODE_ENV=production`
  - `PORT` is provided by Render automatically

Run migrations from the Render shell or a one-off job after deploy:

```bash
npm run db:migrate
```

## Notes

- Frontend and backend remain deployable independently.
- Backend data is duplicated from the frontend mock data for now.
- Registrations, waitlist joins, instructor applications, and contact messages
  are stored in PostgreSQL.
- Thumbnail photography uses remote Unsplash URLs and requires network access to
  display.
