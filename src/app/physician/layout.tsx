import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";

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
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <p className="text-sm text-gray-500">Limber &middot; Physician</p>
          <p className="font-medium">{session.user.name}</p>
        </div>
        <SignOutButton />
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}
