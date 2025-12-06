import { Link, useLocation } from "wouter";
import { Home, Calendar, User, Newspaper, Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/book", icon: Calendar, label: "Book" },
    { href: "/sessions", icon: Dumbbell, label: "My Sessions" },
    { href: "/news", icon: Newspaper, label: "News" },
    { href: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-airborne-bg text-white pb-20">
      <div className="max-w-md mx-auto min-h-screen relative bg-airborne-bg shadow-2xl overflow-hidden flex flex-col">
        <main className="flex-1 overflow-y-auto pb-24 scrollbar-hide">
          {children}
        </main>
        
        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-md mx-auto bg-airborne-surface/95 backdrop-blur-md border-t border-white/5 pb-2">
          <div className="flex justify-around items-center h-16">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} className={cn(
                    "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 cursor-pointer",
                    isActive ? "text-airborne-teal" : "text-gray-500 hover:text-gray-300"
                  )}>
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
