import { PageHeader, EmptyState } from "@/components/ui/page-header";

export default function PhysicianActivitiesPage() {
  return (
    <main>
      <PageHeader title="Manage Activities" />
      <EmptyState>Activities you assign to patients will be managed here.</EmptyState>
    </main>
  );
}
