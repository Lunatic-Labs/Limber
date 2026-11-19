// Pure rules for an administrator deleting a user (no DB access, unit tested).
//
// "Delete" anonymizes the account rather than removing the row: messages and
// plans of care reference users by id, and the other party must keep reading
// the history. See DELETE /api/admin/users/[id] for the full set of effects.

export const DELETED_USER_LABEL = "Deleted user";

export type UserRole = "patient" | "physician" | "administrator";

// What to show wherever a user's name appears. Deleted accounts have no
// personal data left, so they get a fixed label.
export function userDisplayName(user: {
  name: string | null;
  username: string;
  deletedAt?: Date | null;
}): string {
  if (user.deletedAt) return DELETED_USER_LABEL;
  return user.name ?? user.username;
}

// Replaces the (unique, required) username on a deleted account. Derived
// from the id so it can never collide with a real username or another
// tombstone, and so the original username/email is free to be reused.
export function tombstoneUsername(id: string): string {
  return `deleted-${id}`;
}

export type DeleteCheck =
  | { ok: true }
  | { ok: false; status: 400 | 404 | 409; error: string };

// Whether `actorId` may delete `target`.
//  - Admins can't delete themselves (would risk locking everyone out).
//  - A physician with assigned patients can't be deleted: every patient must
//    have exactly one physician, so an admin has to reassign them first (which
//    also archives their active plans).
export function checkDeletable(input: {
  actorId: string;
  target: { id: string; role: UserRole; deletedAt: Date | null } | null;
  assignedPatientCount: number;
}): DeleteCheck {
  const { actorId, target, assignedPatientCount } = input;
  if (!target || target.deletedAt) {
    return { ok: false, status: 404, error: "User not found." };
  }
  if (target.id === actorId) {
    return { ok: false, status: 400, error: "You can't delete your own account." };
  }
  if (target.role === "physician" && assignedPatientCount > 0) {
    return {
      ok: false,
      status: 409,
      error: physicianBlockedMessage(assignedPatientCount),
    };
  }
  return { ok: true };
}

export function physicianBlockedMessage(patientCount: number): string {
  return `This physician still has ${patientCount} assigned patient${
    patientCount === 1 ? "" : "s"
  }. Reassign them to another physician first, then delete this account.`;
}

// Text for the admin's confirmation prompt.
export function deleteConfirmMessage(name: string, role: UserRole): string {
  const effect =
    role === "patient"
      ? "Their plans of care will be archived: their physician can still read past messages, but no new messages can be sent."
      : role === "physician"
        ? "Their plans of care will be archived: their patients can still read past messages, but no new messages can be sent."
        : "They will no longer be able to sign in.";
  return `Delete ${name}?\n\nThey will no longer be able to sign in, and the account will be removed as if it never existed. ${effect}\n\nThis action cannot be undone.`;
}
