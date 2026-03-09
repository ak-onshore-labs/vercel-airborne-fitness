import { useDispatch, useSelector } from "react-redux";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { AdminRootState } from "../store";
import type { AdminSection } from "../store/slices/adminUiSlice";
import { setActiveSection, setMobileMenuOpen } from "../store/slices/adminUiSlice";
import { ADMIN_MENU, sectionToHash } from "../constants";

export function AdminSidebar() {
  const dispatch = useDispatch();
  const activeSection = useSelector(
    (s: AdminRootState) => s.adminUi.activeSection
  );
  const collapsed = useSelector((s: AdminRootState) => s.adminUi.sidebarCollapsed);
  const mobileMenuOpen = useSelector((s: AdminRootState) => s.adminUi.mobileMenuOpen);

  const handleNav = (id: AdminSection) => {
    dispatch(setActiveSection(id));
    window.location.hash = sectionToHash(id);
    dispatch(setMobileMenuOpen(false));
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden",
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => dispatch(setMobileMenuOpen(false))}
      />
      <aside
        className={cn(
          "flex flex-col border-r z-50 shrink-0",
          "bg-background",
          "fixed inset-y-0 left-0 w-56 transition-transform duration-200 ease-out",
          "md:static md:transition-[width]",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-16" : "md:w-56"
        )}
      >
        <div className="flex h-14 items-center border-b px-4 shrink-0">
          {(!collapsed || mobileMenuOpen) && (
            <Link href="/admin" className="font-semibold">
              Admin
            </Link>
          )}
        </div>
        <nav className="flex-1 space-y-0.5 p-2 overflow-y-auto">
          {ADMIN_MENU.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleNav(id)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                activeSection === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {(!collapsed || mobileMenuOpen) && <span>{label}</span>}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
