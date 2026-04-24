import { createSlice } from "@reduxjs/toolkit";

export type AdminSection =
  | "dashboard"
  | "users"
  | "schedule"
  | "class-types"
  | "plans"
  | "members"
  | "memberships"
  | "bookings"
  | "transactions"
  | "settings";

export interface AdminUiState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  activeSection: AdminSection;
}

const initialState: AdminUiState = {
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  activeSection: "dashboard",
};

const adminUiSlice = createSlice({
  name: "admin/ui",
  initialState,
  reducers: {
    setSidebarCollapsed: (state, action: { payload: boolean }) => {
      state.sidebarCollapsed = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setMobileMenuOpen: (state, action: { payload: boolean }) => {
      state.mobileMenuOpen = action.payload;
    },
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },
    setActiveSection: (state, action: { payload: AdminSection }) => {
      state.activeSection = action.payload;
    },
  },
});

export const { setSidebarCollapsed, toggleSidebar, setMobileMenuOpen, toggleMobileMenu, setActiveSection } =
  adminUiSlice.actions;
export default adminUiSlice.reducer;
