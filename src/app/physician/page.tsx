import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { ButtonLink } from "@/components/ui/button";
import { patientProfiles, plansOfCare, users } from "@/db/schema";

export default async function PhysicianDashboard() {
  const session = await auth();
  // Layout already guarantees a physician session by the time we
  // get here, but TypeScript doesn't know that — narrow it here.
  const physicianId = session!.user.id;

  const patients = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
    })
    .from(patientProfiles)
    .innerJoin(users, eq(patientProfiles.userId, users.id))
    .where(eq(patientProfiles.physicianUserId, physicianId));

  const plans = await db
    .select({
      id: plansOfCare.id,
      title: plansOfCare.title,
      diagnosis: plansOfCare.diagnosis,
      status: plansOfCare.status,
      patientUserId: plansOfCare.patientUserId,
    })
    .from(plansOfCare)
    .where(eq(plansOfCare.physicianUserId, physicianId));

  return (
    <main>
      <PageHeader
        title="Your patients"
        subtitle="Select a plan of care to open the conversation."
      />
      {patients.length > 0 && (
        <div className="mb-6">
          <ButtonLink href="/physician/plans/new">New plan of care</ButtonLink>
        </div>
      )}

      {patients.length === 0 ? (
        <EmptyState>No patients are assigned to you yet.</EmptyState>
      ) : (
        <ul className="space-y-4">
          {patients.map((patient) => {
            const patientPlans = plans.filter(
              (p) => p.patientUserId === patient.id
            );
            const displayName = patient.name ?? patient.username;
            return (
              <li
                key={patient.id}
                className="rounded-xl border border-brand-100 bg-card p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={displayName} />
                    <div>
                      <p className="text-lg font-semibold">{displayName}</p>
                      <p className="text-sm text-ink-muted">@{patient.username}</p>
                    </div>
                  </div>
                  <ButtonLink
                    href={`/physician/plans/new?patient=${patient.id}`}
                    variant="secondary"
                  >
                    New plan
                  </ButtonLink>
                </div>
                {patientPlans.length === 0 ? (
                  <p className="mt-4 text-sm text-ink-muted">
                    No plans of care yet.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {patientPlans.map((plan) => (
                      <li key={plan.id}>
                        <Link
                          href={`/physician/plans/${plan.id}`}
                          className="flex min-h-[44px] items-center justify-between gap-3 rounded-lg border border-brand-100 px-4 py-2 transition duration-fast hover:bg-brand-50 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                        >
                          <span className="min-w-0">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{plan.title}</span>
                              <StatusBadge status={plan.status} />
                            </span>
                            {plan.diagnosis && (
                              <span className="mt-0.5 block truncate text-sm text-ink-muted">
                                {plan.diagnosis}
                              </span>
                            )}
                          </span>
                          <span className="shrink-0 text-sm font-medium text-brand-700">
                            Messages &rsaquo;
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
