# Getting Started

## Local development

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` (a Neon connection string) and `AUTH_SECRET` (generate with `npx auth secret`). Blob/Pusher vars can stay blank until you build those features.
3. Push the schema to your database: `npm run db:push`
4. Create test accounts to log in with: `npm run db:seed` — creates one Physician (`physician1` / `changeme123`) and one Patient (`patient1` / `changeme123`), already linked to each other. Change these credentials (or re-seed with different ones) before this ever touches real users.
5. `npm run dev`, open http://localhost:3000/login, and sign in as either test account. `/api/health` should return `{"status":"ok"}`.

## Auth

v1 uses **username + password** (Auth.js Credentials provider, `auth.ts`), not email/OAuth. Passwords are hashed with bcrypt (`lib/password.ts`) before being stored — never store or log a plaintext password. There's no self-serve signup page yet; accounts are created via `db/seed.ts` or directly in the database for now. Email magic-link sign-in is a planned follow-up (tracked in `claude.md`), not built in v1.

## Deploying to Vercel

Vercel auto-detects Next.js from `package.json`, so a default deploy needs no extra config. Steps:

1. Push this repo to GitHub (already done) and import it in the Vercel dashboard (New Project -> import `Lunatic-Labs/Limber`).
2. **Database**: in the Vercel project, add the **Neon** integration (Storage tab -> Connect Database -> Neon). This provisions `DATABASE_URL` automatically for all environments.
3. **Auth.js**: set `AUTH_SECRET` in Project Settings -> Environment Variables. Generate one locally with `npx auth secret` and paste the value in (don't commit it).
4. **File storage**: add a **Blob** store from the Storage tab; it sets `BLOB_READ_WRITE_TOKEN` automatically.
5. **Real-time chat**: create a free Pusher Channels app at pusher.com, then set `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `NEXT_PUBLIC_PUSHER_KEY`, and `NEXT_PUBLIC_PUSHER_CLUSTER` in Project Settings -> Environment Variables.
6. Deploy. Every push to `main` redeploys automatically; every PR gets a preview deployment.
7. After schema changes, run `npm run db:push` against the Neon database (locally, pointed at the Vercel-provisioned `DATABASE_URL`) to apply it — this project doesn't run migrations automatically as part of the Vercel build.
8. Run `npm run db:seed` (pointed at the same `DATABASE_URL`) once, to create the two test accounts, or insert real accounts by hand.

## Project layout

- `src/app/` — Next.js App Router pages and layouts
- `src/app/login/` — username/password sign-in page
- `src/app/api/` — Route Handlers (the API layer)
- `db/schema.ts` — Drizzle schema (source of truth for the database)
- `db/index.ts` — Drizzle client, reads `DATABASE_URL`
- `db/seed.ts` — creates the two test accounts (`npm run db:seed`)
- `drizzle.config.ts` — config for `drizzle-kit` (schema push/generate/studio)
- `auth.ts` — Auth.js config (Credentials provider, username/password)
- `lib/password.ts` — bcrypt hashing/verification helpers
