import { ConversationDetails } from "@/components/chat/conversation-details";

export default async function PlanConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  return (
    <ConversationDetails
      planId={id}
      chatHref={`/physician/plans/${id}`}
      tab={tab}
    />
  );
}
