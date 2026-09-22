# Limber — Project Brief & Working Notes

## Purpose of this file
Running context for whoever (or whichever session) picks up work on Limber — captures decisions made, open questions, and where we are in the spec-driven process.

## Process
Staged, spec-driven approach: lock down vision/scope, then users, then functional detail (with acceptance criteria), then non-functional/scalability requirements, then technical architecture, then data/domain model — each stage documented before moving to the next.

## Status
- [x] Stage 1: Problem & Vision — complete (see constitution.md)
- [x] Stage 2: Users & Personas — complete (see constitution.md, "Users & Access Model")
- [x] Stage 3: Functional Scope — complete (see constitution.md, "v1 Scope")
- [x] Stage 4: Non-Functional / Scalability Requirements — complete (see constitution.md, "Non-Functional Requirements (v1)")
- [x] Stage 5: Technical Constraints & Preferences — complete (see constitution.md, "Technical Stack & Team")
- [x] Stage 6: Data & Domain Model — complete (see constitution.md, "Data & Domain Model (v1)")
- [x] Stage 7: Architecture (schema, API surface, app structure, auth) — complete
- [x] Database schema drafted (db/schema.ts, Drizzle) — see decisions below
- [x] Next.js project scaffolded (App Router, TypeScript, Tailwind, Drizzle client, Auth.js skeleton, Route Handlers) — see below
- [ ] Next: run `npm install`, `npm run db:push`, and `npm run db:seed` locally, then start building real features

## Decisions Log
- Core value prop: PT communication + POC tracking. (Motion-capture-based progress *assessment* is part of the long-term vision but is **out of v1 scope**.)
- HIPAA: deferred; sample data only for v1, but flag compliance-friendly architectural choices as we go.
- Roles: Patient and Physician only for v1 UI. One physician per patient; many patients per physician. No patient-to-patient interaction or visibility.
- **Administrator** added as a domain-model role in Stage 6 (oversees patient/physician interaction) — modeled at the data layer, but no admin UI in v1. Flagged below for confirmation since it wasn't part of earlier stages.
- Communication channel: in-app messaging (text, photos, videos, documents) with persistent chat history, scoped strictly to a patient's own physician.
- **Phone camera capture (Stage 6)**: patients capture photos/videos of themselves doing exercises directly via their phone camera in-app, to send as message attachments. This is a v1 feature. It is distinct from "motion-capture movement assessment" (automated analysis of that footage), which remains out of v1 — v1 only captures and sends the media, it does not analyze it.
- Testing philosophy: write test cases and edge-case coverage before implementing a feature; run the full suite against every new feature, not just the one being added.
- Scale target: v1 launches small/low-volume with sample data; long-term ambition is thousands of users; v1 shouldn't be architected in a way that blocks that.
- Availability/latency: no SLA or latency targets for v1; downtime is largely tolerable.
- Compliance: none required for v1 (sample data only, no real PHI).
- Budget: free-tier infrastructure for now (Vercel + Neon free tiers); scale-up is a known future need.
- Stack: Next.js (or comparable) on Vercel, Neon Postgres via Vercel, GitHub for source control.
- Team: 2 developers + 1 physician as clinical advisor (not coding).
- Domain entities (v1): Patient, Physician, Administrator, Plan of Care (POC, connects a Patient and Physician), Message, Attachment. Session/Appointment concepts exist via the calendars but aren't yet formalized as a distinct entity.
- External integrations: none required for v1, but architecture should stay open to adding them later (notifications, calendar sync, external storage, analytics, etc.).
- v2+ items that should shape v1 architecture (not to be built now, but not to be architected against):
  - Motion-capture movement assessment (analysis of exercise footage) — capturing/sending the footage itself IS in v1; analyzing it is not.
  - Mobile app — keep backend/API decoupled from a single (web) frontend.
  - Physician-configured exercise/reminder schedule.
  - Private physician-only notes on a patient.
  - Progress/recovery trend graphs from motion-capture data.
  - Eventual scale to thousands of users.
  - External integrations of any kind (kept open, none specified yet).

