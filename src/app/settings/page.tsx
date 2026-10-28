import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { patientProfiles, users } from "@/db/schema";
import { getPreferences } from "@/lib/preferences";
import { PageHeader } from "@/components/ui/page-header";
import { SETTINGS_SECTIONS } from "@/components/nav";
import { SettingsSection } from "@/components/settings/settings-section";
import { PersonalDetails } from "@/components/settings/personal-details";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { AccessibilitySettings } from "@/components/settings/accessibility-settings";

export const metadata = { title: "Settings · Limber" };

const ROLE_LABELS: Record<string, string> = {
  patient: "Patient",
  physician: "Physician",
  administrator: "Administrator",
};

const title = (id: (typeof SETTINGS_SECTIONS)[number]["id"]) =>
  SETTINGS_SECTIONS.find((s) => s.id === id)!.label;

export default async function SettingsPage() {
  const session = await auth();
  // The layout already guards this; the non-null check satisfies types.
  const userId = session!.user.id;

  const [prefs, [me]] = await Promise.all([
    getPreferences(userId),
    db.select().from(users).where(eq(users.id, userId)).limit(1),
  ]);

  const rows = [
    { label: "Name", value: me?.name ?? "—" },
    { label: "Username", value: me?.username ?? "—" },
    { label: "Email", value: me?.email ?? "—" },
    { label: "Role", value: ROLE_LABELS[me?.role ?? ""] ?? "—" },
  ];
  if (me?.role === "patient") {
    const [row] = await db
      .select({ name: users.name })
      .from(patientProfiles)
      .innerJoin(users, eq(users.id, patientProfiles.physicianUserId))
      .where(eq(patientProfiles.userId, userId))
      .limit(1);
    rows.push({ label: "Physician", value: row?.name ?? "—" });
  }

  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-10">
        <SettingsSection id="personal-details" title={title("personal-details")}>
          <PersonalDetails rows={rows} />
        </SettingsSection>

        <SettingsSection
          id="notifications"
          title={title("notifications")}
          badge="Coming soon"
        >
          <NotificationSettings />
        </SettingsSection>

        <SettingsSection id="security" title={title("security")} badge="Coming soon">
          <div className="rounded-xl border border-brand-100 bg-card p-5 text-ink-muted shadow-sm">
            Changing your password will be available here in a future update.
          </div>
        </SettingsSection>

        <SettingsSection
          id="accessibility"
          title={title("accessibility")}
          description="Choose what works best for you. Changes apply right away and follow you on any device."
        >
          <AccessibilitySettings initial={prefs} />
        </SettingsSection>
      </div>
    </>
  );
}
