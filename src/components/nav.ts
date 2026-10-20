import type { NavItem } from "@/components/app-shell";

// Sidebar links per role. Every role gets Settings (accessibility).
export function navForRole(role: string): NavItem[] {
  const settings = { label: "Settings", href: "/settings" };
  if (role === "physician") return [{ label: "Patients", href: "/physician" }, settings];
  if (role === "patient") return [{ label: "My Plans of Care", href: "/patient" }, settings];
  return [settings];
}
