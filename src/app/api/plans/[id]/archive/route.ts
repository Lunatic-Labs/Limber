import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { plansOfCare } from "@/db/schema";
import { getPlanForUser } from "@/lib/chat";
import { canArchivePlan } from "@/lib/plans-shared";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/plans/:id/archive
// Only the plan's physician may archive it. Archiving is one-way: the
// history stays viewable, but no new messages or files can be added.
export async function POST(_req: Request, { params }: Ctx) {
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
  if (!canArchivePlan(plan.status)) {
    return NextResponse.json(
      { error: "This plan of care is already archived." },
      { status: 409 }
    );
  }

  // The status check in the WHERE keeps a double-submit from re-archiving.
  const now = new Date();
  const [updated] = await db
    .update(plansOfCare)
    .set({ status: "archived", archivedAt: now, endDate: plan.endDate ?? now, updatedAt: now })
    .where(and(eq(plansOfCare.id, plan.id), ne(plansOfCare.status, "archived")))
    .returning({ id: plansOfCare.id, status: plansOfCare.status });

  if (!updated) {
    return NextResponse.json(
      { error: "This plan of care is already archived." },
      { status: 409 }
    );
  }
  return NextResponse.json({ plan: updated });
}
