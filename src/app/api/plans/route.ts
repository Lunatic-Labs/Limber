import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { patientProfiles, plansOfCare } from "@/db/schema";
import { validatePlanInput } from "@/lib/plans-shared";

// POST /api/plans  { patientUserId, title, diagnosis, description?, startDate? }
// Physician-only. Creates a plan of care for one of the physician's own
// patients. The plan is also the chat thread: messages live under it, so
// the conversation exists as soon as the plan does.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "physician") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = validatePlanInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { patientUserId, title, diagnosis, description, startDate } =
    parsed.value;

  // A physician can only assign patients who are assigned to them.
  const [patient] = await db
    .select({ userId: patientProfiles.userId })
    .from(patientProfiles)
    .where(
      and(
        eq(patientProfiles.userId, patientUserId),
        eq(patientProfiles.physicianUserId, session.user.id)
      )
    )
    .limit(1);
  if (!patient) {
    return NextResponse.json(
      { error: "Choose one of your own patients." },
      { status: 400 }
    );
  }

  const [plan] = await db
    .insert(plansOfCare)
    .values({
      patientUserId,
      physicianUserId: session.user.id,
      title,
      diagnosis,
      description,
      startDate,
    })
    .returning({ id: plansOfCare.id });

  return NextResponse.json({ plan }, { status: 201 });
}
