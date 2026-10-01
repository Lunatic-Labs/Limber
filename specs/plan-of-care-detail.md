# Spec: Plan of Care Detail View

Status: Draft (LIM-8) · Roles: Patient (primary), Physician · Depends on: nothing · Required by: messaging, attachments

## Purpose
The Plan of Care (POC) is the anchor for a single episode of care. The detail view is the shared page where a patient or physician opens one POC and sees its summary. Messaging and appointments hang off this page. The dashboards today only list POCs by title and status, so this spec adds the page they link to.

## Scope
**In:** a read-only POC summary page for each role, links from both dashboards, access control.
**Out:** creating or editing POCs (physician authoring is a separate spec), the calendar and appointment UI, admin views.

## User stories
- As a patient, I can open one of my plans of care to see its title, description, status, dates and physician.
- As a patient, I can reach that POC's message thread from its detail page.
- As a physician, I can open a plan of care for one of my patients and see the same summary plus the patient's name.
- As either role, I cannot open a POC that is not mine.

## Routes (proposed)
- `/patient/plans/[pocId]`
- `/physician/plans/[pocId]`
- Both sit behind the existing middleware and layout role checks. Loading the POC enforces ownership again.

## Acceptance criteria
1. The patient dashboard POC rows link to `/patient/plans/[pocId]`. Physician access to a patient's POCs is gated on an open question below.
2. The page shows title, description (or a "No description" placeholder), status (active, completed or archived), start date, end date (or "Ongoing") and the counterpart's name. A patient sees their physician and a physician sees the patient.
3. A patient may only load a POC where `plan_of_care.patient_user_id` is their own id. Otherwise the response is a 404.
4. A physician may only load a POC where `plan_of_care.physician_user_id` is their own id. Otherwise the response is a 404.
5. A nonexistent or malformed `pocId` returns a 404, not a 500.
6. Signed-out users are redirected to `/login` with a `callbackUrl`. A wrong-role user is redirected to `/`.
7. The page includes the message thread entry point (see `messaging.md`).
8. Completed and archived POCs are viewable. Whether they accept new messages is an open question.
9. The page is usable at phone width, because patients will mostly use it on their phone.

## Edge cases
- A POC whose physician differs from the patient's currently assigned physician (reassignment): the patient can still view it, and the physician shown is the POC's own physician.
- A patient with no POCs: the dashboard empty state is unchanged and no detail page is reachable.
- The user changes role or is deleted mid-session: the next request fails the role check.
- The `endDate` is earlier than `startDate`: render as stored. Validation belongs to the future authoring spec.
- Very long title or description wraps without breaking the layout.

## Tests to write first
**Unit / API (Vitest)**
- The ownership check returns the POC for its patient and for its physician.
- It returns not-found for another patient, another physician, an administrator, an unknown id and a non-UUID id.
- Date formatting handles a null `endDate`.

**E2E (Playwright)**
- `patient1` opens a seeded POC from the dashboard and sees the expected fields.
- `patient1` requesting another patient's POC gets a 404 page.
- A signed-out visit redirects to `/login?callbackUrl=...`.
- `physician1` is redirected away from `/patient/plans/...`.

## Open questions
1. Does the physician dashboard list POCs per patient? Today it lists only patients, so the physician route needs a patient to POC navigation step.
2. Can a physician open a patient's POCs from before a reassignment, or only POCs where they are the POC's physician? This spec assumes the latter.
3. Should completed or archived POCs be read-only for messaging?
4. Does the seed need richer sample data (several POCs across statuses) to test this?
