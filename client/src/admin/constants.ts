import type { AdminSection } from "./store/slices/adminUiSlice";

export const ADMIN_MENU: { id: AdminSection; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "users", label: "Users" },
  { id: "schedule", label: "Schedule" },
  { id: "class-types", label: "Class Types" },
  { id: "plans", label: "Plans" },
  { id: "members", label: "Members" },
  { id: "memberships", label: "Memberships" },
  { id: "bookings", label: "Bookings" },
  { id: "settings", label: "Settings" },
];

export const DEFAULT_SECTION: AdminSection = "dashboard";

export function hashToSection(hash: string): AdminSection {
  const normalized = hash.replace(/^#\/?/, "").toLowerCase() || DEFAULT_SECTION;
  const valid: AdminSection[] = [
    "dashboard",
    "users",
    "schedule",
    "class-types",
    "plans",
    "members",
    "memberships",
    "bookings",
    "settings",
  ];
  return valid.includes(normalized as AdminSection)
    ? (normalized as AdminSection)
    : DEFAULT_SECTION;
}

export function sectionToHash(section: AdminSection): string {
  return `#/${section}`;
}
