import type { NavItem } from "@/components/app-shell";

// Sections of the Settings page; each is an anchor (#id) on /settings.
export const SETTINGS_SECTIONS = [
  { id: "personal-details", label: "Personal details" },
  { id: "notifications", label: "Notifications" },
  { id: "security", label: "Security" },
  { id: "accessibility", label: "Accessibility" },
] as const;

// Sidebar links per role. Every role gets Settings, with its sections nested underneath.
export function navForRole(role: string): NavItem[] {
  const settings: NavItem = {
    label: "Settings",
    href: "/settings",
    children: SETTINGS_SECTIONS.map((s) => ({ label: s.label, href: `/settings#${s.id}` })),
  };
  if (role === "physician") {
    return [
      { label: "Patients", href: "/physician" },
      { label: "Manage Activities", href: "/physician/activities" },
      settings,
    ];
  }
  if (role === "patient") {
    return [
      { label: "My Plans of Care", href: "/patient" },
      { label: "My Activities", href: "/patient/activities" },
      settings,
    ];
  }
  return [settings];
}
