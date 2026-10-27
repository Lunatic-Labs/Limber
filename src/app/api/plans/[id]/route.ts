import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { plansOfCare } from "@/db/schema";
import { getPlanForUser } from "@/lib/chat";
import { canEditPlan, validatePlanUpdate } from "@/lib/plans-shared";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/plans/:id  { title, diagnosis, description?, startDate? }
// Only the plan's physician may edit it, and only while it isn't
// archived (archived plans are a closed record).
export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const plan = await getPlanForUser(id, session.user.id);
  if (!plan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (session.user.role !== "physician" || plan.physicianUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canEditPlan(plan.status)) {
    return NextResponse.json(
      { error: "This plan of care is archived and can't be edited." },
      { status: 409 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = validatePlanUpdate(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { title, diagnosis, description, startDate } = parsed.value;

  const [updated] = await db
    .update(plansOfCare)
    .set({
      title,
      diagnosis,
      description,
      ...(startDate ? { startDate } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(plansOfCare.id, plan.id), ne(plansOfCare.status, "archived")))
    .returning({
      id: plansOfCare.id,
      title: plansOfCare.title,
      diagnosis: plansOfCare.diagnosis,
      description: plansOfCare.description,
      startDate: plansOfCare.startDate,
    });

  if (!updated) {
    return NextResponse.json(
      { error: "This plan of care is archived and can't be edited." },
      { status: 409 }
    );
  }
  return NextResponse.json({ plan: updated });
}
