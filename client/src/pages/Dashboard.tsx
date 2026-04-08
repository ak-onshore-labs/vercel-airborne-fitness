import { useState, useEffect } from "react";
import { useMember } from "@/context/MemberContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { HeroWithAccent } from "@/components/HeroWithAccent";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { addDays, format } from "date-fns";
import { Calendar, CheckCircle2, PlusCircle, Loader2 } from "lucide-react";
import { formatTime12h } from "@/lib/formatTime";
import { getMembershipCtas, getMembershipHeadline, getMembershipUsability, getRenewUrl, isMembershipActive, isPauseCtaVisible } from "@/lib/membershipUi";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { MemberDialogContent } from "@/components/MemberDialogContent";

export default function Dashboard() {
  const { user, bookedSessions, selfExtendMembership, pauseMembership, sessionRestored } = useMember();
  const [, setLocation] = useLocation();
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const [pausePending, setPausePending] = useState<{ category: string; membershipId: string } | null>(null);

  useEffect(() => {
    if (sessionRestored && !user) {
      setLocation("/");
    }
  }, [sessionRestored, user, setLocation]);

  if (!sessionRestored || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-[#0B0B0C]">
        <Loader2 className="h-8 w-8 animate-spin text-airborne-teal" aria-label="Loading" />
      </div>
    );
  }

  const activeMemberships = Object.keys(user.memberships);
  const hasAnyMembership = activeMemberships.length > 0;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaysBookings = bookedSessions.filter(b => b.sessionDate === todayStr && b.status === "BOOKED");
  const resumeDateLabel = format(addDays(new Date(), 14), "dd MMM yyyy");

  return (
    <MobileLayout>
      <div className="p-6 space-y-8">
        <HeroWithAccent>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDED]" data-testid="text-greeting">Hi, {user.name.split(' ')[0]}</h1>
            <p className="text-gray-500 dark:text-[#9CA3AF] text-sm">Welcome back to Airborne.</p>
          </div>
        </HeroWithAccent>

        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="font-semibold text-gray-900 dark:text-[#EDEDED]">Your Memberships</h2>
                {hasAnyMembership && (
                    <Link href="/enroll">
                        <Button variant="ghost" size="sm" className="text-airborne-teal text-xs h-8 hover:bg-teal-50 dark:hover:bg-teal-900/30" data-testid="button-add-membership">
                            <PlusCircle size={14} className="mr-1"/> Add New
                        </Button>
                    </Link>
                )}
            </div>

          {hasAnyMembership ? (
            <div className="space-y-3">
              {Object.entries(user.memberships).map(([category, details]) => (
                <div key={category} className="bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/6 border-l-[3px] border-l-airborne-teal dark:border-l-teal-400 p-5 rounded shadow-sm dark:shadow-black/30 relative overflow-hidden group transition-shadow duration-200 hover:shadow-md dark:hover:shadow-black/30" data-testid={`card-membership-${category}`}>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900 dark:text-[#EDEDED] text-lg">{category}</h3>
                        {isMembershipActive(details) && (
                          <span className="bg-teal-50 dark:bg-teal-900/40 text-airborne-teal dark:text-teal-300 text-[10px] px-2 py-1 rounded font-medium uppercase tracking-wide">Active</span>
                        )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-[#9CA3AF] mb-4">{details.planName}</p>
                    {getMembershipHeadline(details) && (
                      <p
                        className={
                          getMembershipUsability(details).state === "paused" ||
                          getMembershipUsability(details).state === "upcoming"
                            ? "text-xs font-semibold text-airborne-teal dark:text-teal-300 mb-4"
                            : "text-xs font-semibold text-amber-700 dark:text-amber-300 mb-4"
                        }
                        data-testid={`text-membership-headline-${category}`}
                      >
                        {getMembershipHeadline(details)}
                      </p>
                    )}
                    <div className="flex items-end justify-between">
                        <div>
                            <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-airborne-teal" data-testid={`text-sessions-${category}`}>{details.sessionsRemaining}</span>
                            <span className="text-xs text-gray-400 dark:text-[#6B7280] font-medium">sessions left</span>
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-[#6B7280] mt-1">Expires {format(new Date(details.expiryDate), 'dd MMM yyyy')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isPauseCtaVisible(details) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 rounded"
                              onClick={() => {
                                setPausePending({ category, membershipId: details.id });
                                setPauseConfirmOpen(true);
                              }}
                              data-testid={`button-pause-${category}`}
                            >
                              Pause
                            </Button>
                          )}
                          {getMembershipCtas(details).showExtend && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 rounded"
                              onClick={() => selfExtendMembership(category)}
                              data-testid={`button-extend-${category}`}
                            >
                              Get 1 Week Extension
                            </Button>
                          )}
                          {getMembershipCtas(details).showRenew && (
                            <Button
                              size="sm"
                              className="h-9 bg-gray-900 dark:bg-[#EDEDED] text-white dark:text-[#0B0B0C] rounded"
                              onClick={() => setLocation(getRenewUrl(category))}
                              data-testid={`button-renew-${category}`}
                            >
                              Renew
                            </Button>
                          )}
                          {getMembershipCtas(details).showBook && (
                            <Link href="/book">
                              <Button size="sm" className="h-9 bg-gray-900 dark:bg-[#EDEDED] text-white dark:text-[#0B0B0C] rounded" data-testid={`button-book-${category}`}>Book Class</Button>
                            </Link>
                          )}
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/6 border-l-[3px] border-l-airborne-teal dark:border-l-teal-400 p-6 rounded shadow-sm dark:shadow-black/30 text-center transition-shadow duration-200 hover:shadow-md dark:hover:shadow-black/30" data-testid="card-membership-inactive">
              <div className="w-12 h-12 bg-gray-50 dark:bg-[#18181B] rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400 dark:text-[#6B7280]">
                  <Calendar size={24} />
              </div>
              <h3 className="text-gray-900 dark:text-[#EDEDED] font-medium mb-2">No Active Memberships</h3>
              <p className="text-gray-500 dark:text-[#9CA3AF] text-xs mb-6 max-w-[200px] mx-auto">Enroll in a class category to start booking sessions.</p>
              <Link href="/enroll">
                <Button className="w-full bg-airborne-teal text-white rounded shadow-lg shadow-teal-100 dark:shadow-none" data-testid="button-view-plans">Browse Memberships</Button>
              </Link>
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

        {hasAnyMembership && (
            <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-[#EDEDED]">Today's Bookings</h2>
                <Link href="/book">
                  <span className="text-xs text-airborne-teal font-medium" data-testid="link-view-all">View Schedule</span>
                </Link>
            </div>
            {todaysBookings.length > 0 ? (
                <div className="space-y-3">
                    {todaysBookings.map(booking => (
                    <div key={booking.id} className="bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/6 border-l-2 border-l-airborne-teal dark:border-l-teal-400 p-4 rounded shadow-sm dark:shadow-black/30 flex justify-between items-center transition-shadow duration-200 hover:shadow-md dark:hover:shadow-black/30" data-testid={`card-today-booking-${booking.id}`}>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-[#EDEDED] mb-1 capitalize">{booking.category}</h3>
                          <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">{formatTime12h(booking.startTime)} - {formatTime12h(booking.endTime)} | {booking.branch}</p>
                        </div>
                        <Button disabled className="h-9 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800 shadow-none"><CheckCircle2 size={14} className="mr-1"/> Booked</Button>
                    </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 dark:bg-[#111113] rounded p-6 text-center border border-dashed border-gray-200 dark:border-white/10">
                    <p className="text-gray-500 dark:text-[#9CA3AF] text-sm">No bookings for today. <Link href="/book"><span className="text-airborne-teal font-medium cursor-pointer">Book a class</span></Link></p>
                </div>
            )}
            </div>
        )}
      </div>
    </MobileLayout>
  );
}
