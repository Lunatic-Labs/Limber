import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { navForRole } from "@/components/nav";

// Defense in depth: middleware already blocks non-physicians from
// reaching anything under /physician, but each layout re-checks so
// a page never renders physician-only data if it's ever reached
// through a path the middleware matcher doesn't cover.
export default async function PhysicianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "physician") {
    redirect("/");
  }

  return (
    <AppShell
      nav={navForRole("physician")}
      userName={session.user.name ?? "Physician"}
      roleLabel="Physician"
      homeHref="/physician"
    >
      {children}
    </AppShell>
  );
}
