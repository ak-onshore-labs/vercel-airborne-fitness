import { useMember } from "@/context/MemberContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { User, LogOut, Settings, CreditCard, Bell } from "lucide-react";

export default function Profile() {
  const { user, logout, activeMembership } = useMember();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  if (!user) {
    setLocation("/login");
    return null;
  }

  return (
    <MobileLayout>
      <div className="p-6 pt-12">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-airborne-surface border-2 border-airborne-teal rounded-full flex items-center justify-center text-airborne-teal mb-4">
            <User size={40} />
          </div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-gray-400 text-sm">{user.phone}</p>
        </div>

        {activeMembership && (
          <div className="bg-airborne-surface border border-white/5 p-4 rounded-xl mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-white">Active Membership</h3>
              <span className="text-xs bg-airborne-teal/10 text-airborne-teal px-2 py-1 rounded">Active</span>
            </div>
            <p className="text-sm text-gray-300 mb-1">{activeMembership.planName}</p>
            <p className="text-xs text-gray-500">Expires {activeMembership.expiryDate.toLocaleDateString()}</p>
          </div>
        )}

        <div className="space-y-3">
          <button className="w-full flex items-center gap-3 bg-airborne-surface border border-white/5 p-4 rounded-xl hover:bg-white/5 transition-colors text-left">
            <Settings size={20} className="text-gray-400" />
            <span className="text-sm font-medium">Account Settings</span>
          </button>
          <button className="w-full flex items-center gap-3 bg-airborne-surface border border-white/5 p-4 rounded-xl hover:bg-white/5 transition-colors text-left">
            <CreditCard size={20} className="text-gray-400" />
            <span className="text-sm font-medium">Payment Methods</span>
          </button>
          <button className="w-full flex items-center gap-3 bg-airborne-surface border border-white/5 p-4 rounded-xl hover:bg-white/5 transition-colors text-left">
            <Bell size={20} className="text-gray-400" />
            <span className="text-sm font-medium">Notifications</span>
          </button>
          
          <Button 
            variant="destructive" 
            onClick={handleLogout}
            className="w-full h-12 mt-8 flex items-center gap-2"
          >
            <LogOut size={18} /> Logout
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
