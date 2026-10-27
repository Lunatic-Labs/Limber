import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MEDIA_PAGE_SIZE,
  MAX_MEDIA_PAGE_SIZE,
  buildPage,
  decodeCursor,
  encodeCursor,
  formatDuration,
  formatPlanDateRange,
  isAfterCursor,
  kindsForTab,
  parseDetailsTab,
  parseLimit,
  senderLabel,
} from "../lib/media-shared";

const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

// ---------- tabs ----------

test("parseDetailsTab accepts the three known tabs", () => {
  assert.equal(parseDetailsTab("info"), "info");
  assert.equal(parseDetailsTab("media"), "media");
  assert.equal(parseDetailsTab("documents"), "documents");
});

test("parseDetailsTab falls back to info for anything else", () => {
  assert.equal(parseDetailsTab(undefined), "info");
  assert.equal(parseDetailsTab(""), "info");
  assert.equal(parseDetailsTab("MEDIA"), "info");
  assert.equal(parseDetailsTab("photos"), "info");
  assert.equal(parseDetailsTab(["media"]), "info"); // repeated ?tab= params
  assert.equal(parseDetailsTab(null), "info");
});

test("kindsForTab: media is photos + videos, documents is documents only", () => {
  assert.deepEqual([...kindsForTab("media")].sort(), ["photo", "video"]);
  assert.deepEqual(kindsForTab("documents"), ["document"]);
});

test("kindsForTab: info loads no attachments", () => {
  assert.deepEqual(kindsForTab("info"), []);
});

// ---------- cursor ----------

test("cursor round-trips", () => {
  const c = { createdAt: "2026-10-27T15:36:31.123Z", id: ID_A };
  assert.deepEqual(decodeCursor(encodeCursor(c)), c);
});

test("decodeCursor returns null for missing or malformed input and never throws", () => {
  assert.equal(decodeCursor(undefined), null);
  assert.equal(decodeCursor(null), null);
  assert.equal(decodeCursor(""), null);
  assert.equal(decodeCursor("not-base64-!!!"), null);
  assert.equal(decodeCursor("'; DROP TABLE attachment; --"), null);
  assert.equal(decodeCursor(["a", "b"]), null);
  // valid base64url JSON, wrong shape
  const wrong = Buffer.from(JSON.stringify({ foo: 1 })).toString("base64url");
  assert.equal(decodeCursor(wrong), null);
  // right shape, invalid date / id
  const badDate = encodeCursor({ createdAt: "yesterday", id: ID_A });
  assert.equal(decodeCursor(badDate), null);
  const badId = encodeCursor({ createdAt: "2026-10-27T15:36:31.123Z", id: "x" });
  assert.equal(decodeCursor(badId), null);
});

test("isAfterCursor orders newest-first and breaks createdAt ties by id", () => {
  const cursor = { createdAt: "2026-10-27T10:00:00.000Z", id: ID_B };
  // strictly older: comes after the cursor
  assert.equal(
    isAfterCursor({ createdAt: "2026-10-27T09:00:00.000Z", id: ID_B }, cursor),
    true
  );
  // strictly newer: already shown
  assert.equal(
    isAfterCursor({ createdAt: "2026-10-27T11:00:00.000Z", id: ID_A }, cursor),
    false
  );
  // same timestamp: smaller id comes after, larger id was already shown
  assert.equal(
    isAfterCursor({ createdAt: cursor.createdAt, id: ID_A }, cursor),
    true
  );
  // the cursor row itself is never repeated
  assert.equal(isAfterCursor({ ...cursor }, cursor), false);
});

// ---------- limit ----------

test("parseLimit defaults, clamps and ignores junk", () => {
  assert.equal(parseLimit(undefined), DEFAULT_MEDIA_PAGE_SIZE);
  assert.equal(parseLimit(""), DEFAULT_MEDIA_PAGE_SIZE);
  assert.equal(parseLimit("abc"), DEFAULT_MEDIA_PAGE_SIZE);
  assert.equal(parseLimit("NaN"), DEFAULT_MEDIA_PAGE_SIZE);
  assert.equal(parseLimit("-5"), DEFAULT_MEDIA_PAGE_SIZE);
  assert.equal(parseLimit("0"), DEFAULT_MEDIA_PAGE_SIZE);
  assert.equal(parseLimit("10"), 10);
  assert.equal(parseLimit("1"), 1);
  assert.equal(parseLimit("9999"), MAX_MEDIA_PAGE_SIZE);
  assert.equal(parseLimit("12.7"), 12);
});

test("page size defaults match the spec", () => {
  assert.equal(DEFAULT_MEDIA_PAGE_SIZE, 30);
  assert.equal(MAX_MEDIA_PAGE_SIZE, 60);
});

// ---------- paging ----------

function rows(n: number) {
  // newest first, like the query returns them
  return Array.from({ length: n }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    createdAt: new Date(Date.UTC(2026, 9, 27, 12, 0, 0) - i * 1000).toISOString(),
  }));
}

test("buildPage returns nextCursor only when more rows exist", () => {
  // the query fetches limit + 1 rows to detect another page
  const more = buildPage(rows(4), 3);
  assert.equal(more.items.length, 3);
  assert.deepEqual(decodeCursor(more.nextCursor), {
    createdAt: more.items[2].createdAt,
    id: more.items[2].id,
  });

  const last = buildPage(rows(2), 3);
  assert.equal(last.items.length, 2);
  assert.equal(last.nextCursor, null);
});

test("buildPage: exact multiple of the page size gives no phantom page", () => {
  const page = buildPage(rows(3), 3);
  assert.equal(page.items.length, 3);
  assert.equal(page.nextCursor, null);
});

test("buildPage handles an empty result", () => {
  assert.deepEqual(buildPage([], 30), { items: [], nextCursor: null });
});

// ---------- labels ----------

test("formatDuration formats m:ss and h:mm:ss", () => {
  assert.equal(formatDuration(16), "0:16");
  assert.equal(formatDuration(5), "0:05");
  assert.equal(formatDuration(75), "1:15");
  assert.equal(formatDuration(600), "10:00");
  assert.equal(formatDuration(3725), "1:02:05");
  assert.equal(formatDuration(16.9), "0:16"); // truncates, never rounds up
});

test("formatDuration returns null when there is nothing sensible to show", () => {
  assert.equal(formatDuration(0), null);
  assert.equal(formatDuration(-3), null);
  assert.equal(formatDuration(NaN), null);
  assert.equal(formatDuration(Infinity), null);
  assert.equal(formatDuration(null), null);
  assert.equal(formatDuration(undefined), null);
});

test("senderLabel says You for the signed-in user, the other name otherwise", () => {
  assert.equal(
    senderLabel({ senderUserId: ID_A, currentUserId: ID_A, otherName: "Dr. Smith" }),
    "You"
  );
  assert.equal(
    senderLabel({ senderUserId: ID_B, currentUserId: ID_A, otherName: "Dr. Smith" }),
    "Dr. Smith"
  );
});

test("formatPlanDateRange handles open-ended and closed plans", () => {
  const start = new Date("2026-10-01T00:00:00.000Z");
  assert.equal(formatPlanDateRange(start, null), "Oct 1, 2026 – ongoing");
  assert.equal(
    formatPlanDateRange(start, new Date("2026-12-15T00:00:00.000Z")),
    "Oct 1, 2026 – Dec 15, 2026"
  );
});
