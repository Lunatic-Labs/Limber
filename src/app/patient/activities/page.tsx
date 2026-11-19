import { PageHeader, EmptyState } from "@/components/ui/page-header";

export default function PatientActivitiesPage() {
  return (
    <main>
      <PageHeader title="My Activities" />
      <EmptyState>Your activities will show up here.</EmptyState>
    </main>
  );
}
