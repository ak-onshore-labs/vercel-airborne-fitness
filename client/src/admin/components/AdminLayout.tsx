import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation } from "wouter";
import { AdminSidebar } from "./AdminSidebar";
import { ADMIN_SECTION_COMPONENTS } from "../routes";
import { hashToSection, sectionToHash } from "../constants";
import { setActiveSection, toggleMobileMenu } from "../store/slices/adminUiSlice";
import type { AdminRootState } from "../store";
import type { AdminSection } from "../store/slices/adminUiSlice";
import { useViewableSections, useAdminPermissions } from "../useAdminPermissions";
import { getDefaultAdminSection } from "../permissions";
import { Menu, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

function getHashSection(): AdminSection {
  return hashToSection(window.location.hash);
}

export function AdminLayout() {
  const dispatch = useDispatch();
  const [, setLocation] = useLocation();
  const { role } = useAdminPermissions();
  const activeSection = useSelector(
    (s: AdminRootState) => s.adminUi.activeSection
  );
  const viewableSections = useViewableSections();

  useEffect(() => {
    if (viewableSections.length === 0) {
      setLocation("/dashboard");
    }
  }, [viewableSections.length, setLocation]);

  useEffect(() => {
    const syncFromHash = () => dispatch(setActiveSection(getHashSection()));
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [dispatch]);

  useEffect(() => {
    if (viewableSections.length === 0) return;

    const hash = window.location.hash;
    const fallback = viewableSections[0] ?? getDefaultAdminSection(role);
    if (!hash || hash === "#") {
      window.location.hash = sectionToHash(fallback);
      dispatch(setActiveSection(fallback));
      return;
    }
    const section = getHashSection();
    if (!viewableSections.includes(section)) {
      window.location.hash = sectionToHash(fallback);
      dispatch(setActiveSection(fallback));
    }
  }, [dispatch, viewableSections, role]);

  const canRenderSection =
    viewableSections.length > 0 && viewableSections.includes(activeSection);
  const SectionComponent = canRenderSection ? ADMIN_SECTION_COMPONENTS[activeSection] : null;

  if (viewableSections.length === 0) {
    return null;
  }

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
