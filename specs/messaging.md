# Spec: Text Messaging and Chat History

Status: Draft (LIM-8) · Roles: Patient (primary), Physician · Depends on: `plan-of-care-detail.md` · Related: `attachments-camera.md`

## Purpose
Patients and their physician talk in-app between sessions. Each conversation is scoped to one Plan of Care (POC), so history stays grouped by episode of care. This spec covers text messages, persistent history and live delivery. Attachments are in `attachments-camera.md`.

## Scope
**In:** sending and reading text messages in a POC thread, persistent history with pagination, live delivery, access control.
**Out:** read receipts and unread counts (explicitly excluded in v1), editing or deleting messages, typing indicators, push or email notifications, SMS, message search.

## User stories
- As a patient, I can send a text message to my physician within a POC.
- As a patient, I can scroll back through the full history of that POC's conversation.
- As a patient, I see my physician's replies appear without refreshing the page.
- As a physician, I can do the same with each of my patients, one POC thread at a time.
- As either role, I can never read or post in a thread that isn't mine.

## Data
Uses the existing `message` table: `plan_of_care_id`, `sender_user_id`, `body`, `created_at`. `body` is nullable for attachment-only messages, but a text-only message must have a non-empty body. No schema change is expected for text.

## API (proposed Route Handlers)
- `GET /api/plans/[pocId]/messages?before=<cursor>&limit=<n>` returns messages newest first, with a cursor for older pages.
- `POST /api/plans/[pocId]/messages` takes `{ body }` and returns the created message.
- Both handlers verify the session, then verify the caller is the POC's patient or physician.
- Sender identity always comes from the session, never from the request body.

## Acceptance criteria
1. A patient or physician on a POC can post a text message. It is stored with the correct POC and sender and returned in the response.
2. A message body is trimmed. A body that is empty or whitespace-only is rejected with a 400 when there are no attachments.
3. A maximum body length is enforced, proposed 4,000 characters. Anything longer is rejected with a 400 and a clear error.
4. History shows messages in chronological order with sender name and timestamp. The sender's own messages are visually distinct.
5. History loads the latest page first (proposed 50) and loads older pages on request, with no duplicates or gaps across pages.
6. After a reload or a new session, previously sent messages are still there.
7. A new message from the other party appears in an open thread without a manual refresh, via Pusher.
8. Pusher channels are private and per POC. The channel auth endpoint only authorizes the POC's patient and physician.
9. If real-time delivery fails or is not configured, sending and reading still work through a normal fetch. Live updates are an enhancement, not a requirement for correctness.
10. A user who is not the POC's patient or physician gets a 404 on both `GET` and `POST`, and cannot subscribe to the channel.
11. Signed-out requests get a 401.
12. Message text is rendered as plain text (no HTML injection). Line breaks are preserved.

## Edge cases
- Two messages sent in the same instant keep a stable order (order by `created_at`, then `id`).
- Double-clicking send, or a retry after a network error, should not create duplicates. The client disables send while a request is in flight. An idempotency key is an open question.
- A message sent while the other party has the thread open and one sent while they don't both appear in history.
- Messages containing emoji, very long unbroken strings, `<script>` text and SQL-like text are stored and rendered literally.
- A patient reassigned to a new physician: the old POC thread stays tied to the old physician, and the new physician cannot see it.
- Sending to a completed or archived POC: see open question 2.
- A user's session expires while composing: the draft is kept and the user is sent back to sign in.
- An empty thread shows a friendly empty state, not a blank page.

## Tests to write first
**Unit / API (Vitest)**
- Create-message validation: empty, whitespace, over-length, valid, and unicode.
- The authorization helper for the patient, the physician, an unrelated patient, an unrelated physician and an administrator.
- Pagination cursor: ordering, no overlap between pages, and the last page returns no cursor.
- `POST` ignores any `senderUserId` supplied in the body.
- Pusher channel auth accepts members and rejects non-members.

**E2E (Playwright)**
- `patient1` sends a message and sees it in the thread. After a reload it is still there.
- `physician1`, in a second browser context, sees the message live and replies. `patient1` sees the reply.
- A patient cannot load another patient's thread.
- The thread is usable at phone width.

**Full suite:** per project policy, every run covers all existing specs, not only this one.

## Open questions
1. Is live delivery required at launch, or acceptable to ship polling first and add Pusher once the other developer provides the keys?
2. Can messages be sent on completed or archived POCs?
3. Do we want an idempotency key on `POST` for retry safety?
4. Maximum message length: is 4,000 characters right?
5. Should message timestamps display in the viewer's local timezone? This spec assumes yes.
