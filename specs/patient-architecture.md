# Spec: Patient Side Architecture

Status: Draft (LIM-8) · Roles: Patient · Depends on: nothing · Umbrella for: `plan-of-care-detail.md`, `messaging.md`, `attachments-camera.md`

## Purpose
Defines how the patient side of Limber is organised: routes, layout, data access, authorization and how the feature specs fit together. The feature specs own the behaviour. This one owns the structure they share.

## Scope
**In:** patient route map, layout and navigation, server/client split, data access and authorization rules, dev preview mode.
**Out:** physician-side structure, admin UI, mobile app (kept possible by the API rules below).

## Route map
| Route | Purpose | Spec |
|---|---|---|
| `/patient` | Dashboard: assigned physician, POC list | this spec |
| `/patient/plans/[pocId]` | POC detail, hosts the thread and appointments | `plan-of-care-detail.md` |
| `/patient/plans/[pocId]/messages` | Chat thread for the POC (may be a section of the detail page instead) | `messaging.md` |
| `/patient/plans/[pocId]/calendar` | Appointments for the POC (lightweight) | not yet specced |

Camera capture is a component inside the thread composer, not a route (`attachments-camera.md`).

## Layers
1. **Middleware** (`src/middleware.ts`): coarse gate. Signed-out goes to `/login`, wrong role goes to `/`.
2. **Layout** (`src/app/patient/layout.tsx`): re-checks the session and role server-side, renders the header.
3. **Pages**: server components that load data through query helpers, pass plain props to client components.
4. **Client components**: only where needed (composer, live thread, camera, sign-out). Everything else stays on the server.
5. **Route Handlers** (`src/app/api/...`): the only write path and the only path a future mobile app would use. They never trust the client for identity.

## Data access
- Reads for pages go through helper functions in `lib/patient/` (for example `getPatientDashboard(userId)`, `getPocForPatient(userId, pocId)`), not inline queries in pages. This gives one place to test and one place to swap for mock data.
- Every helper takes the patient's user id from the session and scopes by it.
- Authorization rule: a patient may access a POC only if `plan_of_care.patient_user_id` equals their id. Anything else returns 404 (not 403), so POC ids can't be probed.
- A patient only ever sees their own physician and their own POCs. No patient-to-patient visibility anywhere.

## Layout and navigation
- Header: product name, patient name, sign-out.
- Dashboard lists POCs, active first, each linking to its detail page.
- POC detail page has the summary at the top and the thread below. Calendar is a sibling tab once specced.
- Mobile first: patients use phones, so layouts are single column and touch friendly.

## States every page must handle
Loading, empty (no physician assigned, no POCs, no messages), not found (404), and error. Empty states use friendly copy, never a blank page.

## Dev preview mode (temporary)
Until the database is working, the patient screens can be viewed without signing in.
- Enabled only when `NODE_ENV !== "production"` and `NEXT_PUBLIC_DEV_PATIENT_PREVIEW=true` (see `lib/dev-preview.ts`, `.env.example`).
- Shows a "view patient screen" button on `/login`. Middleware and the patient layout skip auth, and the dashboard renders mock data. Header shows a "Dev preview" badge.
- Mock data lives in `lib/dev-preview.ts`. As each helper in `lib/patient/` lands, it should return mock data in preview mode so new screens are viewable too.
- Must be deleted once auth and the DB work. It must never be reachable in production.

## Acceptance criteria
1. A signed-out user visiting `/patient` is redirected to `/login` (preview off).
2. A physician or administrator visiting `/patient` is redirected to `/`.
3. A patient sees only their own physician and POCs.
4. A patient requesting another patient's POC gets a 404.
5. Each page renders a sensible empty and error state.
6. With preview on, the login button opens `/patient` with mock data and no DB call. With preview off, or in production, the button is absent and `/patient` still requires auth.

## Tests to write first
- Unit: patient POC authorization helper (owner, other patient, physician, admin, signed-out).
- Unit: dashboard helper returns only the caller's data.
- E2E: route gating for each role, preview-off.
- E2E: preview button visible and navigates only when the flag is set.

## Open questions
1. Is the thread its own route or a section of the POC detail page?
2. Is a single-physician "My care team" page needed, or is the physician name on the dashboard enough?
3. Navigation shape on mobile: top tabs or bottom bar?
4. Do we add a `Session`-style calendar spec next, or fold appointments into POC detail?
