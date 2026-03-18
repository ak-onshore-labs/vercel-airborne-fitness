import { useState } from "react";
import { useMember } from "@/context/MemberContext";
import { useTheme } from "@/context/ThemeContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { HeroWithAccent } from "@/components/HeroWithAccent";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { addDays, format } from "date-fns";
import { LogOut, Settings, ChevronRight, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { getMembershipCtas, getMembershipHeadline, getMembershipUsability, getRenewUrl, isPauseCtaVisible } from "@/lib/membershipUi";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { MemberDialogContent } from "@/components/MemberDialogContent";

export default function Profile() {
  const { user, logout, selfExtendMembership, pauseMembership } = useMember();
  const { darkMode, setDarkMode } = useTheme();
  const [, setLocation] = useLocation();
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const [pausePending, setPausePending] = useState<{ category: string; membershipId: string } | null>(null);

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  if (!user) {
    return <div className="flex items-center justify-center h-full">Loading... <Loader2 size={16} /></div>;
  }

  const hasMemberships = Object.keys(user.memberships).length > 0;
  const resumeDateLabel = format(addDays(new Date(), 14), "dd MMM yyyy");

  return (
    <MobileLayout>
      <div className="p-6">
        <HeroWithAccent className="mb-8">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{user.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{user.phone}</p>
        </HeroWithAccent>

        {/* Memberships Section */}
        <div className="mb-8">
            <h2 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 px-1">Memberships</h2>
            {hasMemberships ? (
                <div className="space-y-3">
                    {Object.entries(user.memberships).map(([name, details]) => (
                        <div key={name} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 border-l-[3px] border-l-airborne-teal dark:border-l-teal-400 p-4 rounded shadow-sm transition-shadow duration-200 hover:shadow-md">
                          <div className="flex justify-between items-center">
                              <div>
                                  <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{name}</h3>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{details.planName}</p>
                                  {getMembershipHeadline(details) && (
                                    <p
                                      className={
                                        getMembershipUsability(details).state === "paused"
                                          ? "text-xs font-semibold text-airborne-teal dark:text-teal-300 mt-2"
                                          : "text-xs font-semibold text-amber-700 dark:text-amber-300 mt-2"
                                      }
                                      data-testid={`text-membership-headline-${name}`}
                                    >
                                      {getMembershipHeadline(details)}
                                    </p>
                                  )}
                              </div>
                              <div className="text-right">
                                  <div className="text-airborne-teal font-bold text-lg">{details.sessionsRemaining}</div>
                                  <div className="text-[10px] text-gray-400 dark:text-gray-500">sessions left</div>
                                  {details.expiryDate && (
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1" data-testid="membership-expiry">
                                      Expires {format(new Date(details.expiryDate), "dd MMM yyyy")}
                                    </p>
                                  )}
                              </div>
                          </div>

                          {(isPauseCtaVisible(details) || getMembershipCtas(details).showExtend || getMembershipCtas(details).showRenew) && (
                            <div className="flex gap-2 mt-3">
                              {isPauseCtaVisible(details) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-9 rounded flex-1"
                                  onClick={() => {
                                    setPausePending({ category: name, membershipId: details.id });
                                    setPauseConfirmOpen(true);
                                  }}
                                  data-testid={`button-pause-${name}`}
                                >
                                  Pause
                                </Button>
                              )}
                              {getMembershipCtas(details).showExtend && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-9 rounded flex-1"
                                  onClick={() => selfExtendMembership(name)}
                                  data-testid={`button-extend-${name}`}
                                >
                                  Get 1 Week Extension
                                </Button>
                              )}
                              {getMembershipCtas(details).showRenew && (
                                <Button
                                  size="sm"
                                  className="h-9 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded flex-1"
                                  onClick={() => setLocation(getRenewUrl(name))}
                                  data-testid={`button-renew-${name}`}
                                >
                                  Renew
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded p-4 text-center border border-dashed border-gray-200 dark:border-gray-600">
                    <p className="text-gray-400 dark:text-gray-500 text-sm">No active memberships</p>
                </div>
            )}
        </div>

        <Dialog open={pauseConfirmOpen} onOpenChange={setPauseConfirmOpen}>
          <MemberDialogContent onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Pause membership?</DialogTitle>
              <DialogDescription>
                <div className="space-y-3">
                  <p>The membership will be paused for 14 days.</p>
                  <p><span className="font-medium">Resume date:</span> {resumeDateLabel}</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>You will not be able to book any sessions for this membership during the pause window.</li>
                    <li>Any sessions already booked for this category within the two-week window will be automatically cancelled and returned to your balance.</li>
                    <li>This pause cannot be undone once confirmed.</li>
                  </ul>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setPauseConfirmOpen(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  if (!pausePending) return;
                  setPauseConfirmOpen(false);
                  await pauseMembership(pausePending.membershipId);
                  setPausePending(null);
                }}
              >
                Confirm Pause
              </Button>
            </DialogFooter>
          </MemberDialogContent>
        </Dialog>

        {/* Settings List */}
        <div className="space-y-3">
          <button onClick={() => setLocation("/profile/settings")} className="w-full flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 border-l-2 border-l-airborne-teal dark:border-l-teal-400 p-4 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors transition-shadow duration-200 hover:shadow-md group">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 flex items-center justify-center">
                    <Settings size={16} />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Account Settings</span>
            </div>
            <ChevronRight size={16} className="text-gray-300 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400" />
          </button>

          <div className="w-full flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 border-l-2 border-l-airborne-teal dark:border-l-teal-400 p-4 rounded transition-shadow duration-200 hover:shadow-md">
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