## Open Questions / Flags for Later Stages
- ~~Administrator role~~ — **confirmed**: model the role/relationship in v1 data layer, no admin UI in v1.
- ~~Phone-camera capture vs. motion-capture analysis~~ — **confirmed**: capturing/sending photos & videos via phone camera is in v1; automated movement analysis is not.
- What does "text" communication mean technically — in-app chat, SMS integration, or both? (Leaning in-app chat with rich media; confirm no SMS requirement.)
- Does "physician" mean licensed PT only, or could it include other care team roles later?
- Document/video/photo storage: size limits, retention policy, and storage backend on Vercel/Neon (Vercel Blob? external object storage?) — now relevant given phone-camera capture is confirmed for v1.
- Test strategy: what test framework(s)/tooling will be used to write acceptance tests ahead of features, compatible with Next.js.
- `Session`/`Appointment` entity: calendars imply sessions/appointments as a concept — should this be formalized as its own entity distinct from POC/Message in the schema design pass?
- No concrete launch/1yr/3yr numbers exist yet for users or data volume.

---
*Last updated entering Stage 7 (Architecture).*

## Stage 7 Decisions (Architecture)
- **Auth**: Auth.js (NextAuth)
- **ORM**: Drizzle
- **File/media storage**: Vercel Blob
- **API style**: Next.js Route Handlers
- **Messaging delivery**: live/real-time chat via **Pusher Channels** (managed pub/sub over Vercel Route Handlers). Ably noted as an equivalent fallback if Pusher's free tier ever doesn't fit (similar API shape, low switching cost).
- **Repo structure**: single Next.js app (frontend + API routes together)

Stage 7 (Architecture) is now complete. Full v1 stack: Next.js (single app) on Vercel, Neon Postgres via Drizzle ORM, Auth.js for authentication, Vercel Blob for file/media storage, Next.js Route Handlers for the API, Pusher Channels for live chat.


## Schema Design Decisions (db/schema.ts)
- **Plans of Care**: a Patient can have multiple POCs over their lifetime (sequential episodes of care), not just one ever. `plan_of_care` has its own status (active/completed/archived) and date range.
- **Messages**: tied to a specific `plan_of_care_id`, not just the patient-physician pair generally — keeps conversation history grouped by episode of care.
- **Appointments are intentionally lightweight**: sessions happen outside the app; physicians are not required to record structured session data (vitals, per-session clinical notes, etc.) in v1. The `appointment` table only exists to power the calendar views: scheduled time + status + a reschedule flag/note. Formalized as its own table (resolves the earlier open question about whether Session/Appointment needed its own entity — it does, but a minimal one).
- **Physician private notes about a patient** (mentioned by the user as a "later on" feature) is confirmed as v2+, not built into v1 schema — tracked already under Open Considerations for the Future in constitution.md.
- **No read receipts / unread tracking** in v1 `message` table.
- **Attachment constraints** (file type, size limits) are an app-level validation concern, not a schema concern — `attachment` table just stores the Vercel Blob URL + metadata.
- **Auth.js tables** (`user`, `account`, `session`, `verification_token`) follow the standard `@auth/drizzle-adapter` shape, with `role` added to `user` to distinguish Patient/Physician/Administrator at the identity level.
- **Role profile tables** (`patient_profile`, `physician_profile`, `administrator_profile`) keep role-specific fields off the auth-owned `user` table. `patient_profile.physician_user_id` records the patient's *currently assigned* physician (separate from each POC's own `physician_user_id`, which preserves history if a patient is ever reassigned).


