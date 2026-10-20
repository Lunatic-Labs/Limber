import { createHash, randomBytes } from "node:crypto";

// Pure invitation logic (no DB access) so it can be unit tested.
// An admin invites someone by email; the invitee follows a one-time
// link to the onboarding page (built separately) to create their account.
// Only a SHA-256 hash of the token is stored, never the token itself.

export const INVITE_TTL_DAYS = 7;
export const INVITE_ROLES = ["patient", "physician", "administrator"] as const;
export type InviteRole = (typeof INVITE_ROLES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return email.length <= 254 && EMAIL_RE.test(email);
}

export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type InviteInput = {
  email: string;
  role: InviteRole;
  physicianUserId: string | null;
};

export function validateInviteInput(
  raw: unknown
): { ok: true; value: InviteInput } | { ok: false; error: string } {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Invalid request." };
  }
  const { email, role, physicianUserId } = raw as Record<string, unknown>;

  if (typeof email !== "string") {
    return { ok: false, error: "Enter a valid email address." };
  }
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (typeof role !== "string" || !INVITE_ROLES.includes(role as InviteRole)) {
    return { ok: false, error: "Choose a role." };
  }

  if (role === "patient") {
    // A patient always has exactly one assigned physician.
    if (typeof physicianUserId !== "string" || !UUID_RE.test(physicianUserId)) {
      return { ok: false, error: "Choose a physician for this patient." };
    }
    return {
      ok: true,
      value: { email: normalized, role, physicianUserId },
    };
  }

  return {
    ok: true,
    value: { email: normalized, role: role as InviteRole, physicianUserId: null },
  };
}

export function inviteExpiry(now: Date): Date {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 86_400_000);
}

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export function invitationStatus(
  inv: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date },
  now: Date
): InvitationStatus {
  if (inv.acceptedAt) return "accepted";
  if (inv.revokedAt) return "revoked";
  if (inv.expiresAt.getTime() <= now.getTime()) return "expired";
  return "pending";
}

export function buildInviteUrl(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/onboarding/${encodeURIComponent(token)}`;
}
