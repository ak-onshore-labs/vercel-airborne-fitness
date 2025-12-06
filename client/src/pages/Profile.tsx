import { useMember } from "@/context/MemberContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { User, LogOut, Settings, CreditCard, Bell, ChevronRight } from "lucide-react";
import { format } from "date-fns";

export default function Profile() {
  const { user, logout } = useMember();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  if (!user) {
    setLocation("/login");
    return null;
  }

  const hasMemberships = Object.keys(user.memberships).length > 0;

  return (
    <MobileLayout>
      <div className="p-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center mb-8 pt-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4 border-4 border-white shadow-sm">
            <User size={32} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
          <p className="text-gray-500 text-sm font-medium">{user.phone}</p>
        </div>

        {/* Memberships Section */}
        <div className="mb-8">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-1">Active Memberships</h2>
            {hasMemberships ? (
                <div className="space-y-3">
                    {Object.entries(user.memberships).map(([name, details]) => (
                        <div key={name} className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-900 text-sm">{name}</h3>
                                <p className="text-xs text-gray-500">{details.planName}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-airborne-teal font-bold text-lg">{details.sessionsRemaining}</div>
                                <div className="text-[10px] text-gray-400">sessions</div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 rounded-xl p-4 text-center border border-dashed border-gray-200">
                    <p className="text-gray-400 text-sm">No active memberships</p>
                </div>
            )}
        </div>

        {/* Settings List */}
        <div className="space-y-3">
          <button className="w-full flex items-center justify-between bg-white border border-gray-100 p-4 rounded-2xl hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                    <Settings size={16} />
                </div>
                <span className="text-sm font-medium text-gray-700">Account Settings</span>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500" />
          </button>
          
          <button className="w-full flex items-center justify-between bg-white border border-gray-100 p-4 rounded-2xl hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center">
                    <CreditCard size={16} />
                </div>
                <span className="text-sm font-medium text-gray-700">Payment Methods</span>
            </div>
            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500" />
          </button>
          
          <button className="w-full flex items-center justify-between bg-white border border-gray-100 p-4 rounded-2xl hover:bg-gray-50 transition-colors group">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center">
                    <Bell size={16} />
                </div>
                <span className="text-sm font-medium text-gray-700">Notifications</span>
            </div>
            <div className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">2</div>
          </button>
          
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full h-12 mt-6 flex items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
          >
            <LogOut size={18} /> Logout
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
