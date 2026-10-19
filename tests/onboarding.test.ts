import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  validateOnboardingInput,
} from "../lib/onboarding";

const ok = { name: "Jane Doe", password: "correct horse" };

test("accepts a valid submission and trims the name", () => {
  const r = validateOnboardingInput({ ...ok, name: "  Jane Doe  " });
  assert.deepEqual(r, {
    ok: true,
    value: { name: "Jane Doe", password: "correct horse" },
  });
});

test("rejects empty / whitespace / non-string / overlong names", () => {
  for (const name of ["", "   ", 5, null, undefined, "x".repeat(101)]) {
    assert.equal(validateOnboardingInput({ ...ok, name }).ok, false, String(name));
  }
});

test("password length bounds", () => {
  assert.equal(
    validateOnboardingInput({ ...ok, password: "a".repeat(MIN_PASSWORD_LENGTH - 1) }).ok,
    false
  );
  assert.equal(
    validateOnboardingInput({ ...ok, password: "a".repeat(MIN_PASSWORD_LENGTH) }).ok,
    true
  );
  assert.equal(
    validateOnboardingInput({ ...ok, password: "a".repeat(MAX_PASSWORD_LENGTH) }).ok,
    true
  );
  assert.equal(
    validateOnboardingInput({ ...ok, password: "a".repeat(MAX_PASSWORD_LENGTH + 1) }).ok,
    false
  );
});

test("password limit is in bytes (bcrypt truncates at 72 bytes)", () => {
  // 40 two-byte characters = 80 bytes, only 40 characters
  assert.equal(validateOnboardingInput({ ...ok, password: "é".repeat(40) }).ok, false);
});

test("password is not trimmed and may contain spaces", () => {
  const r = validateOnboardingInput({ ...ok, password: "  spaced out  " });
  assert.ok(r.ok && r.value.password === "  spaced out  ");
});

test("rejects non-objects and non-string passwords", () => {
  assert.equal(validateOnboardingInput(null).ok, false);
  assert.equal(validateOnboardingInput("x").ok, false);
  assert.equal(validateOnboardingInput({ ...ok, password: 12345678 }).ok, false);
});
