import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { invitations, users } from "@/db/schema";
import { getAdminSession } from "@/lib/admin";
import { inviteEmail, sendEmail } from "@/lib/email";
import {
  INVITE_TTL_DAYS,
  buildInviteUrl,
  generateInviteToken,
  hashInviteToken,
  inviteExpiry,
  validateInviteInput,
} from "@/lib/invitations";

// POST /api/admin/invitations  { email, role, physicianUserId? }
// Admin-only. Creates a one-time invite and emails the onboarding link.
// If email isn't configured, the link is returned so the admin can share it.
export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = validateInviteInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { email, role, physicianUserId } = parsed.value;

  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existingUser) {
    return NextResponse.json(
      { error: "A user with that email already exists." },
      { status: 409 }
    );
  }

  if (physicianUserId) {
    const [physician] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, physicianUserId), eq(users.role, "physician")))
      .limit(1);
    if (!physician) {
      return NextResponse.json(
        { error: "Choose a valid physician." },
        { status: 400 }
      );
    }
  }

  const now = new Date();
  const token = generateInviteToken();

  // Re-inviting an email replaces its outstanding invite (acts as "resend").
  await db
    .update(invitations)
    .set({ revokedAt: now })
    .where(
      and(
        eq(invitations.email, email),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt)
      )
    );

  const [invitation] = await db
    .insert(invitations)
    .values({
      email,
      role,
      physicianUserId,
      tokenHash: hashInviteToken(token),
      invitedByUserId: session.user.id,
      expiresAt: inviteExpiry(now),
    })
    .returning({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
    });

  const baseUrl =
    process.env.APP_URL ?? process.env.AUTH_URL ?? new URL(req.url).origin;
  const url = buildInviteUrl(baseUrl, token);
  const message = inviteEmail({
    role,
    url,
    inviterName: session.user.name ?? null,
    ttlDays: INVITE_TTL_DAYS,
  });
  const result = await sendEmail({ to: email, ...message });

  return NextResponse.json(
    {
      invitation,
      emailSent: result.sent,
      emailError: result.error ?? null,
      // Only exposed when the email didn't go out, so the admin can pass it on.
      inviteUrl: result.sent ? null : url,
    },
    { status: 201 }
  );
}
