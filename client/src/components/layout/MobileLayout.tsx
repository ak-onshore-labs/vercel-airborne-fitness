import { Link, useLocation } from "wouter";
import { Home, Calendar, User, Dumbbell, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMember } from "@/context/MemberContext";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useMember();

  const baseNavItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/book", icon: Calendar, label: "Book" },
    { href: "/sessions", icon: Dumbbell, label: "Sessions" },
    { href: "/profile", icon: User, label: "Profile" },
  ];
  const showAdmin = user?.userRole === "ADMIN" || user?.userRole === "STAFF";
  const navItems = showAdmin
    ? [...baseNavItems, { href: "/admin", icon: Shield, label: "Admin" }]
    : baseNavItems;

  const isAuthPage = location === "/login" || location === "/";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <div className="max-w-md mx-auto min-h-screen relative bg-white dark:bg-gray-800 shadow-xl flex flex-col">
        {!isAuthPage && (
          <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-700 px-6 h-16 flex items-center justify-center">
            <img src="/logo.png" alt="Airborne" className="h-10 object-contain" />
          </header>
        )}
        <main className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
          {children}
        </main>
        {!isAuthPage && (
          <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 pb-safe">
            <div className="flex justify-around items-center h-16 px-2">
              {navItems.map((item) => {
                const isActive = item.href === "/admin" ? location === "/admin" : location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href}>
                    <a className={cn("flex flex-col items-center justify-center w-full h-full space-y-1 transition-all rounded", isActive ? "text-airborne-teal" : "text-gray-400 dark:text-gray-500")}>
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
