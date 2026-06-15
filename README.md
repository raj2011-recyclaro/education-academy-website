# Academy

A frontend-only online learning marketplace rebuilt from the supplied Google Stitch reference screens.

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Routes

- `/`
- `/masterclasses`
- `/bootcamps`
- `/masterclasses/:slug`
- `/bootcamps/:slug`
- `/registration-success`
- `/become-instructor`
- `/contact`
- `*` graceful 404

## Deployment

The project includes `vercel.json` with an SPA fallback rewrite to `/index.html`. Import the repository into Vercel and use the default Vite build settings (`npm run build`, output directory `dist`).

## Notes

- Data is centralized in `src/data`.
- Registration is a frontend demo and passes selected course data through React Router route state.
- Thumbnail photography uses remote Unsplash URLs and requires network access to display.
