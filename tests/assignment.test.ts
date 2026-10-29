import { test } from "node:test";
import assert from "node:assert/strict";
import { planStatusesToArchive, validateReassignInput } from "../lib/assignment";

const ID = "11111111-1111-4111-8111-111111111111";

test("accepts a physician uuid", () => {
  assert.deepEqual(validateReassignInput({ physicianUserId: ID }), {
    ok: true,
    value: { physicianUserId: ID },
  });
});

test("rejects missing, non-string, and malformed ids", () => {
  for (const physicianUserId of [undefined, null, 5, "", "nope", ID + "x"]) {
    assert.equal(validateReassignInput({ physicianUserId }).ok, false, String(physicianUserId));
  }
});

test("rejects non-objects", () => {
  assert.equal(validateReassignInput(null).ok, false);
  assert.equal(validateReassignInput("x").ok, false);
});

test("only active plans of care are archived on reassignment; completed/archived are untouched", () => {
  assert.deepEqual(planStatusesToArchive(), ["active"]);
});

import { plansForFormerPatients } from "../lib/assignment";

test("plansForFormerPatients returns only plans whose patient is no longer assigned", () => {
  const plans = [
    { id: "p1", patientUserId: "a" },
    { id: "p2", patientUserId: "b" },
    { id: "p3", patientUserId: "b" },
  ];
  assert.deepEqual(plansForFormerPatients(plans, new Set(["a"])), [plans[1], plans[2]]);
  assert.deepEqual(plansForFormerPatients(plans, new Set(["a", "b"])), []);
  assert.deepEqual(plansForFormerPatients([], new Set()), []);
});
