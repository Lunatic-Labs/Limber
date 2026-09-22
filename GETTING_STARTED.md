# Getting Started

## Local development

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` at minimum (a Neon connection string — see below). The other variables (Auth.js secret, Blob, Pusher) can stay blank until you wire up those features.
3. Push the schema to your database: `npm run db:push`
4. `npm run dev` and open http://localhost:3000 — `/api/health` should return `{"status":"ok"}`.

## Deploying to Vercel

Vercel auto-detects Next.js from `package.json`, so a default deploy needs no extra config. Steps:

1. Push this repo to GitHub (already done) and import it in the Vercel dashboard (New Project -> import `Lunatic-Labs/Limber`).
2. **Database**: in the Vercel project, add the **Neon** integration (Storage tab -> Connect Database -> Neon). This provisions `DATABASE_URL` automatically for all environments.
3. **Auth.js**: set `AUTH_SECRET` in Project Settings -> Environment Variables. Generate one locally with `npx auth secret` and paste the value in (don't commit it).
4. **File storage**: add a **Blob** store from the Storage tab; it sets `BLOB_READ_WRITE_TOKEN` automatically.
5. **Real-time chat**: create a free Pusher Channels app at pusher.com, then set `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `NEXT_PUBLIC_PUSHER_KEY`, and `NEXT_PUBLIC_PUSHER_CLUSTER` in Project Settings -> Environment Variables.
6. Deploy. Every push to `main` redeploys automatically; every PR gets a preview deployment.
7. After the schema changes, run `npm run db:push` against the Neon database (locally, pointed at the Vercel-provisioned `DATABASE_URL`) to apply it — this project doesn't run migrations automatically as part of the Vercel build.

## Project layout

- `src/app/` — Next.js App Router pages and layouts
- `src/app/api/` — Route Handlers (the API layer)
- `db/schema.ts` — Drizzle schema (source of truth for the database)
- `db/index.ts` — Drizzle client, reads `DATABASE_URL`
- `drizzle.config.ts` — config for `drizzle-kit` (schema push/generate/studio)
- `auth.ts` — Auth.js config (provider still needs to be chosen and wired up)
