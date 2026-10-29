// Pure logic for an admin reassigning a patient to a different physician.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateReassignInput(
  raw: unknown
): { ok: true; value: { physicianUserId: string } } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Invalid request." };
  }
  const { physicianUserId } = raw as Record<string, unknown>;
  if (typeof physicianUserId !== "string" || !UUID_RE.test(physicianUserId)) {
    return { ok: false, error: "Choose a physician." };
  }
  return { ok: true, value: { physicianUserId } };
}

// When a patient is reassigned, their in-progress plans of care are archived
// (the new physician starts a fresh plan). Every plan stays with the physician
// who created it, preserving the history `plan_of_care.physician_user_id`
// exists for. Completed plans are already finished and are left as they are.
export function planStatusesToArchive() {
  return ["active"] as const;
}

// A physician keeps read access to the plans of care they created after a
// patient is reassigned. These are the plans (of a physician's) belonging to
// patients who are no longer assigned to them, so the dashboard can list them.
export function plansForFormerPatients<T extends { patientUserId: string }>(
  plans: T[],
  currentPatientIds: Set<string>
): T[] {
  return plans.filter((p) => !currentPatientIds.has(p.patientUserId));
}