## Project Scaffold (Next.js)
Hand-authored (this session's npm registry access is blocked by org egress policy, same as GitHub push — see below), so nothing has been `npm install`ed or built/tested yet. Structure:
- `package.json` — Next.js 15, React 19, TypeScript, Tailwind, Drizzle ORM + drizzle-kit, `@neondatabase/serverless`, `next-auth` v5 (beta) + `@auth/drizzle-adapter`, `@vercel/blob`, `pusher` + `pusher-js`
- `src/app/` — App Router; `src/app/page.tsx` is a placeholder home page
- `src/app/api/health/route.ts` — liveness check Route Handler (`/api/health`), useful to confirm a Vercel deploy is actually serving traffic
- `src/app/api/auth/[...nextauth]/route.ts` — wires Auth.js's handlers into a Route Handler
- `auth.ts` — Auth.js config using the Drizzle adapter, with a **Credentials (username/password) provider** wired up and working: `authorize()` looks up the user by username, verifies the bcrypt-hashed password, and JWT sessions (required for Credentials) carry `role`/`id`. Email magic-link is still a planned **follow-up**, not built.
- `lib/password.ts` — bcrypt hash/verify helpers.
- `src/app/login/page.tsx` — username/password sign-in form (client component, calls Auth.js's `signIn("credentials", ...)`).
- `db/seed.ts` — creates one test Physician (`physician1`/`changeme123`) and one test Patient (`patient1`/`changeme123`), already linked to each other, via `npm run db:seed`. No self-serve signup page exists yet — accounts are seeded or inserted directly for now.
- `next-auth.d.ts` — type augmentation so `session.user.role` and `session.user.id` are properly typed
- `db/index.ts` — Drizzle client (neon-http driver), reads `DATABASE_URL`
- `drizzle.config.ts` — drizzle-kit config, points at `db/schema.ts`
- `.env.example` — documents every env var the app needs (`DATABASE_URL`, `AUTH_SECRET`, Blob token, Pusher keys)
- `GETTING_STARTED.md` — local dev setup + step-by-step Vercel deploy instructions (Neon integration, Blob store, Pusher env vars)
- Vercel-readiness: no `vercel.json` needed — Vercel auto-detects Next.js from `package.json`. The main manual setup steps on Vercel are: add the Neon integration, add a Blob store, and set `AUTH_SECRET` + Pusher env vars by hand (documented in GETTING_STARTED.md).

### Known gaps (not yet done)
- Dependencies have never actually been installed or built in this session — this session's network can't reach `registry.npmjs.org` (blocked by org egress policy, exactly like the GitHub push block). **Run `npm install` and `npm run build` locally as a first sanity check** before assuming everything compiles cleanly.
- No actual UI/pages beyond the placeholder home page, health check, and login form — nothing role-gated (e.g. a physician-only dashboard) exists yet; `role` is on the session but nothing checks it.
- No self-serve signup flow — accounts are created via `db/seed.ts` or direct DB inserts.
- Email magic-link sign-in is a confirmed follow-up, not built in v1.
- Schema has not yet been pushed to a real Neon database (`npm run db:push`, once `DATABASE_URL` is set), and the two test accounts haven't been seeded anywhere yet (`npm run db:seed`).


## Auth Decision (Stage 7 follow-up)
- **v1 auth is username + password** (Auth.js Credentials provider), not email magic link. Confirmed by the user; email magic link is explicitly deferred as a follow-up.
- Schema change: `user` table gained `username` (unique, required) and `passwordHash` (nullable — allows a future email/OAuth-only user with no password). `email` was relaxed from required to optional/unique, to leave room for magic-link later without another migration.
- Passwords are bcrypt-hashed (`lib/password.ts`), never stored or logged in plaintext.
- Credentials provider forces **JWT sessions** (NextAuth requirement — a Credentials sign-in has no OAuth account for the adapter to hang a database session off of). `role` and `id` are carried on the JWT and exposed via the `session` callback.
- Two test accounts are seeded via `db/seed.ts` (`npm run db:seed`): `physician1`/`changeme123` and `patient1`/`changeme123`, already linked (patient assigned to that physician). These are placeholder credentials for local/dev use only — must be changed or removed before any real data touches the app.
