# jokubot marketing site

Public landing page for jokubot. Sign-in, signup, docs, and the business workspace stay on the app origin (`VITE_APP_ORIGIN`).

This repository has no API, database, or deploy internals.

## Local

```bash
cp .env.example .env
npm install
npm run dev
```

Dev server is `http://127.0.0.1:5174`. CTAs go to `VITE_APP_ORIGIN` (default `https://jokubot.com`).

Point at a local app instead:

```
VITE_APP_ORIGIN=http://127.0.0.1:5173
```

## Build

```bash
npm run build
npm run preview
```

GitHub Pages for this repo uses `VITE_BASE=/jokubot-www/`. A custom domain at the site root should set `VITE_BASE=/` (repository variable `VITE_BASE`).

## Layout

| Path | Role |
| --- | --- |
| `src/Landing.tsx` | Page |
| `src/styles.css` | Tokens + landing |
| `src/i18n.ts` | EN / FR copy |
| `src/config.ts` | App origin helpers |

Keep the red accent sparse. Do not add new fonts, pills on chrome, or marketing filler copy.
