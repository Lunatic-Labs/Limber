import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { navForRole } from "@/components/nav";

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "patient") {
    redirect("/");
  }

  return (
    <AppShell
      nav={navForRole("patient")}
      userName={session.user.name ?? "Patient"}
      roleLabel="Patient"
      homeHref="/patient"
    >
      {children}
    </AppShell>
  );
}
