import { asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { invitations, users } from "@/db/schema";
import { invitationStatus } from "@/lib/invitations";
import { InviteForm } from "@/components/admin/invite-form";
import { RevokeInviteButton } from "@/components/admin/revoke-invite-button";

const ROLE_LABEL = {
  patient: "Patient",
  physician: "Physician",
  administrator: "Administrator",
} as const;

export default async function AdminDashboard() {
  const [allUsers, pending] = await Promise.all([
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
  ]);

  const physicians = allUsers
    .filter((u) => u.role === "physician")
    .map((u) => ({ id: u.id, label: u.name ?? u.username }));

  const now = new Date();
  const outstanding = pending
    .map((inv) => ({ ...inv, status: invitationStatus(inv, now) }))
    .filter((inv) => inv.status === "pending" || inv.status === "expired");

  return (
    <main className="mx-auto max-w-4xl space-y-10">
      <section className="space-y-3">
        <h1 className="text-xl font-semibold">Invite a user</h1>
        <InviteForm physicians={physicians} />
      </section>

      {outstanding.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Outstanding invitations</h2>
          <ul className="divide-y divide-gray-200 rounded border border-gray-200">
            {outstanding.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{inv.email}</p>
                  <p className="text-gray-500">
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
        <h2 className="text-lg font-semibold">Users ({allUsers.length})</h2>
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {allUsers.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-2">{u.name ?? u.username}</td>
                  <td className="px-4 py-2">{u.email ?? "—"}</td>
                  <td className="px-4 py-2">{ROLE_LABEL[u.role]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
