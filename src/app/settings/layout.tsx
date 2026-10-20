import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { navForRole } from "@/components/nav";

const ROLE_LABELS: Record<string, string> = {
  patient: "Patient",
  physician: "Physician",
  administrator: "Administrator",
};

// Settings is available to every signed-in role.
export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/settings");

  const role = session.user.role;
  const home = role === "physician" ? "/physician" : role === "patient" ? "/patient" : "/";

  return (
    <AppShell
      nav={navForRole(role)}
      userName={session.user.name ?? ROLE_LABELS[role] ?? "User"}
      roleLabel={ROLE_LABELS[role] ?? role}
      homeHref={home}
    >
      {children}
    </AppShell>
  );
}
