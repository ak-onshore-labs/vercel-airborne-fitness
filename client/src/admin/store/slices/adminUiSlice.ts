import { createSlice } from "@reduxjs/toolkit";

export type AdminSection =
  | "dashboard"
  | "users"
  | "schedule"
  | "class-types"
  | "plans"
  | "members"
  | "bookings"
  | "settings";

export interface AdminUiState {
  sidebarCollapsed: boolean;
  activeSection: AdminSection;
}

const initialState: AdminUiState = {
  sidebarCollapsed: false,
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
    setActiveSection: (state, action: { payload: AdminSection }) => {
      state.activeSection = action.payload;
    },
  },
});

export const { setSidebarCollapsed, toggleSidebar, setActiveSection } =
  adminUiSlice.actions;
export default adminUiSlice.reducer;
