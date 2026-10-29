import { asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { invitations, patientProfiles, users } from "@/db/schema";
import { invitationStatus } from "@/lib/invitations";
import { InviteForm } from "@/components/admin/invite-form";
import { PageHeader } from "@/components/ui/page-header";
import { ReassignPhysician } from "@/components/admin/reassign-physician";
import { RevokeInviteButton } from "@/components/admin/revoke-invite-button";

const ROLE_LABEL = {
  patient: "Patient",
  physician: "Physician",
  administrator: "Administrator",
} as const;

export default async function AdminDashboard() {
  const [allUsers, pending, assignments] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        role: users.role,
      })
      .from(users)
      .orderBy(asc(users.role), asc(users.name)),
    db
      .select()
      .from(invitations)
      .where(isNull(invitations.acceptedAt))
      .orderBy(desc(invitations.createdAt))
      .limit(100),
    db
      .select({
        patientId: patientProfiles.userId,
        physicianId: patientProfiles.physicianUserId,
      })
      .from(patientProfiles),
  ]);

  const physicianOf = new Map(assignments.map((a) => [a.patientId, a.physicianId]));

  const physicians = allUsers
    .filter((u) => u.role === "physician")
    .map((u) => ({ id: u.id, label: u.name ?? u.username }));

  const now = new Date();
  const outstanding = pending
    .map((inv) => ({ ...inv, status: invitationStatus(inv, now) }))
    .filter((inv) => inv.status === "pending" || inv.status === "expired");

  return (
    <main className="space-y-10">
      <PageHeader title="Users" subtitle="Invite people to Limber and see who has access." />
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          Invite a user
        </h2>
        <InviteForm physicians={physicians} />
      </section>

      {outstanding.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Outstanding invitations
          </h2>
          <ul className="divide-y divide-brand-100 rounded-xl border border-brand-100 bg-white shadow-sm">
            {outstanding.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <p className="font-medium">{inv.email}</p>
                  <p className="text-sm text-ink-muted">
                    {ROLE_LABEL[inv.role]} &middot;{" "}
                    {inv.status === "expired"
                      ? "Expired"
                      : `Expires ${inv.expiresAt.toLocaleDateString()}`}
                  </p>
                </div>
                <RevokeInviteButton id={inv.id} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          All users ({allUsers.length})
        </h2>
        <div className="overflow-x-auto rounded-xl border border-brand-100 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-50 text-brand-900">
              <tr>
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Physician</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-100">
              {allUsers.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3">{u.name ?? u.username}</td>
                  <td className="px-5 py-3">{u.email ?? "—"}</td>
                  <td className="px-5 py-3">{ROLE_LABEL[u.role]}</td>
                  <td className="px-5 py-3">
                    {u.role === "patient" ? (
                      <ReassignPhysician
                        patientId={u.id}
                        patientName={u.name ?? u.username}
                        currentPhysicianId={physicianOf.get(u.id) ?? null}
                        physicians={physicians}
                      />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
