import { ChatScreen } from "@/components/chat/chat-screen";

export default async function PlanChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ChatScreen planId={id} backHref="/patient" />;
}
