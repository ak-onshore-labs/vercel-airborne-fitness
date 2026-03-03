import { useDispatch, useSelector } from "react-redux";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import type { AdminRootState } from "../store";
import type { AdminSection } from "../store/slices/adminUiSlice";
import { setActiveSection } from "../store/slices/adminUiSlice";
import { ADMIN_MENU, sectionToHash } from "../constants";

export function AdminSidebar() {
  const dispatch = useDispatch();
  const activeSection = useSelector(
    (s: AdminRootState) => s.adminUi.activeSection
  );
  const collapsed = useSelector((s: AdminRootState) => s.adminUi.sidebarCollapsed);

  const handleNav = (id: AdminSection) => {
    dispatch(setActiveSection(id));
    window.location.hash = sectionToHash(id);
  };

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-muted/30 transition-[width]",
        collapsed ? "w-16" : "w-56"
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        {!collapsed && (
          <Link href="/admin" className="font-semibold">
            Admin
          </Link>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
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
            {!collapsed && <span>{label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  );
}
