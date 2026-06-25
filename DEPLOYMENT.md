# Deployment Guide

This project has two independently deployable parts:

- **Frontend** — Vite + React SPA (this repository root)
- **Backend** — Express + PostgreSQL API (`server/` folder)

---

## Frontend — Hostinger Git Deployment

### Build settings

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 18+ |

### Environment variables

Set these in the Hostinger panel under **Hosting → Git → Environment Variables**:

| Variable | Example | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://your-api.onrender.com` | Full URL of the deployed backend API |

> All frontend env vars must be prefixed with `VITE_` to be exposed to the browser.

### Hostinger Git deployment steps

1. Log in to Hostinger → **hPanel → Hosting → Git**.
2. Connect your GitHub repository.
3. Set the **Build command** to `npm run build`.
4. Set the **Output directory** to `dist`.
5. Add the `VITE_API_BASE_URL` environment variable pointing to your live API.
6. Click **Deploy**. Hostinger auto-detects Vite and runs the build.

### SPA routing

A `public/.htaccess` file is included in this repo. Vite copies it into `dist/` at build time. It instructs Apache (Hostinger's web server) to serve `index.html` for all routes, enabling client-side navigation via React Router.

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]
```

If routes return 404 after deployment, confirm the `.htaccess` file is present in the deployed `dist/` folder.

---

## Backend — Recommended: Render (separate deployment)

The `server/` folder is a standalone Express API and **must not be deployed alongside the frontend** on Hostinger static hosting. Deploy it separately on a Node-capable platform such as Render.

### Render deployment steps

1. Create a new **Web Service** on [render.com](https://render.com).
2. Set the root directory to `server`.
3. Set the **Build command** to `npm install`.
4. Set the **Start command** to `npm start`.
5. Add environment variables from `server/.env.example`:

| Variable | Description |
|---|---|
| `PORT` | Port the server listens on (Render sets this automatically) |
| `NODE_ENV` | Set to `production` |
| `FRONTEND_URL` | Hostinger frontend URL (for CORS) |
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_SSL` | Set to `true` for managed Postgres |

6. Run the database migration after first deploy:
   ```
   npm run db:migrate
   ```

7. Copy the Render service URL and set it as `VITE_API_BASE_URL` in the Hostinger frontend environment.

---

## Local development

```bash
# Terminal 1 — frontend
npm install
npm run dev           # http://localhost:5173

# Terminal 2 — backend
cd server
npm install
cp .env.example .env  # fill in DATABASE_URL
npm run dev           # http://localhost:4000
```

Set `VITE_API_BASE_URL=http://localhost:4000` in a root `.env` file for local API calls.

---

## Validation checklist

- [ ] `npm install` completes without errors
- [ ] `npm run build` completes and generates `dist/`
- [ ] `dist/.htaccess` is present after build
- [ ] `VITE_API_BASE_URL` points to the live backend
- [ ] All React Router routes load correctly (no 404 on refresh)
- [ ] Backend CORS allows the Hostinger frontend URL
