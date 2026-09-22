import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { patientProfiles, users } from "@/db/schema";

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

  return (
    <main className="space-y-4">
      <h1 className="text-xl font-semibold">Your patients</h1>

      {patients.length === 0 ? (
        <p className="text-gray-600">No patients are assigned to you yet.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded border border-gray-200">
          {patients.map((patient) => (
            <li key={patient.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">{patient.name ?? patient.username}</p>
                <p className="text-sm text-gray-500">@{patient.username}</p>
              </div>
              {/* TODO: link to a per-patient view (plans of care, messages)
                  once those pages exist. */}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
