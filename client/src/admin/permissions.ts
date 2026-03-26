import type { AdminSection } from "./store/slices/adminUiSlice";

export type AdminRole = "ADMIN" | "STAFF";

export interface ScreenPermission {
  VIEW: boolean;
  ADD: boolean;
  EDIT: boolean;
  DELETE: boolean;
}

/** Per-role, per-screen permissions. ADMIN: all true. STAFF: only VIEW true. */
export const ADMIN_ACCESS: Record<AdminSection, { screen: string; functionality: ScreenPermission }> = {
  dashboard: {
    screen: "Dashboard",
    functionality: { VIEW: true, ADD: true, EDIT: true, DELETE: true },
  },
  users: {
    screen: "Users",
    functionality: { VIEW: true, ADD: true, EDIT: true, DELETE: true },
  },
  schedule: {
    screen: "Schedule",
    functionality: { VIEW: true, ADD: true, EDIT: true, DELETE: true },
  },
  "class-types": {
    screen: "Class Types",
    functionality: { VIEW: true, ADD: true, EDIT: true, DELETE: true },
  },
  plans: {
    screen: "Plans",
    functionality: { VIEW: true, ADD: true, EDIT: true, DELETE: true },
  },
  members: {
    screen: "Members",
    functionality: { VIEW: true, ADD: true, EDIT: true, DELETE: true },
  },
  memberships: {
    screen: "Memberships",
    functionality: { VIEW: true, ADD: true, EDIT: true, DELETE: true },
  },
  bookings: {
    screen: "Bookings",
    functionality: { VIEW: true, ADD: true, EDIT: true, DELETE: true },
  },
  settings: {
    screen: "Settings",
    functionality: { VIEW: true, ADD: true, EDIT: true, DELETE: true },
  },
};

export const STAFF_ACCESS: Record<AdminSection, { screen: string; functionality: ScreenPermission }> = {
  dashboard: {
    screen: "Dashboard",
    functionality: { VIEW: false, ADD: false, EDIT: false, DELETE: false },
  },
  users: {
    screen: "Users",
    functionality: { VIEW: false, ADD: false, EDIT: false, DELETE: false },
  },
  schedule: {
    screen: "Schedule",
    functionality: { VIEW: true, ADD: false, EDIT: false, DELETE: false },
  },
  "class-types": {
    screen: "Class Types",
    functionality: { VIEW: true, ADD: false, EDIT: false, DELETE: false },
  },
  plans: {
    screen: "Plans",
    functionality: { VIEW: true, ADD: false, EDIT: false, DELETE: false },
  },
  members: {
    screen: "Members",
    functionality: { VIEW: true, ADD: true, EDIT: true, DELETE: true },
  },
  memberships: {
    screen: "Memberships",
    functionality: { VIEW: true, ADD: true, EDIT: true, DELETE: true },
  },
  bookings: {
    screen: "Bookings",
    functionality: { VIEW: true, ADD: true, EDIT: true, DELETE: true },
  },
  settings: {
    screen: "Settings",
    functionality: { VIEW: true, ADD: false, EDIT: false, DELETE: false },
  },
};

const ROLE_ACCESS: Record<AdminRole, Record<AdminSection, { screen: string; functionality: ScreenPermission }>> = {
  ADMIN: ADMIN_ACCESS,
  STAFF: STAFF_ACCESS,
};

export function getPermissions(
  role: AdminRole,
  section: AdminSection
): ScreenPermission {
  return ROLE_ACCESS[role][section].functionality;
}

export function canView(role: AdminRole, section: AdminSection): boolean {
  return getPermissions(role, section).VIEW;
}
