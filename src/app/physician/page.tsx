import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
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
      status: plansOfCare.status,
      patientUserId: plansOfCare.patientUserId,
    })
    .from(plansOfCare)
    .where(eq(plansOfCare.physicianUserId, physicianId));

  return (
    <main className="space-y-4">
      <h1 className="text-xl font-semibold">Your patients</h1>

      {patients.length === 0 ? (
        <p className="text-gray-600">No patients are assigned to you yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded border border-gray-200">
          {patients.map((patient) => {
            const patientPlans = plans.filter(
              (p) => p.patientUserId === patient.id
            );
            return (
              <li key={patient.id} className="px-4 py-3">
                <p className="font-medium">{patient.name ?? patient.username}</p>
                <p className="text-sm text-gray-500">@{patient.username}</p>
                {patientPlans.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">
                    No plans of care yet.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1">
                    {patientPlans.map((plan) => (
                      <li key={plan.id}>
                        <Link
                          href={`/physician/plans/${plan.id}`}
                          className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"
                        >
                          <span>
                            {plan.title}{" "}
                            <span className="text-gray-500 capitalize">
                              &middot; {plan.status}
                            </span>
                          </span>
                          <span className="text-gray-500">Messages &rsaquo;</span>
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
