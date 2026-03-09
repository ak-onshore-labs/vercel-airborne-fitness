import { useMember } from "@/context/MemberContext";
import { useTheme } from "@/context/ThemeContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { LogOut, Settings, ChevronRight, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

export default function Profile() {
  const { user, logout } = useMember();
  const { darkMode, setDarkMode } = useTheme();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  if (!user) {
    return <div className="flex items-center justify-center h-full">Loading... <Loader2 size={16} /></div>;
  }

  const hasMemberships = Object.keys(user.memberships).length > 0;

  return (
    <MobileLayout>
      <div className="p-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{user.name}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-8">{user.phone}</p>

        {/* Memberships Section */}
        <div className="mb-8">
            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">Active Memberships</h2>
            {hasMemberships ? (
                <div className="space-y-3">
                    {Object.entries(user.memberships).map(([name, details]) => (
                        <div key={name} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl shadow-sm flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{details.planName}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-airborne-teal font-bold text-lg">{details.sessionsRemaining}</div>
                                <div className="text-[10px] text-gray-400 dark:text-gray-500">sessions</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 text-center border border-dashed border-gray-200 dark:border-gray-600">
                    <p className="text-gray-400 dark:text-gray-500 text-sm">No active memberships</p>
                </div>
            )}
        </div>

        {/* Settings List */}
        <div className="space-y-3">
          <button onClick={() => setLocation("/profile/settings")} className="w-full flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 flex items-center justify-center">
                    <Settings size={16} />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Account Settings</span>
            </div>
            <ChevronRight size={16} className="text-gray-300 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400" />
          </button>

          <div className="w-full flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-4 rounded-2xl">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Dark Mode</span>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
          
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full h-12 mt-6 flex items-center gap-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
          >
            <LogOut size={18} /> Logout
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
