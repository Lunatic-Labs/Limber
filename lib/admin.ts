import { auth } from "@/auth";

// Server-side admin check for Route Handlers (middleware gates pages;
// every admin API re-checks, since middleware only covers the matcher).
export async function getAdminSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== "administrator") return null;
  return session;
}
