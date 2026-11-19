// Types and pure helpers for the conversation details screen (LIM-19):
// tabs, media paging and display labels. Keep this file free of
// server-only imports (db, auth, blob).

import type { AttachmentKind } from "./attachments-shared";
import type { ChatAttachment } from "./chat-shared";

export const DETAILS_TABS = ["info", "media", "documents"] as const;
export type DetailsTab = (typeof DETAILS_TABS)[number];

export const DEFAULT_MEDIA_PAGE_SIZE = 30;
export const MAX_MEDIA_PAGE_SIZE = 60;

// One file in the Media / Documents tabs.
export type MediaItem = ChatAttachment & {
  senderUserId: string;
  createdAt: string; // ISO 8601
};

export type MediaPage = {
  items: MediaItem[];
  nextCursor: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;

export function parseDetailsTab(value: unknown): DetailsTab {
  return DETAILS_TABS.find((t) => t === value) ?? "info";
}

export function kindsForTab(tab: DetailsTab): AttachmentKind[] {
  if (tab === "media") return ["photo", "video"];
  if (tab === "documents") return ["document"];
  return [];
}

// ---------- paging ----------

// Position in a newest-first list. Rows are ordered by (createdAt, id)
// so rows created in the same instant are neither skipped nor repeated.
export type MediaCursor = { createdAt: string; id: string };

export function encodeCursor(cursor: MediaCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString("base64url");
}

// Cursors come from the query string, so anything malformed is just
// "no cursor" rather than an error.
export function decodeCursor(value: unknown): MediaCursor | null {
  if (typeof value !== "string" || value === "") return null;
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8")
    );
    if (typeof parsed !== "object" || parsed === null) return null;
    const { createdAt, id } = parsed as Record<string, unknown>;
    if (typeof createdAt !== "string" || !ISO_RE.test(createdAt)) return null;
    const ms = Date.parse(createdAt);
    if (Number.isNaN(ms)) return null;
    // Date.parse rolls impossible dates (Feb 30) over instead of rejecting
    // them, and Postgres would reject the original string.
    if (new Date(ms).toISOString().slice(0, 19) !== createdAt.slice(0, 19)) {
      return null;
    }
    if (typeof id !== "string" || !UUID_RE.test(id)) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

// True if `row` sits after `cursor` in newest-first order.
export function isAfterCursor(row: MediaCursor, cursor: MediaCursor): boolean {
  const a = Date.parse(row.createdAt);
  const b = Date.parse(cursor.createdAt);
  if (a !== b) return a < b;
  return row.id < cursor.id;
}

export function parseLimit(value: unknown): number {
  if (typeof value !== "string" || value.trim() === "") {
    return DEFAULT_MEDIA_PAGE_SIZE;
  }
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return DEFAULT_MEDIA_PAGE_SIZE;
  return Math.min(n, MAX_MEDIA_PAGE_SIZE);
}

// `rows` is a newest-first query result of up to `limit + 1` rows; the
// extra row only tells us another page exists.
export function buildPage<T extends MediaCursor>(
  rows: T[],
  limit: number
): { items: T[]; nextCursor: string | null } {
  const items = rows.slice(0, limit);
  const last = items[items.length - 1];
  const nextCursor =
    rows.length > limit && last
      ? encodeCursor({ createdAt: last.createdAt, id: last.id })
      : null;
  return { items, nextCursor };
}

// ---------- labels ----------

export function formatDuration(seconds: number | null | undefined): string | null {
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 1) {
    return null;
  }
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function senderLabel({
  senderUserId,
  currentUserId,
  otherName,
}: {
  senderUserId: string;
  currentUserId: string;
  otherName: string;
}): string {
  return senderUserId === currentUserId ? "You" : otherName;
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

// Plan dates are stored as calendar dates, so they're formatted in UTC.
export function formatPlanDateRange(start: Date, end: Date | null): string {
  return `${dateFormat.format(start)} – ${end ? dateFormat.format(end) : "ongoing"}`;
}
