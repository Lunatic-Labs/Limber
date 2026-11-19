# Getting Started

## Prerequisites

- **Node.js 20.9 or newer** (required by `package.json` / Next.js 16) and npm
- **Git**, with access to `Lunatic-Labs/Limber` on GitHub
- A **Neon** Postgres database (free tier is fine) — your own branch for local dev
- Optional, for the features that use them:
  - **Vercel Blob** token — message attachments (photos, videos, documents)
  - **Pusher Channels** app — live chat
  - **Resend** API key — emailing invite links

## Local development

1. `git clone` the repo, then `npm install`.
2. Copy `.env.example` to `.env.local` and fill it in:
   - **Required:** `DATABASE_URL` (a Neon connection string) and `AUTH_SECRET` (generate with `npx auth secret`).
   - **`BLOB_READ_WRITE_TOKEN`** — without it, attachment uploads fail; text chat still works.
   - **`PUSHER_*` and `NEXT_PUBLIC_PUSHER_*`** — without them, chat isn't live: the UI falls back to checking for new messages every 4 seconds.
   - **`RESEND_API_KEY` and `EMAIL_FROM`** — without them, invites aren't emailed; the admin page shows the invite link to copy instead.
   - **`APP_URL`** — base URL used in invite links; defaults to the request's origin, so it can stay blank locally.
3. Create the tables: `npm run db:push`.
4. Create test data: `npm run db:seed`. This creates three accounts, all with password `changeme123`:
   - `physician1` (Physician)
   - `patient1` (Patient, assigned to `physician1`)
   - `admin1` (Administrator)

   plus a sample plan of care between `physician1` and `patient1` with 3 messages. The seed is safe to re-run: existing accounts and plans are left alone. These are dev-only credentials — never use them with real users.
5. `npm run dev`, open http://localhost:3000/login, and sign in as any test account. `/api/health` should return `{"status":"ok"}`.

Tip: use two browsers (or one normal + one private window) to be the physician and the patient at the same time.

**After pulling changes:** if `db/schema.ts` changed, run `npm run db:push` again. Several features add tables or columns (`user_preferences`, `invitation`, `plan_of_care.diagnosis`, `user.deleted_at`), and the app errors if your database is behind.

## Useful scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server on http://localhost:3000 |
| `npm test` | Run the unit tests in `tests/` (`node:test` via tsx). Run the full suite before every PR. |
| `npm run lint` | Run ESLint |
| `npm run build` | Production build — a good sanity check before opening a PR |
| `npm run db:push` | Apply `db/schema.ts` to the database in `DATABASE_URL` |
| `npm run db:studio` | Open Drizzle Studio to browse and edit database rows |
| `npm run db:seed` | Create the test accounts and sample plan |

## Accounts and auth

- Sign-in is **username + password** (Auth.js Credentials provider, `auth.ts`) with JWT sessions that carry the user's `role` and `id`. Passwords are bcrypt-hashed (`lib/password.ts`) — never store or log a plaintext password.
- **New accounts are created by invitation.** An administrator invites someone by email at `/admin` (choosing their role, and a physician for patient invites). The invitee opens `/onboarding/<token>`, sets their name and password, and is signed in. Their username is their email (case-insensitive). Invite links expire after 7 days.
- Administrators can also reassign a patient's physician and delete users from `/admin`. Deleted users can't sign in, and their existing sessions end on the next request.
- Email magic-link sign-in is a planned follow-up, not built.

## Deploying to Vercel

Vercel auto-detects Next.js from `package.json`, so no `vercel.json` is needed.

1. Import the repo in the Vercel dashboard (New Project -> import `Lunatic-Labs/Limber`).
2. **Database:** Storage tab -> Connect Database -> **Neon**. This sets `DATABASE_URL` for all environments.
3. **File storage:** Storage tab -> add a **Blob** store. This sets `BLOB_READ_WRITE_TOKEN`.
4. **Auth.js:** set `AUTH_SECRET` in Project Settings -> Environment Variables (generate with `npx auth secret`; don't commit it).
5. **Real-time chat:** create a free Pusher Channels app at pusher.com, then set `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `NEXT_PUBLIC_PUSHER_KEY` and `NEXT_PUBLIC_PUSHER_CLUSTER`.
6. **Invite emails (optional):** set `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `Limber <no-reply@yourdomain>`) and `APP_URL` (the deployed site's URL, so invite links point at it).
7. Deploy. Every push to `main` redeploys production; every PR gets a preview deployment.
8. **Schema changes are not applied by the Vercel build.** After a schema change, run `npm run db:push` from your machine against the Vercel-provisioned database: put that `DATABASE_URL` in your shell (or temporarily in `.env.local`) for the command.
9. On a fresh database, run `npm run db:seed` the same way once to create the three test accounts, or create an admin account by hand and invite everyone else.

## Project layout

- `src/app/` — Next.js App Router pages and layouts
  - `login/` — sign-in page
  - `onboarding/[token]/` — account creation from an invite link (public)
  - `admin/`, `physician/`, `patient/` — role dashboards; `plans/[id]` is a plan's chat, `plans/[id]/details` its details, `physician/plans/new` creates a plan
  - `settings/` — accessibility preferences (all roles)
  - `api/` — Route Handlers (the API layer): `plans`, `plans/[id]/messages`, `plans/[id]/attachments`, `plans/[id]/archive`, `preferences`, `admin/*`, `onboarding/[token]`, `pusher/auth`, `auth/[...nextauth]`, `health`
- `src/middleware.ts` — redirects signed-out users to `/login` and wrong-role users to `/` for `/physician`, `/patient` and `/admin`
- `src/components/` — UI: `chat/`, `plans/`, `admin/`, `settings/`, `onboarding/`, shared primitives in `ui/`, and the signed-in shell `app-shell.tsx`
- `lib/` — business logic. `*-shared.ts` files hold pure rules and validation (no database access, unit-tested); the others do the database work (e.g. `chat.ts#getPlanForUser`, the single access check for everything chat-related)
- `tests/` — unit tests for the `lib/` rules
- `db/schema.ts` — Drizzle schema (source of truth for the database)
- `db/index.ts` — Drizzle client, reads `DATABASE_URL`
- `db/seed.ts` — test accounts and sample plan (`npm run db:seed`)
- `drizzle.config.ts` — drizzle-kit config (loads `.env.local` itself)
- `auth.ts` / `auth.config.ts` — Auth.js config (`auth.config.ts` is the edge-safe part used by the middleware)
- `claude.md` / `constitution.md` — design decisions, scope and working notes
