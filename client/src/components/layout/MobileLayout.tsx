import { Link, useLocation } from "wouter";
import { Home, Calendar, User, Newspaper, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  // Simplified Navigation - Web-app style
  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/book", icon: Calendar, label: "Book" },
    { href: "/sessions", icon: Dumbbell, label: "Sessions" },
    { href: "/news", icon: Newspaper, label: "News" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  // Don't show nav on Login
  const isAuthPage = location === "/login" || location === "/";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <div className="max-w-md mx-auto min-h-screen relative bg-white shadow-xl overflow-hidden flex flex-col">
        {/* Header - Only on inner pages */}
        {!isAuthPage && (
          <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 h-14 flex items-center justify-center">
            <span className="font-bold tracking-tight text-lg">AIRBORNE</span>
          </header>
        )}

        <main className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
          {children}
        </main>
        
        {/* Bottom Navigation */}
        {!isAuthPage && (
          <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-white border-t border-gray-100 pb-safe">
            <div className="flex justify-around items-center h-16 px-2">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <a className={cn(
                      "flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 px-2 py-1 rounded-lg",
                      isActive ? "text-airborne-teal" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                    )}>
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
