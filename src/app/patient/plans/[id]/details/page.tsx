import { PlanDetailsScreen } from "@/components/plans/plan-details-screen";

export default async function PlanDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PlanDetailsScreen
      planId={id}
      chatHref={`/patient/plans/${id}`}
      backHref="/patient"
    />
  );
}
