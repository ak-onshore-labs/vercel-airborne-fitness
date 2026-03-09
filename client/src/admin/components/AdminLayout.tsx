import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AdminSidebar } from "./AdminSidebar";
import { ADMIN_SECTION_COMPONENTS } from "../routes";
import { hashToSection } from "../constants";
import { setActiveSection, toggleMobileMenu } from "../store/slices/adminUiSlice";
import type { AdminRootState } from "../store";
import type { AdminSection } from "../store/slices/adminUiSlice";
import { Menu } from "lucide-react";

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
      <div className="flex flex-1 flex-col min-w-0">
        <header className="md:hidden flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <button
            type="button"
            onClick={() => dispatch(toggleMobileMenu())}
            className="p-2 -ml-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <span className="font-semibold">Admin</span>
        </header>
        <main className="flex-1 overflow-auto bg-background">
          {SectionComponent && <SectionComponent />}
        </main>
      </div>
    </div>
  );
}
