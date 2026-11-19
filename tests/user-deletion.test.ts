import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DELETED_USER_LABEL,
  checkDeletable,
  deleteConfirmMessage,
  tombstoneUsername,
  userDisplayName,
} from "../lib/user-deletion";

const ADMIN = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

test("display name falls back name -> username, and deleted users get a fixed label", () => {
  assert.equal(userDisplayName({ name: "Ada", username: "ada1" }), "Ada");
  assert.equal(userDisplayName({ name: null, username: "ada1" }), "ada1");
  assert.equal(
    userDisplayName({ name: "Ada", username: "deleted-x", deletedAt: new Date() }),
    DELETED_USER_LABEL
  );
});

test("tombstone username is derived from the id and can't look like a normal username or email", () => {
  assert.equal(tombstoneUsername(OTHER), `deleted-${OTHER}`);
  assert.ok(!tombstoneUsername(OTHER).includes("@"));
});

test("a patient, a physician with no patients, and another admin are deletable", () => {
  for (const role of ["patient", "physician", "administrator"] as const) {
    assert.deepEqual(
      checkDeletable({
        actorId: ADMIN,
        target: { id: OTHER, role, deletedAt: null },
        assignedPatientCount: 0,
      }),
      { ok: true },
      role
    );
  }
});

test("missing or already-deleted users are 404", () => {
  const missing = checkDeletable({ actorId: ADMIN, target: null, assignedPatientCount: 0 });
  assert.deepEqual(missing, { ok: false, status: 404, error: "User not found." });
  const gone = checkDeletable({
    actorId: ADMIN,
    target: { id: OTHER, role: "patient", deletedAt: new Date() },
    assignedPatientCount: 0,
  });
  assert.equal(gone.ok, false);
  assert.equal(!gone.ok && gone.status, 404);
});

test("admins can't delete themselves", () => {
  const r = checkDeletable({
    actorId: ADMIN,
    target: { id: ADMIN, role: "administrator", deletedAt: null },
    assignedPatientCount: 0,
  });
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.status, 400);
});

test("a physician with assigned patients is blocked until they're reassigned", () => {
  const r = checkDeletable({
    actorId: ADMIN,
    target: { id: OTHER, role: "physician", deletedAt: null },
    assignedPatientCount: 2,
  });
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.status, 409);
  assert.match(!r.ok ? r.error : "", /2 assigned patients/);
  const one = checkDeletable({
    actorId: ADMIN,
    target: { id: OTHER, role: "physician", deletedAt: null },
    assignedPatientCount: 1,
  });
  assert.match(!one.ok ? one.error : "", /1 assigned patient\. /);
});

test("the patient count only blocks physicians", () => {
  // A patient row never has patients assigned to it; guard the rule anyway.
  assert.deepEqual(
    checkDeletable({
      actorId: ADMIN,
      target: { id: OTHER, role: "patient", deletedAt: null },
      assignedPatientCount: 5,
    }),
    { ok: true }
  );
});

test("confirmation says the action can't be undone, for every role", () => {
  for (const role of ["patient", "physician", "administrator"] as const) {
    const msg = deleteConfirmMessage("Ada", role);
    assert.match(msg, /Delete Ada\?/);
    assert.match(msg, /cannot be undone/);
  }
  assert.match(deleteConfirmMessage("Ada", "patient"), /physician can still read past messages/);
  assert.match(deleteConfirmMessage("Dr. B", "physician"), /patients can still read past messages/);
});
