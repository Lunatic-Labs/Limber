import { auth } from "@/auth";
import { getPreferences } from "@/lib/preferences";
import { PageHeader } from "@/components/ui/page-header";
import { AccessibilitySettings } from "@/components/settings/accessibility-settings";

export const metadata = { title: "Settings · Limber" };

export default async function SettingsPage() {
  const session = await auth();
  // The layout already guards this; the non-null check satisfies types.
  const prefs = await getPreferences(session!.user.id);

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Accessibility: choose what works best for you. Changes apply right away and follow you on any device."
      />
      <AccessibilitySettings initial={prefs} />
    </>
  );
}
