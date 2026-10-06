// Attachment types, limits and validation shared by the upload API,
// the messages API and the chat UI. Keep this file free of
// server-only imports (db, auth, blob).

export type AttachmentKind = "photo" | "video" | "document";

const MB = 1024 * 1024;

export const ATTACHMENT_LIMITS: Record<AttachmentKind, number> = {
  photo: 10 * MB,
  video: 100 * MB,
  document: 25 * MB,
};

export const MAX_ATTACHMENTS_PER_MESSAGE = 5;
export const FILE_NAME_MAX_LENGTH = 255;

// Explicit allowlist. SVG and HTML are deliberately absent: they can
// carry scripts and would be served from the blob domain.
const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const PHOTO_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime", // iPhone .mov
  "video/webm",
  "video/3gpp",
]);

export const ALLOWED_MIME_TYPES = [
  ...PHOTO_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
  ...DOCUMENT_MIME_TYPES,
];

// Value for <input type="file" accept="...">.
export const FILE_INPUT_ACCEPT = ALLOWED_MIME_TYPES.join(",");

export function classifyMime(mime: string): AttachmentKind | null {
  const base = mime.split(";")[0].trim().toLowerCase();
  if (PHOTO_MIME_TYPES.has(base)) return "photo";
  if (VIDEO_MIME_TYPES.has(base)) return "video";
  if (DOCUMENT_MIME_TYPES.has(base)) return "document";
  return null;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateFileForUpload(file: {
  type: string;
  size: number;
}): Result<AttachmentKind> {
  const kind = classifyMime(file.type);
  if (!kind) return { ok: false, error: "This file type isn't supported" };
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, error: "File is empty" };
  }
  if (file.size > ATTACHMENT_LIMITS[kind]) {
    return {
      ok: false,
      error: `File is too large (max ${Math.round(ATTACHMENT_LIMITS[kind] / MB)} MB for ${kind}s)`,
    };
  }
  return { ok: true, value: kind };
}

// All blobs for a plan live under this pathname prefix, which lets the
// server check that an attachment really was uploaded for that plan.
export function attachmentPathPrefix(planOfCareId: string): string {
  return `plans/${planOfCareId}/`;
}

export type AttachmentInput = {
  url: string;
  fileName: string;
  mimeType: string;
  size: number;
};

export type ValidAttachment = AttachmentInput & { kind: AttachmentKind };

// Validates an attachment reference sent by the client when posting a
// message. The client uploads straight to Vercel Blob, so the server
// must not trust the URL: it has to be an https Vercel Blob URL under
// this plan's prefix.
export function validateAttachmentInput(
  raw: unknown,
  planOfCareId: string
): Result<ValidAttachment> {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Invalid attachment" };
  }
  const { url, fileName, mimeType, size } = raw as Record<string, unknown>;

  if (typeof url !== "string") return { ok: false, error: "Invalid attachment URL" };
  if (typeof fileName !== "string" || !fileName.trim() || fileName.length > FILE_NAME_MAX_LENGTH) {
    return { ok: false, error: "Invalid file name" };
  }
  if (typeof mimeType !== "string") return { ok: false, error: "Invalid file type" };
  if (typeof size !== "number") return { ok: false, error: "Invalid file size" };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: "Invalid attachment URL" };
  }
  const prefix = `/${attachmentPathPrefix(planOfCareId)}`;
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".blob.vercel-storage.com") ||
    !parsed.pathname.startsWith(prefix)
  ) {
    return { ok: false, error: "Invalid attachment URL" };
  }

  const file = validateFileForUpload({ type: mimeType, size });
  if (!file.ok) return file;

  return {
    ok: true,
    value: { url, fileName: fileName.trim(), mimeType, size, kind: file.value },
  };
}

// Where the browser loads an attachment from. Files live in a private
// Blob store, so every view goes through this authenticated route.
export function attachmentDownloadPath(
  planOfCareId: string,
  attachmentId: string
): string {
  return `/api/plans/${planOfCareId}/attachments/${attachmentId}`;
}

// Response headers for serving an attachment. Photos and videos show
// inline; documents always download. `nosniff` stops browsers from
// guessing a more dangerous type than the one we validated.
export function attachmentContentHeaders(a: {
  kind: AttachmentKind;
  mimeType: string;
  fileName: string;
}): Record<string, string> {
  const disposition = a.kind === "document" ? "attachment" : "inline";
  // Plain-ASCII fallback with no quotes/control chars, plus the real
  // name percent-encoded (RFC 5987).
  const ascii = a.fileName.replace(/[^\x20-\x7e]|["\;]/g, "_");
  const encoded = encodeURIComponent(a.fileName).replace(
    /['()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
  return {
    "Content-Type": a.mimeType,
    "Content-Disposition": `${disposition}; filename="${ascii}"; filename*=UTF-8''${encoded}`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  };
}
