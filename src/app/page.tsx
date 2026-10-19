import { redirect } from "next/navigation";
import { auth } from "@/auth";

// Sends a signed-in user straight to their role's dashboard.
// Administrators land on the invite/user-list view (V2).
export default async function Home() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "physician") {
    redirect("/physician");
  }

  if (session.user.role === "patient") {
    redirect("/patient");
  }

  if (session.user.role === "administrator") {
    redirect("/admin");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-24">
      <h1 className="text-2xl font-semibold">Limber</h1>
      <p className="text-gray-600">
        Signed in as {session.user.name ?? session.user.email} (
        {session.user.role}). No dashboard is built for this role yet.
      </p>
    </main>
  );
}
