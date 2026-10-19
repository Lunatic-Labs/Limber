import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";

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
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <p className="text-sm text-gray-500">Limber &middot; Administrator</p>
          <p className="font-medium">{session.user.name ?? session.user.email}</p>
        </div>
        <SignOutButton />
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}
