import { ConversationDetails } from "@/components/chat/conversation-details";

export default async function PlanConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string | string[]; edit?: string | string[] }>;
}) {
  const { id } = await params;
  const { tab, edit } = await searchParams;
  return (
    <ConversationDetails
      planId={id}
      chatHref={`/patient/plans/${id}`}
      tab={tab}
      edit={edit}
    />
  );
}
