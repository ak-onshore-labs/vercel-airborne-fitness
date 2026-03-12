import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "wouter";
import { AdminSidebar } from "./AdminSidebar";
import { ADMIN_SECTION_COMPONENTS } from "../routes";
import { hashToSection, sectionToHash } from "../constants";
import { setActiveSection, toggleMobileMenu } from "../store/slices/adminUiSlice";
import type { AdminRootState } from "../store";
import type { AdminSection } from "../store/slices/adminUiSlice";
import { useViewableSections } from "../useAdminPermissions";
import { Menu, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

function getHashSection(): AdminSection {
  return hashToSection(window.location.hash);
}

export function AdminLayout() {
  const dispatch = useDispatch();
  const activeSection = useSelector(
    (s: AdminRootState) => s.adminUi.activeSection
  );
  const viewableSections = useViewableSections();

  useEffect(() => {
    const syncFromHash = () => dispatch(setActiveSection(getHashSection()));
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [dispatch]);

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === "#") {
      const first = viewableSections[0] ?? "dashboard";
      window.location.hash = sectionToHash(first);
      dispatch(setActiveSection(first));
      return;
    }
    const section = getHashSection();
    if (viewableSections.length > 0 && !viewableSections.includes(section)) {
      const first = viewableSections[0];
      window.location.hash = sectionToHash(first);
      dispatch(setActiveSection(first));
    }
  }, [dispatch, viewableSections]);

  const SectionComponent = ADMIN_SECTION_COMPONENTS[activeSection];

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background px-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => dispatch(toggleMobileMenu())}
              className="md:hidden p-2 -ml-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
            <span className="font-semibold">Admin</span>
          </div>
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-1.5 text-sm font-medium"
              asChild
            >
              <a>
                <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
                Member App
              </a>
            </Button>
          </Link>
        </header>
        <main className="flex-1 overflow-auto bg-background">
          {SectionComponent && <SectionComponent />}
        </main>
      </div>
    </div>
  );
}
