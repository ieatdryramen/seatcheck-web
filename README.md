# SeatCheck Web

React + Vite frontend for the SeatCheck car seat lookup app.

Talks to the SeatCheck API at `https://seatcheck-api-production.up.railway.app` by default.

## Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:5173`. The app will hit the production API out of the box. To point at a local backend instead:

```bash
cp .env.example .env
# edit .env and set VITE_API_URL=http://localhost:3000
npm run dev
```

## Build

```bash
npm run build     # outputs to dist/
npm run preview   # serves the built app
```

## Deploy to Railway

From this directory:

1. Create a new service in the same Railway project as the API:
   - **New** → **GitHub Repo** → pick `seatcheck-web`
2. In **Variables** (optional — defaults to production API):
   - `VITE_API_URL` = `https://seatcheck-api-production.up.railway.app`
3. **Settings → Networking → Generate Domain**
4. Back on the API service: update `CORS_ORIGIN` to include the new web domain (comma-separated).

## Features

- Browse 30-seat catalog with live search and filters
- Tap-photo identification (OCR text input; camera coming)
- Seat profile: install steps, common mistakes, safety (recalls from NHTSA), specs
- Save seats with date of manufacture → expiration tracking + recall alerts
- Add children with weight/height → fit check across the full catalog
- Sign in/up; local-only browsing also works (data migrates on first sign-in)
- Native share with clipboard fallback

## Stack

- React 18 + Vite 5
- No global state library — `useState` + `localStorage` for anonymous, API for authed
- `lucide-react` icons
- Fonts: Fraunces (serif) + Inter Tight (sans), loaded from Google Fonts
