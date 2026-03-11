import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useMember } from "@/context/MemberContext";
import type { AdminRootState } from "./store";
import type { AdminSection } from "./store/slices/adminUiSlice";
import {
  getPermissions,
  type AdminRole,
  type ScreenPermission,
} from "./permissions";
import { ADMIN_MENU } from "./constants";

const NO_PERMISSION: ScreenPermission = {
  VIEW: false,
  ADD: false,
  EDIT: false,
  DELETE: false,
};

/**
 * Returns permissions for the given section (or current admin section) based on logged-in user role.
 * ADMIN: all true; STAFF: only VIEW true; MEMBER or no user: all false.
 */
export function useAdminPermissions(
  section?: AdminSection
): ScreenPermission & { role: AdminRole | null } {
  const { user } = useMember();
  const activeSection = useSelector(
    (s: AdminRootState) => s.adminUi.activeSection
  );
  const targetSection = section ?? activeSection;
  return useMemo(() => {
    const role = (user?.userRole === "ADMIN" || user?.userRole === "STAFF"
      ? user.userRole
      : null) as AdminRole | null;
    if (!role) return { ...NO_PERMISSION, role: null };
    return { ...getPermissions(role, targetSection), role };
  }, [user?.userRole, targetSection]);
}

/** Whether the current user can view the given section (for sidebar). */
export function useCanViewSection(section: AdminSection): boolean {
  const { user } = useMember();
  return useMemo(() => {
    if (user?.userRole !== "ADMIN" && user?.userRole !== "STAFF") return false;
    const perm = getPermissions(user.userRole as AdminRole, section);
    return perm.VIEW;
  }, [user?.userRole, section]);
}

/** Section IDs the current user can view (for filtering sidebar menu). */
export function useViewableSections(): AdminSection[] {
  const { user } = useMember();
  return useMemo(() => {
    if (user?.userRole !== "ADMIN" && user?.userRole !== "STAFF") return [];
    const role = user.userRole as AdminRole;
    return ADMIN_MENU.filter(({ id }) => getPermissions(role, id).VIEW).map(
      ({ id }) => id
    );
  }, [user?.userRole]);
}
