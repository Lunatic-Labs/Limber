import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INVITE_TTL_DAYS,
  buildInviteUrl,
  generateInviteToken,
  hashInviteToken,
  invitationStatus,
  inviteExpiry,
  isValidEmail,
  normalizeEmail,
  validateInviteInput,
} from "../lib/invitations";

const PHYSICIAN_ID = "11111111-1111-4111-8111-111111111111";

// ---- email ----

test("normalizeEmail trims and lowercases", () => {
  assert.equal(normalizeEmail("  Jane.Doe@Example.COM "), "jane.doe@example.com");
});

test("isValidEmail accepts ordinary addresses", () => {
  assert.ok(isValidEmail("a@b.co"));
  assert.ok(isValidEmail("first.last+tag@sub.example.org"));
});

test("isValidEmail rejects malformed addresses", () => {
  for (const bad of ["", "plain", "a@", "@b.co", "a@b", "a b@c.de", "a@@b.co", "a@b..co"]) {
    assert.equal(isValidEmail(bad), false, bad);
  }
});

test("isValidEmail rejects overly long addresses", () => {
  assert.equal(isValidEmail(`${"a".repeat(250)}@b.co`), false);
});

// ---- tokens ----

test("generateInviteToken is url-safe, long, and unique", () => {
  const a = generateInviteToken();
  const b = generateInviteToken();
  assert.match(a, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a, b);
});

test("hashInviteToken is deterministic, hex, and not the token", () => {
  const t = generateInviteToken();
  const h = hashInviteToken(t);
  assert.equal(h, hashInviteToken(t));
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.notEqual(h, t);
  assert.notEqual(h, hashInviteToken(generateInviteToken()));
});

// ---- input validation ----

test("validateInviteInput accepts physician and administrator invites", () => {
  for (const role of ["physician", "administrator"]) {
    const r = validateInviteInput({ email: " X@Y.com ", role });
    assert.deepEqual(r, {
      ok: true,
      value: { email: "x@y.com", role, physicianUserId: null },
    });
  }
});

test("validateInviteInput ignores a physician id on non-patient roles", () => {
  const r = validateInviteInput({
    email: "x@y.com",
    role: "physician",
    physicianUserId: PHYSICIAN_ID,
  });
  assert.ok(r.ok && r.value.physicianUserId === null);
});

test("patient invites require a physician (one physician per patient)", () => {
  const missing = validateInviteInput({ email: "p@y.com", role: "patient" });
  assert.equal(missing.ok, false);
  const bad = validateInviteInput({
    email: "p@y.com",
    role: "patient",
    physicianUserId: "nope",
  });
  assert.equal(bad.ok, false);
  const good = validateInviteInput({
    email: "p@y.com",
    role: "patient",
    physicianUserId: PHYSICIAN_ID,
  });
  assert.ok(good.ok && good.value.physicianUserId === PHYSICIAN_ID);
});

test("validateInviteInput rejects bad email, bad role, and non-objects", () => {
  assert.equal(validateInviteInput({ email: "nope", role: "physician" }).ok, false);
  assert.equal(validateInviteInput({ email: "a@b.co", role: "root" }).ok, false);
  assert.equal(validateInviteInput({ email: "a@b.co" }).ok, false);
  assert.equal(validateInviteInput(null).ok, false);
  assert.equal(validateInviteInput("x").ok, false);
  assert.equal(validateInviteInput({ email: 5, role: "physician" }).ok, false);
});

// ---- status / expiry ----

const NOW = new Date("2026-10-13T12:00:00Z");

test("inviteExpiry is INVITE_TTL_DAYS after now", () => {
  const exp = inviteExpiry(NOW);
  assert.equal(exp.getTime() - NOW.getTime(), INVITE_TTL_DAYS * 86_400_000);
});

test("invitationStatus covers pending, expired, accepted, revoked", () => {
  const future = new Date(NOW.getTime() + 1000);
  const past = new Date(NOW.getTime() - 1000);
  assert.equal(
    invitationStatus({ acceptedAt: null, revokedAt: null, expiresAt: future }, NOW),
    "pending"
  );
  assert.equal(
    invitationStatus({ acceptedAt: null, revokedAt: null, expiresAt: past }, NOW),
    "expired"
  );
  assert.equal(
    invitationStatus({ acceptedAt: past, revokedAt: null, expiresAt: future }, NOW),
    "accepted"
  );
  assert.equal(
    invitationStatus({ acceptedAt: null, revokedAt: past, expiresAt: future }, NOW),
    "revoked"
  );
  // accepted wins over expired/revoked: the account exists
  assert.equal(
    invitationStatus({ acceptedAt: past, revokedAt: past, expiresAt: past }, NOW),
    "accepted"
  );
});

test("expiry boundary: exactly at expiresAt is expired", () => {
  assert.equal(
    invitationStatus({ acceptedAt: null, revokedAt: null, expiresAt: NOW }, NOW),
    "expired"
  );
});

// ---- link ----

test("buildInviteUrl joins base and token without double slashes", () => {
  assert.equal(
    buildInviteUrl("https://limber.app/", "abc"),
    "https://limber.app/onboarding/abc"
  );
  assert.equal(
    buildInviteUrl("http://localhost:3000", "a b"),
    "http://localhost:3000/onboarding/a%20b"
  );
});
