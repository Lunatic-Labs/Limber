import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getPlanForUser, getRecentMessages } from "@/lib/chat";
import { ChatView } from "./chat-view";

// Server-side wrapper shared by the patient and physician chat pages.
// Verifies the signed-in user belongs to the plan, loads the history,
// and hands it to the client chat UI.
export async function ChatScreen({
  planId,
  backHref,
}: {
  planId: string;
  backHref: string;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const plan = await getPlanForUser(planId, session.user.id);
  if (!plan) notFound();

  const otherUserId =
    plan.patientUserId === session.user.id
      ? plan.physicianUserId
      : plan.patientUserId;

  const [other] = await db
    .select({ name: users.name, username: users.username })
    .from(users)
    .where(eq(users.id, otherUserId))
    .limit(1);

  const initialMessages = await getRecentMessages(plan.id);

  return (
    <ChatView
      planOfCareId={plan.id}
      planTitle={plan.title}
      currentUserId={session.user.id}
      otherName={other?.name ?? other?.username ?? "Unknown"}
      initialMessages={initialMessages}
      backHref={backHref}
    />
  );
}
