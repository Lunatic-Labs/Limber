import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
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

  return (
    <main className="space-y-6">
      <section>
        <h1 className="text-xl font-semibold">Your physician</h1>
        {profile ? (
          <p className="text-gray-700">
            {profile.physicianName ?? profile.physicianUsername} (@
            {profile.physicianUsername})
          </p>
        ) : (
          <p className="text-gray-600">No physician is assigned yet.</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Your plans of care</h2>
        {pocs.length === 0 ? (
          <p className="text-gray-600">No plans of care yet.</p>
        ) : (
          <ul className="divide-y divide-gray-200 rounded border border-gray-200">
            {pocs.map((poc) => (
              <li key={poc.id} className="px-4 py-3">
                <p className="font-medium">{poc.title}</p>
                <p className="text-sm text-gray-500 capitalize">{poc.status}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      {/* TODO: messaging and calendar views land here once built. */}
    </main>
  );
}
