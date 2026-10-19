// Pure validation for the onboarding form (no DB access, unit tested).

export const MIN_PASSWORD_LENGTH = 8;
// bcrypt only uses the first 72 bytes of a password, so cap it there
// rather than silently ignoring the tail.
export const MAX_PASSWORD_LENGTH = 72;
export const MAX_NAME_LENGTH = 100;

export type OnboardingInput = {
  name: string;
  password: string;
};

export function validateOnboardingInput(
  raw: unknown
): { ok: true; value: OnboardingInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Invalid request." };
  }
  const { name, password } = raw as Record<string, unknown>;

  if (typeof name !== "string" || name.trim().length === 0) {
    return { ok: false, error: "Enter your name." };
  }
  if (name.trim().length > MAX_NAME_LENGTH) {
    return { ok: false, error: "That name is too long." };
  }

  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at most ${MAX_PASSWORD_LENGTH} bytes (about ${MAX_PASSWORD_LENGTH} characters).`,
    };
  }

  return {
    ok: true,
    value: { name: name.trim(), password },
  };
}
