# Deployment Guide — Exam Hall Arrangement System

This guide shows one recommended free-tier deployment setup:
- Frontend: Vercel (static React app built with Vite)
- Backend: Fly.io (Node.js/Express)
- Database: PlanetScale (MySQL-compatible serverless)

It also shows the required environment variables and example commands.

---

## 1) Prepare the repo

Ensure your code is committed and pushed to GitHub. The frontend folder contains the Vite React app, and the backend folder contains the Node server.

## 2) Create and initialize the database (PlanetScale)

1. Sign up / log in to PlanetScale: https://planetscale.com
2. Create a new database and note the name.
3. Install the PlanetScale CLI (pscale) and login:

   ```bash
   # macOS / Linux (see docs for Windows)
   brew install planetscale/tap/pscale
   pscale auth login
   ```

4. Create a branch (main) and open a secure local tunnel to run the schema:

   ```bash
   pscale connect <your-db-name> main --port 3309
   # In another shell run (using the tunnel):
   mysql -h 127.0.0.1 -P 3309 -u <username> -p < db/schema.sql
   ```

   Follow PlanetScale docs for connection details and recommended workflow.

> Note: PlanetScale requires TLS. We configure the backend to support SSL via `DB_SSL=true`.

## 3) Deploy the backend to Fly.io

1. Install flyctl: https://fly.io/docs/getting-started/installing-flyctl/
2. Login and create app from the `backend/` directory:

   ```bash
   cd backend
   flyctl launch
   # follow prompts to create app; it generates fly.toml
   ```

3. Set secrets (DB credentials + optional API key):

   ```bash
   flyctl secrets set \
     DB_HOST=<your-db-host> \
     DB_USER=<your-db-user> \
     DB_PASSWORD='<your-db-password>' \
     DB_NAME=<your-db-name> \
     DB_PORT=<your-db-port> \
     DB_SSL=true \
     ADMIN_API_KEY='<some-random-secret>' \
     FRONTEND_URL='https://your-vercel-app.vercel.app'
   ```

4. Deploy:

   ```bash
   flyctl deploy
   ```

5. Note your backend URL printed by Fly (e.g. `https://your-app.fly.dev`).

## 4) Deploy frontend to Vercel

1. Push your repository to GitHub.
2. Import project into Vercel and point to the `frontend/` directory as the root.
3. Set environment variables in Vercel (Project Settings -> Environment Variables):

   - `VITE_API_URL` = `https://your-backend.fly.dev`

4. Build & deploy. Vercel will run `npm run build` in `frontend/` and publish the site. Visit the assigned domain.

## 5) CORS & Security

- Backend uses `FRONTEND_URL` to restrict CORS in production. Set `FRONTEND_URL` to the Vercel URL.
- Protect sensitive endpoints using `ADMIN_API_KEY` (header `x-api-key`) or via session tokens (the app issues session tokens upon login).
- For production, replace plaintext admin password handling with bcrypt and move to JWT or persistent sessions.

## 6) Environment variables reference

Backend (Fly/Railway/Render):
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` — DB connection
- `DB_SSL` — set to `true` for PlanetScale
- `ADMIN_API_KEY` — secret for scripts (optional)
- `FRONTEND_URL` — Vercel app URL (restrict CORS)
- `SESSION_TTL_MS` — optional session TTL in ms

Frontend (Vercel):
- `VITE_API_URL` — base URL of backend (e.g. `https://your-backend.fly.dev`)

## 7) Quick troubleshooting

- If the frontend cannot reach the backend, confirm `VITE_API_URL` is correct and that backend is reachable.
- Check backend logs: `flyctl logs`.
- If DB connection fails, verify credentials and that `DB_SSL` is set when required.

---

If you want, I can:
- Add a `vercel.json` with redirects/rewrite rules.
- Add a `fly.toml` template tuned for this project.
- Create a small script to run schema.sql using `pscale connect` instructions.

*** End of guide ***
