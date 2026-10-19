import { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  administratorProfiles,
  invitations,
  patientProfiles,
  physicianProfiles,
  users,
} from "@/db/schema";
import { hashInviteToken } from "@/lib/invitations";
import { validateOnboardingInput } from "@/lib/onboarding";
import { hashPassword } from "@/lib/password";

// POST /api/onboarding/[token]  { name, password }
// Public (the invite token is the credential). Creates the account for the
// invited email with the role the admin chose, then burns the invite.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = validateOnboardingInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { name, password } = parsed.value;

  const tokenHash = hashInviteToken(token);
  const now = new Date();

  // Claim the invite atomically: only one request can flip acceptedAt from
  // null, so a double-submit or replayed link can't create two accounts.
  const [invite] = await db
    .update(invitations)
    .set({ acceptedAt: now })
    .where(
      and(
        eq(invitations.tokenHash, tokenHash),
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
        gt(invitations.expiresAt, now)
      )
    )
    .returning();

  if (!invite) {
    return NextResponse.json(
      { error: "This invitation is no longer valid." },
      { status: 410 }
    );
  }

  const unclaim = () =>
    db
      .update(invitations)
      .set({ acceptedAt: null })
      .where(eq(invitations.id, invite.id));

  try {
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    const createUser = db.insert(users).values({
      id: userId,
      name,
      email: invite.email,
      // Invited users sign in with their email as their username.
      username: invite.email,
      emailVerified: now, // they proved they own the address by using the link
      passwordHash,
      role: invite.role,
    });

    // batch() runs both statements in one atomic request (the neon-http
    // driver has no interactive transactions).
    if (invite.role === "patient") {
      if (!invite.physicianUserId) throw new Error("Patient invite has no physician.");
      await db.batch([
        createUser,
        db.insert(patientProfiles).values({
          userId,
          physicianUserId: invite.physicianUserId,
        }),
      ]);
    } else if (invite.role === "physician") {
      await db.batch([createUser, db.insert(physicianProfiles).values({ userId })]);
    } else {
      await db.batch([createUser, db.insert(administratorProfiles).values({ userId })]);
    }
  } catch (err) {
    // Nothing was created (batch is atomic); give the invite back.
    await unclaim();
    const message = String((err as Error)?.message ?? err);
    if (/unique|duplicate/i.test(message)) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }
    console.error("Onboarding failed:", err);
    return NextResponse.json(
      { error: "Could not create your account. Please try again." },
      { status: 500 }
    );
  }

  // Client signs in with { username: email, password } next.
  return NextResponse.json({ ok: true, username: invite.email }, { status: 201 });
}
