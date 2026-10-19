import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";

// Defense in depth: middleware already blocks non-administrators from
// /admin, but the layout re-checks (same pattern as physician/patient).
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "administrator") {
    redirect("/");
  }

  return (
    <AppShell
      nav={[{ label: "Users", href: "/admin" }]}
      userName={session.user.name ?? "Administrator"}
      roleLabel="Administrator"
      homeHref="/admin"
    >
      {children}
    </AppShell>
  );
}
