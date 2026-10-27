import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DIAGNOSIS_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  canArchivePlan,
  canSendMessages,
  validatePlanInput,
} from "../lib/plans-shared";

const PATIENT = "0b7c3f3e-2d6a-4a53-9d0a-6a1f3d7f2c11";
const ok = {
  patientUserId: PATIENT,
  title: "Knee recovery",
  diagnosis: "ACL reconstruction, left knee",
};

test("accepts a minimal valid plan and trims text fields", () => {
  const r = validatePlanInput({
    ...ok,
    title: "  Knee recovery  ",
    diagnosis: "  ACL reconstruction, left knee ",
  });
  assert.ok(r.ok);
  assert.equal(r.value.title, "Knee recovery");
  assert.equal(r.value.diagnosis, "ACL reconstruction, left knee");
  assert.equal(r.value.patientUserId, PATIENT);
  assert.equal(r.value.description, null);
  assert.ok(r.value.startDate instanceof Date);
});

test("diagnosis is required (empty, whitespace, non-string, missing)", () => {
  for (const diagnosis of ["", "   ", 5, null, undefined]) {
    assert.equal(validatePlanInput({ ...ok, diagnosis }).ok, false, String(diagnosis));
  }
});

test("title is required", () => {
  for (const title of ["", "   ", 5, null, undefined]) {
    assert.equal(validatePlanInput({ ...ok, title }).ok, false, String(title));
  }
});

test("title and diagnosis length limits", () => {
  assert.equal(
    validatePlanInput({ ...ok, title: "x".repeat(TITLE_MAX_LENGTH) }).ok,
    true
  );
  assert.equal(
    validatePlanInput({ ...ok, title: "x".repeat(TITLE_MAX_LENGTH + 1) }).ok,
    false
  );
  assert.equal(
    validatePlanInput({ ...ok, diagnosis: "x".repeat(DIAGNOSIS_MAX_LENGTH) }).ok,
    true
  );
  assert.equal(
    validatePlanInput({ ...ok, diagnosis: "x".repeat(DIAGNOSIS_MAX_LENGTH + 1) }).ok,
    false
  );
});

test("a patient must be assigned, and the id must be a UUID", () => {
  for (const patientUserId of ["", "not-a-uuid", 7, null, undefined]) {
    assert.equal(
      validatePlanInput({ ...ok, patientUserId }).ok,
      false,
      String(patientUserId)
    );
  }
});

test("description is optional; blank becomes null; overlong is rejected", () => {
  const blank = validatePlanInput({ ...ok, description: "   " });
  assert.ok(blank.ok && blank.value.description === null);
  const set = validatePlanInput({ ...ok, description: " Twice-weekly PT " });
  assert.ok(set.ok && set.value.description === "Twice-weekly PT");
  assert.equal(validatePlanInput({ ...ok, description: 5 }).ok, false);
  assert.equal(
    validatePlanInput({ ...ok, description: "x".repeat(2001) }).ok,
    false
  );
});

test("startDate: optional, accepts YYYY-MM-DD, rejects garbage", () => {
  const r = validatePlanInput({ ...ok, startDate: "2026-11-02" });
  assert.ok(r.ok);
  assert.equal(r.value.startDate.toISOString().slice(0, 10), "2026-11-02");
  for (const startDate of ["tomorrow", "2026-13-45", 12, "2026-02-30"]) {
    assert.equal(validatePlanInput({ ...ok, startDate }).ok, false, String(startDate));
  }
  // blank / null falls back to "now"
  for (const startDate of ["", null, undefined]) {
    assert.equal(validatePlanInput({ ...ok, startDate }).ok, true, String(startDate));
  }
});

test("rejects non-objects", () => {
  for (const raw of [null, undefined, "x", 3, []]) {
    assert.equal(validatePlanInput(raw).ok, false);
  }
});

test("only archived plans block new messages", () => {
  assert.equal(canSendMessages("active"), true);
  assert.equal(canSendMessages("completed"), true);
  assert.equal(canSendMessages("archived"), false);
});

test("an already archived plan can't be archived again", () => {
  assert.equal(canArchivePlan("active"), true);
  assert.equal(canArchivePlan("completed"), true);
  assert.equal(canArchivePlan("archived"), false);
});

// ---- editing an existing plan -------------------------------------------

import { validatePlanUpdate } from "../lib/plans-shared";

const upd = { title: "Knee recovery", diagnosis: "ACL reconstruction" };

test("update: accepts the editable fields and trims them", () => {
  const r = validatePlanUpdate({
    title: " New title ",
    diagnosis: " New dx ",
    description: " notes ",
    startDate: "2026-11-02",
  });
  assert.ok(r.ok);
  assert.equal(r.value.title, "New title");
  assert.equal(r.value.diagnosis, "New dx");
  assert.equal(r.value.description, "notes");
  assert.equal(r.value.startDate?.toISOString().slice(0, 10), "2026-11-02");
});

test("update: diagnosis and title can't be blanked out", () => {
  assert.equal(validatePlanUpdate({ ...upd, diagnosis: "  " }).ok, false);
  assert.equal(validatePlanUpdate({ ...upd, title: "" }).ok, false);
});

test("update: description can be cleared (blank -> null)", () => {
  const r = validatePlanUpdate({ ...upd, description: "" });
  assert.ok(r.ok && r.value.description === null);
});

test("update: omitted startDate means 'leave unchanged' (undefined), bad ones are rejected", () => {
  const r = validatePlanUpdate(upd);
  assert.ok(r.ok && r.value.startDate === undefined);
  assert.equal(validatePlanUpdate({ ...upd, startDate: "nope" }).ok, false);
});

test("update: patient can't be changed through an update", () => {
  const r = validatePlanUpdate({ ...upd, patientUserId: PATIENT });
  assert.ok(r.ok);
  assert.equal("patientUserId" in r.value, false);
});

test("update: length limits and non-objects", () => {
  assert.equal(
    validatePlanUpdate({ ...upd, diagnosis: "x".repeat(DIAGNOSIS_MAX_LENGTH + 1) }).ok,
    false
  );
  assert.equal(validatePlanUpdate(null).ok, false);
});

test("update: only non-archived plans can be edited", async () => {
  const { canEditPlan } = await import("../lib/plans-shared");
  assert.equal(canEditPlan("active"), true);
  assert.equal(canEditPlan("completed"), true);
  assert.equal(canEditPlan("archived"), false);
});
