// Pure rules for Plans of Care (no DB access, unit tested): input
// validation for creating one, and the status rules that decide whether
// a plan still accepts messages / can be archived.

export const TITLE_MAX_LENGTH = 120;
export const DIAGNOSIS_MAX_LENGTH = 500;
export const DESCRIPTION_MAX_LENGTH = 2000;

export type PlanStatus = "active" | "completed" | "archived";

export type PlanInput = {
  patientUserId: string;
  title: string;
  diagnosis: string;
  description: string | null;
  startDate: Date;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

// "YYYY-MM-DD" -> Date at 00:00 UTC, or null if it isn't a real calendar day.
function parseDay(value: string): Date | null {
  const m = DATE_RE.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  const real =
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === mo - 1 &&
    date.getUTCDate() === d;
  return real ? date : null;
}

function requiredText(
  value: unknown,
  label: string,
  max: number
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { ok: false, error: `Enter ${label}.` };
  }
  if (value.trim().length > max) {
    return { ok: false, error: `The ${label} is too long (max ${max} characters).` };
  }
  return { ok: true, value: value.trim() };
}

// Editing an existing plan: same field rules, but the patient can't be
// changed, and an omitted startDate means "leave it as it is".
export type PlanUpdate = {
  title: string;
  diagnosis: string;
  description: string | null;
  startDate?: Date;
};

export function validatePlanUpdate(
  raw: unknown
): { ok: true; value: PlanUpdate } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "Invalid request." };
  }
  const { title, diagnosis, description, startDate } = raw as Record<string, unknown>;

  const t = requiredText(title, "a title", TITLE_MAX_LENGTH);
  if (!t.ok) return t;
  const dx = requiredText(diagnosis, "a diagnosis", DIAGNOSIS_MAX_LENGTH);
  if (!dx.ok) return dx;

  const desc = parseDescription(description);
  if (!desc.ok) return desc;

  let start: Date | undefined;
  if (startDate !== undefined && startDate !== null && startDate !== "") {
    const parsed = typeof startDate === "string" ? parseDay(startDate) : null;
    if (!parsed) return { ok: false, error: "Enter a valid start date." };
    start = parsed;
  }

  return {
    ok: true,
    value: { title: t.value, diagnosis: dx.value, description: desc.value, startDate: start },
  };
}

function parseDescription(
  description: unknown
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (description === undefined || description === null) {
    return { ok: true, value: null };
  }
  if (typeof description !== "string") {
    return { ok: false, error: "Invalid description." };
  }
  if (description.trim().length > DESCRIPTION_MAX_LENGTH) {
    return {
      ok: false,
      error: `The description is too long (max ${DESCRIPTION_MAX_LENGTH} characters).`,
    };
  }
  return { ok: true, value: description.trim() || null };
}

export function validatePlanInput(
  raw: unknown
): { ok: true; value: PlanInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, error: "Invalid request." };
  }
  const { patientUserId, title, diagnosis, description, startDate } =
    raw as Record<string, unknown>;

  if (typeof patientUserId !== "string" || !UUID_RE.test(patientUserId)) {
    return { ok: false, error: "Choose a patient for this plan of care." };
  }

  const t = requiredText(title, "a title", TITLE_MAX_LENGTH);
  if (!t.ok) return t;
  const dx = requiredText(diagnosis, "a diagnosis", DIAGNOSIS_MAX_LENGTH);
  if (!dx.ok) return dx;

  const desc = parseDescription(description);
  if (!desc.ok) return desc;

  let start = new Date();
  if (startDate !== undefined && startDate !== null && startDate !== "") {
    const parsed = typeof startDate === "string" ? parseDay(startDate) : null;
    if (!parsed) return { ok: false, error: "Enter a valid start date." };
    start = parsed;
  }

  return {
    ok: true,
    value: {
      patientUserId,
      title: t.value,
      diagnosis: dx.value,
      description: desc.value,
      startDate: start,
    },
  };
}

// Archived plans stay readable (messages and files), but no new
// messages or uploads are accepted.
export function canSendMessages(status: PlanStatus): boolean {
  return status !== "archived";
}

export function canArchivePlan(status: PlanStatus): boolean {
  return status !== "archived";
}

// Details (title, diagnosis, notes, start date) are editable until the
// plan is archived.
export function canEditPlan(status: PlanStatus): boolean {
  return status !== "archived";
}
