import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { patientProfiles, users } from "@/db/schema";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { PlanForm } from "@/components/plans/plan-form";

export default async function NewPlanPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string }>;
}) {
  const session = await auth();
  const physicianId = session!.user.id;
  const { patient: preselected } = await searchParams;

  const patients = await db
    .select({ id: users.id, name: users.name, username: users.username })
    .from(patientProfiles)
    .innerJoin(users, eq(patientProfiles.userId, users.id))
    .where(eq(patientProfiles.physicianUserId, physicianId));

  return (
    <main className="mx-auto max-w-2xl">
      <PageHeader
        title="New plan of care"
        subtitle="Creating a plan also opens the conversation with your patient."
      />
      {patients.length === 0 ? (
        <EmptyState>
          No patients are assigned to you yet, so there is no one to create a
          plan for.
        </EmptyState>
      ) : (
        <PlanForm
          patients={patients.map((p) => ({
            id: p.id,
            label: p.name ?? p.username,
          }))}
          initialPatientId={
            patients.some((p) => p.id === preselected) ? preselected : undefined
          }
        />
      )}
    </main>
  );
}
