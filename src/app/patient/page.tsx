import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader, EmptyState } from "@/components/ui/page-header";
import { patientProfiles, plansOfCare, users } from "@/db/schema";

export default async function PatientDashboard() {
  const session = await auth();
  const patientId = session!.user.id;

  const [profile] = await db
    .select({
      physicianName: users.name,
      physicianUsername: users.username,
    })
    .from(patientProfiles)
    .innerJoin(users, eq(patientProfiles.physicianUserId, users.id))
    .where(eq(patientProfiles.userId, patientId));

  const pocs = await db
    .select()
    .from(plansOfCare)
    .where(eq(plansOfCare.patientUserId, patientId));

  const physicianName = profile?.physicianName ?? profile?.physicianUsername;

  return (
    <main className="space-y-8">
      <PageHeader title="My Dashboard" />

      <section aria-label="Your physician">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Your physician
        </h2>
        {profile && physicianName ? (
          <div className="flex items-center gap-3 rounded-xl border border-brand-100 bg-card p-5 shadow-sm">
            <Avatar name={physicianName} />
            <div>
              <p className="text-lg font-semibold">{physicianName}</p>
              <p className="text-sm text-ink-muted">@{profile.physicianUsername}</p>
            </div>
          </div>
        ) : (
          <EmptyState>No physician is assigned yet.</EmptyState>
        )}
      </section>

      <section aria-label="Plans of care">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Plans of care
        </h2>
        {pocs.length === 0 ? (
          <EmptyState>No plans of care yet.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {pocs.map((poc) => (
              <li key={poc.id}>
                <Link
                  href={`/patient/plans/${poc.id}`}
                  className="flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-brand-100 bg-card p-5 shadow-sm transition duration-fast hover:bg-brand-50 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  <div className="space-y-1">
                    <p className="text-lg font-semibold">{poc.title}</p>
                    {poc.diagnosis && (
                      <p className="text-sm text-ink-muted">{poc.diagnosis}</p>
                    )}
                    <StatusBadge status={poc.status} />
                  </div>
                  <span className="shrink-0 text-sm font-medium text-brand-700">
                    Messages &rsaquo;
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      {/* TODO: calendar view lands here once built. */}
    </main>
  );
}
