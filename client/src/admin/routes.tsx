import type { ComponentType } from "react";
import type { AdminSection } from "./store/slices/adminUiSlice";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";
import AdminSchedule from "./pages/AdminSchedule";
import AdminClassTypes from "./pages/AdminClassTypes";
import AdminPlans from "./pages/AdminPlans";
import AdminMembers from "./pages/AdminMembers";
import AdminMemberships from "./pages/AdminMemberships";
import AdminBookings from "./pages/AdminBookings";
import AdminTransactions from "./pages/AdminTransactions";
import AdminSettings from "./pages/AdminSettings";

export const ADMIN_SECTION_COMPONENTS: Record<AdminSection, ComponentType> = {
  dashboard: AdminDashboard,
  users: AdminUsers,
  schedule: AdminSchedule,
  "class-types": AdminClassTypes,
  plans: AdminPlans,
  members: AdminMembers,
  memberships: AdminMemberships,
  bookings: AdminBookings,
  transactions: AdminTransactions,
  settings: AdminSettings,
};
