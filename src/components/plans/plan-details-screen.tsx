import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getPlanForUser } from "@/lib/chat";
import { canEditPlan } from "@/lib/plans-shared";
import { PlanDetails } from "./plan-details";

// Server wrapper shared by the patient and physician details pages.
// Both roles can view; only the plan's physician gets the edit form.
export async function PlanDetailsScreen({
  planId,
  chatHref,
  backHref,
}: {
  planId: string;
  chatHref: string;
  backHref: string;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const plan = await getPlanForUser(planId, session.user.id);
  if (!plan) notFound();

  const [patient] = await db
    .select({ name: users.name, username: users.username })
    .from(users)
    .where(eq(users.id, plan.patientUserId))
    .limit(1);
  const [physician] = await db
    .select({ name: users.name, username: users.username })
    .from(users)
    .where(eq(users.id, plan.physicianUserId))
    .limit(1);

  const canEdit =
    session.user.role === "physician" &&
    plan.physicianUserId === session.user.id &&
    canEditPlan(plan.status);

  return (
    <PlanDetails
      planId={plan.id}
      status={plan.status}
      title={plan.title}
      diagnosis={plan.diagnosis ?? ""}
      description={plan.description ?? ""}
      startDate={plan.startDate.toISOString().slice(0, 10)}
      patientName={patient?.name ?? patient?.username ?? "Unknown"}
      physicianName={physician?.name ?? physician?.username ?? "Unknown"}
      canEdit={canEdit}
      chatHref={chatHref}
      backHref={backHref}
    />
  );
}
