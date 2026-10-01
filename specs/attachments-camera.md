# Spec: Attachments and In-App Camera Capture

Status: Draft (LIM-8) · Roles: Patient (primary), Physician · Depends on: `messaging.md` · Blocked on: Vercel Blob token from the other developer

## Purpose
Patients and physicians can send photos, videos and documents in a POC thread. Patients can capture photos and videos directly from their phone camera inside the app, for example recording an exercise attempt. v1 only captures and sends media. It does not analyze it, because motion-capture assessment is out of v1.

## Scope
**In:** attaching files to a message, in-app camera capture on mobile browsers, upload to Vercel Blob, display and download in the thread, file validation.
**Out:** any analysis of video, thumbnails and transcoding (open question), deleting attachments, retention policy, virus scanning, a gallery view across a POC.

## User stories
- As a patient, I can attach a photo, video or document from my device to a message.
- As a patient on my phone, I can open the camera from the message composer, record or take a picture, preview it and send it.
- As a physician, I can view and download what my patient sent, and send documents back (for example exercise handouts).
- As either role, I can send an attachment with a caption or with no text.

## Data
Uses the existing `attachment` table: `message_id`, `kind`, `blob_url`, `file_name`, `mime_type`, `file_size_bytes`. Type and size limits are enforced in the app layer, not the schema.
Concern: `blob_url` stores a Blob URL. Blob URLs can be public by default, so access control must be decided (open question 1) before real patient media is used.

## Proposed limits (to confirm)
- Photos: JPEG, PNG, HEIC, WebP, up to 10 MB.
- Videos: MP4 and MOV (WebM if the capture API produces it), up to 100 MB.
- Documents: PDF, plus DOCX and plain text if wanted, up to 10 MB.
- Up to 5 attachments per message.
- Validation uses the declared MIME type and the file extension, with a server-side check, not only the client.

## API (proposed)
- `POST /api/plans/[pocId]/attachments/upload` issues a client-upload token for Vercel Blob after checking the session, POC membership and the declared type and size.
- `POST /api/plans/[pocId]/messages` (from `messaging.md`) accepts `{ body?, attachments: [{ blobUrl, fileName, mimeType, fileSizeBytes }] }`. The server re-validates each attachment and creates the `message` and `attachment` rows in one transaction.
- Uploading directly to Blob avoids Vercel's serverless request-size limit for large videos.

## Acceptance criteria
1. A user can pick one or more files, see a preview or filename and size chips in the composer, remove any before sending, and send.
2. A message may have attachments only, text only, or both. A message with neither is rejected.
3. `kind` (photo, video or document) is derived from the validated MIME type, never trusted from the client.
4. Disallowed types and oversize files are rejected before upload with a clear message. The server rejects them too if the client check is bypassed.
5. On a phone, a "Take photo or video" control opens the device camera, using `<input type="file" accept="image/*,video/*" capture>` as the baseline and `getUserMedia` as a possible enhancement. After capture the user sees a preview and can retake or send.
6. If camera permission is denied or no camera exists, the user sees a clear explanation and can still attach from files.
7. An upload shows progress and can be cancelled. A failed upload keeps the draft and offers a retry. No message row is created if any upload fails.
8. The thread shows images inline, videos in a player with controls, and documents as a named download link with size.
9. Attachments are only reachable by the POC's patient and physician (see open question 1). Another patient or physician must not be able to authorize an upload to, or read from, the POC.
10. Upload requests for a POC the caller doesn't belong to are rejected. Signed-out requests get a 401.
11. Attachment-only messages deliver live the same way text does.
12. Orphaned blobs, where the upload succeeded but the message was never sent, are possible. The spec requires that this is acknowledged. Cleanup is out of scope for v1 (open question 4).

## Edge cases
- A file with a misleading extension or MIME type (for example `.pdf` containing an executable) is rejected or sniffed server-side.
- A zero-byte file is rejected.
- A filename with unicode, spaces, path separators or very long length is sanitized for display and storage.
- HEIC photos from iPhones may not render in every browser. Decide whether to convert or show a download fallback.
- Large video on a slow mobile connection: progress is visible and the page survives backgrounding. Resumability is out of scope.
- iOS Safari and Android Chrome handle `capture` differently. Both are tested manually.
- Sending the same file twice creates two attachments.
- Duplicate submits do not create duplicate messages (same concern as `messaging.md`).
- Camera capture over plain HTTP is blocked by browsers. Local testing needs `localhost` or HTTPS.

## Tests to write first
**Unit / API (Vitest)**
- MIME-to-kind mapping for every allowed and disallowed type.
- Size limits at the boundary (limit, limit + 1 byte, zero).
- Filename sanitization.
- Authorization for upload token requests, for members and non-members.
- Message creation with attachments is transactional: a failed attachment insert leaves no message row.
- Vercel Blob is mocked in tests. No real token is needed.

**E2E (Playwright)**
- Attach a small image and a PDF, send, and see both rendered in the thread.
- Reject an oversize or disallowed file with a visible error.
- Camera path using Playwright's fake media stream and file chooser on a mobile-viewport project.
- The other role sees the attachment.

**Manual (cannot be automated reliably)**
- Real phone camera capture on iOS Safari and Android Chrome.

## Open questions
1. Access control: are public Blob URLs acceptable for v1 sample data, or should media be served through an authenticated route? This is a privacy-by-design point from the constitution and will matter for HIPAA later.
2. Limits: confirm the sizes and types above, especially the 100 MB video cap against the Blob free tier.
3. Should iPhone HEIC be converted, and videos transcoded or thumbnailed? This spec assumes no for v1.
4. Retention and orphaned-blob cleanup: defer, or add a simple cleanup job?
5. Can the physician also capture with a camera, or only attach existing files? This spec assumes both can attach, and capture is a patient-focused feature.
