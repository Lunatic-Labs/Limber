import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { patientProfiles, plansOfCare, users } from "@/db/schema";
import { getAdminSession } from "@/lib/admin";
import { planStatusesToArchive, validateReassignInput } from "@/lib/assignment";
import { isUuid } from "@/lib/chat";

// PATCH /api/admin/patients/[id]/physician  { physicianUserId }
// Admin-only. Reassigns a patient to a different physician and archives the
// patient's active plans of care (the new physician creates a new one). Plans
// keep the physician who created them, so history is preserved.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = validateReassignInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { physicianUserId } = parsed.value;

  const [profile] = await db
    .select({ physicianUserId: patientProfiles.physicianUserId })
    .from(patientProfiles)
    .where(eq(patientProfiles.userId, id))
    .limit(1);
  if (!profile) {
    return NextResponse.json({ error: "Patient not found." }, { status: 404 });
  }

  const [physician] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, physicianUserId), eq(users.role, "physician")))
    .limit(1);
  if (!physician) {
    return NextResponse.json({ error: "Choose a valid physician." }, { status: 400 });
  }

  if (profile.physicianUserId === physicianUserId) {
    return NextResponse.json({ ok: true, plansArchived: 0, unchanged: true });
  }

  // One atomic request: the neon-http driver has no interactive transactions.
  const now = new Date();
  const [, archived] = await db.batch([
    db
      .update(patientProfiles)
      .set({ physicianUserId })
      .where(eq(patientProfiles.userId, id)),
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
          eq(plansOfCare.patientUserId, id),
          inArray(plansOfCare.status, [...planStatusesToArchive()])
        )
      )
      .returning({ id: plansOfCare.id }),
  ]);

  return NextResponse.json({ ok: true, plansArchived: archived.length });
}
