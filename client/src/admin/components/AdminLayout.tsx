import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AdminSidebar } from "./AdminSidebar";
import { ADMIN_SECTION_COMPONENTS } from "../routes";
import { hashToSection } from "../constants";
import { setActiveSection } from "../store/slices/adminUiSlice";
import type { AdminRootState } from "../store";
import type { AdminSection } from "../store/slices/adminUiSlice";

function getHashSection(): AdminSection {
  return hashToSection(window.location.hash);
}

export function AdminLayout() {
  const dispatch = useDispatch();
  const activeSection = useSelector(
    (s: AdminRootState) => s.adminUi.activeSection
  );

  useEffect(() => {
    const syncFromHash = () => dispatch(setActiveSection(getHashSection()));
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [dispatch]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === "#") {
      window.location.hash = "#/dashboard";
      dispatch(setActiveSection("dashboard"));
    }
  }, [dispatch]);

  const SectionComponent = ADMIN_SECTION_COMPONENTS[activeSection];

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-auto bg-background">
        {SectionComponent && <SectionComponent />}
      </main>
    </div>
  );
}
