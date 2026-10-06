import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ATTACHMENT_LIMITS,
  MAX_ATTACHMENTS_PER_MESSAGE,
  attachmentPathPrefix,
  classifyMime,
  validateAttachmentInput,
  validateFileForUpload,
} from "../lib/attachments-shared";

const PLAN = "11111111-1111-4111-8111-111111111111";
const BLOB = `https://abc123.public.blob.vercel-storage.com/plans/${PLAN}/photo-x1.jpg`;

test("classifyMime maps mime types to attachment kinds", () => {
  assert.equal(classifyMime("image/jpeg"), "photo");
  assert.equal(classifyMime("image/heic"), "photo");
  assert.equal(classifyMime("video/mp4"), "video");
  assert.equal(classifyMime("video/quicktime"), "video");
  assert.equal(classifyMime("application/pdf"), "document");
  assert.equal(classifyMime("text/plain"), "document");
});

test("classifyMime rejects unsupported / dangerous types", () => {
  assert.equal(classifyMime("image/svg+xml"), null); // can carry scripts
  assert.equal(classifyMime("text/html"), null);
  assert.equal(classifyMime("application/x-msdownload"), null);
  assert.equal(classifyMime("application/javascript"), null);
  assert.equal(classifyMime(""), null);
});

test("classifyMime ignores case and parameters", () => {
  assert.equal(classifyMime("IMAGE/PNG"), "photo");
  assert.equal(classifyMime("video/mp4; codecs=avc1"), "video");
});

test("validateFileForUpload enforces per-kind size limits", () => {
  assert.equal(
    validateFileForUpload({ type: "image/png", size: 1024 }).ok,
    true
  );
  const big = validateFileForUpload({
    type: "image/png",
    size: ATTACHMENT_LIMITS.photo + 1,
  });
  assert.equal(big.ok, false);
  const bigVideo = validateFileForUpload({
    type: "video/mp4",
    size: ATTACHMENT_LIMITS.photo + 1,
  });
  assert.equal(bigVideo.ok, true); // videos get a bigger allowance
  assert.equal(
    validateFileForUpload({
      type: "video/mp4",
      size: ATTACHMENT_LIMITS.video + 1,
    }).ok,
    false
  );
});

test("validateFileForUpload rejects empty files and bad types", () => {
  assert.equal(validateFileForUpload({ type: "image/png", size: 0 }).ok, false);
  assert.equal(
    validateFileForUpload({ type: "application/zip", size: 10 }).ok,
    false
  );
});

test("validateAttachmentInput accepts a well-formed attachment", () => {
  const r = validateAttachmentInput(
    { url: BLOB, fileName: "knee.jpg", mimeType: "image/jpeg", size: 5000 },
    PLAN
  );
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.value.kind, "photo");
});

test("validateAttachmentInput rejects URLs outside this plan's blob prefix", () => {
  const otherPlan = BLOB.replace(PLAN, "22222222-2222-4222-8222-222222222222");
  for (const url of [
    otherPlan,
    "https://evil.example.com/plans/" + PLAN + "/x.jpg",
    "http://abc.public.blob.vercel-storage.com/plans/" + PLAN + "/x.jpg",
    "javascript:alert(1)",
    "not a url",
  ]) {
    const r = validateAttachmentInput(
      { url, fileName: "a.jpg", mimeType: "image/jpeg", size: 10 },
      PLAN
    );
    assert.equal(r.ok, false, url);
  }
});

test("validateAttachmentInput rejects malformed input", () => {
  for (const bad of [
    null,
    "str",
    {},
    { url: BLOB, fileName: "", mimeType: "image/jpeg", size: 10 },
    { url: BLOB, fileName: "a", mimeType: "text/html", size: 10 },
    { url: BLOB, fileName: "a", mimeType: "image/jpeg", size: -1 },
    { url: BLOB, fileName: "a", mimeType: "image/jpeg", size: "10" },
    { url: BLOB, fileName: "a".repeat(300), mimeType: "image/jpeg", size: 10 },
  ]) {
    assert.equal(validateAttachmentInput(bad, PLAN).ok, false);
  }
});

test("attachmentPathPrefix is scoped per plan", () => {
  assert.equal(attachmentPathPrefix(PLAN), `plans/${PLAN}/`);
  assert.ok(MAX_ATTACHMENTS_PER_MESSAGE >= 1);
});
