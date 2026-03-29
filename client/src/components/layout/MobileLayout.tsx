import { Link, useLocation } from "wouter";
import { Home, Calendar, User, Dumbbell, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMember } from "@/context/MemberContext";
import { AirborneLogo } from "@/components/AirborneLogo";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useMember();
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [location]);

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/book", icon: Calendar, label: "Book" },
    { href: "/sessions", icon: Dumbbell, label: "Sessions" },
    { href: "/profile", icon: User, label: "Profile" },
  ];
  const showAdminPortal =
    user?.userRole === "ADMIN" || user?.userRole === "STAFF";

  const isAuthPage = location === "/login" || location === "/";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0B0B0C] text-gray-900 dark:text-[#EDEDED] font-sans">
      <div className="max-w-md mx-auto min-h-screen relative bg-white dark:bg-[#111113] shadow-xl dark:shadow-black/30 flex flex-col">
        {!isAuthPage && (
          <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0B0B0C]/90 backdrop-blur-md border-b border-gray-100 dark:border-white/5 px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0" aria-hidden />
            <AirborneLogo className="h-10 object-contain shrink-0" alt="Airborne" />
            <div className="flex-1 min-w-0 flex justify-end">
              {showAdminPortal && (
                <Link href="/admin">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground gap-1.5 text-xs font-medium"
                    asChild
                  >
                    <a>
                      <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="hidden sm:inline">Admin Portal</span>
                    </a>
                  </Button>
                </Link>
              )}
            </div>
          </header>
        )}
        <main ref={mainRef} className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
          {children}
        </main>
        {!isAuthPage && (
          <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-white dark:bg-[#0B0B0C] border-t border-gray-100 dark:border-white/6 pb-safe">
            <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-airborne-deep/60 via-airborne-teal to-airborne-deep/60 opacity-85 dark:opacity-95 shadow-[0_0_4px_rgba(4,192,193,0.08)] dark:shadow-[0_0_14px_rgba(4,192,193,0.15)]" aria-hidden />
            <div className="flex justify-around items-center h-16 px-2 relative">
              {navItems.map((item) => {
                const isActive = location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <a className={cn("flex flex-col items-center justify-center w-full h-full space-y-1 transition-all rounded", isActive ? "text-airborne-teal" : "text-gray-400 dark:text-[#6B7280]")}>
                      <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                      <span className="text-[10px] font-medium">{item.label}</span>
                    </a>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
