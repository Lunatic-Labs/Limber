import { NextResponse } from "next/server";
import { and, count, eq, isNotNull, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  administratorProfiles,
  invitations,
  patientProfiles,
  physicianProfiles,
  plansOfCare,
  sessions,
  userPreferences,
  users,
} from "@/db/schema";
import { getAdminSession } from "@/lib/admin";
import { isUuid } from "@/lib/chat";
import { checkDeletable, tombstoneUsername } from "@/lib/user-deletion";

// DELETE /api/admin/users/[id]
// Admin-only, irreversible. The user can no longer sign in and is hidden
// everywhere, as if they never existed, except that their plans of care are
// archived so the other side (their physician or patient) keeps read access
// to the chat history but can't send anything new.
//
// The `user` row is kept as an anonymized tombstone rather than removed:
// messages, plans of care and invitations reference it by id and must
// survive. All personal data on it is wiped.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const [target] = await db
    .select({
      id: users.id,
      role: users.role,
      email: users.email,
      deletedAt: users.deletedAt,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  const [{ value: assignedPatientCount }] =
    target?.role === "physician"
      ? await db
          .select({ value: count() })
          .from(patientProfiles)
          .where(eq(patientProfiles.physicianUserId, id))
      : [{ value: 0 }];

  const check = checkDeletable({
    actorId: session.user.id,
    target: target ?? null,
    assignedPatientCount,
  });
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: check.status });
  }

  // One atomic request: the neon-http driver has no interactive transactions.
  const now = new Date();
  const [archived] = await db.batch([
    // Archive every plan the user is part of (as patient or physician), so
    // the remaining party can read it but not send. Same shape as the
    // reassign / archive flows.
    db
      .update(plansOfCare)
      .set({
        status: "archived",
        archivedAt: now,
        endDate: sql`coalesce(${plansOfCare.endDate}, ${now.toISOString()}::timestamp)`,
        updatedAt: now,
      })
      .where(
        and(
          or(eq(plansOfCare.patientUserId, id), eq(plansOfCare.physicianUserId, id)),
          sql`${plansOfCare.status} <> 'archived'`
        )
      )
      .returning({ id: plansOfCare.id }),
    // Pending patient invites that named this physician can no longer be honored.
    db
      .update(invitations)
      .set({ revokedAt: now })
      .where(
        and(
          eq(invitations.physicianUserId, id),
          isNull(invitations.acceptedAt),
          isNull(invitations.revokedAt)
        )
      ),
    // The accepted invitation this account was created from still holds their
    // email; replace it so no personal data is left behind. (An empty string
    // never matches, for accounts that have no email.)
    db
      .update(invitations)
      .set({ email: `deleted-${id}@deleted.invalid` })
      .where(
        and(
          eq(invitations.email, target?.email ?? ""),
          isNotNull(invitations.acceptedAt)
        )
      ),
    db.delete(patientProfiles).where(eq(patientProfiles.userId, id)),
    db.delete(physicianProfiles).where(eq(physicianProfiles.userId, id)),
    db.delete(administratorProfiles).where(eq(administratorProfiles.userId, id)),
    db.delete(userPreferences).where(eq(userPreferences.userId, id)),
    db.delete(accounts).where(eq(accounts.userId, id)),
    db.delete(sessions).where(eq(sessions.userId, id)),
    // Anonymize the account itself. Clearing the password
    // hash and username blocks sign-in; auth.ts also rejects deletedAt users
    // and drops any session cookie they still hold.
    db
      .update(users)
      .set({
        deletedAt: now,
        name: null,
        email: null,
        emailVerified: null,
        image: null,
        passwordHash: null,
        username: tombstoneUsername(id),
      })
      .where(and(eq(users.id, id), isNull(users.deletedAt))),
  ]);

  return NextResponse.json({ ok: true, plansArchived: archived.length });
}
