import { useState, useEffect } from "react";
import { useMember } from "@/context/MemberContext";
import { format, isSameDay, addDays, startOfToday, subMinutes, addMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatTime12h } from "@/lib/formatTime";
import { MemberDialogContent } from "@/components/MemberDialogContent";
import { getMembershipUsability, getRenewUrl } from "@/lib/membershipUi";

interface SessionDisplay {
  scheduleId: string;
  sessionDate: string;
  classId: string;
  category: string;
  branch: string;
  startTime: string;
  endTime: string;
  capacity: number;
  genderRestriction?: "NONE" | "FEMALE_ONLY";
}

interface ClassTypeOption {
  id: string;
  name: string;
  ageGroup?: string;
  strengthLevel: number;
  isActive: boolean;
}

const MEMBER_BOOKING_CUTOFF_MINUTES = 5;

function getNext7Days() {
  const today = startOfToday();
  return Array.from({ length: 7 }).map((_, i) => addDays(today, i));
}

/** Session is bookable until 5 minutes after start. Matches backend rule. */
function isSessionBookable(sessionDate: string, startTime: string): boolean {
  const [h, m] = startTime.split(":").map(Number);
  const sessionStart = new Date(sessionDate + "T00:00:00");
  sessionStart.setHours(h, m, 0, 0);
  const cutoff = addMinutes(sessionStart, MEMBER_BOOKING_CUTOFF_MINUTES);
  return new Date() <= cutoff;
}

export default function Book() {
  const { bookSession, joinWaitlist, bookedSessions, user, selectedBranch, setSelectedBranch, getSessionCounts } = useMember();
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const fromEnroll = searchParams.get('from') === 'enroll';

  const dates = getNext7Days();
  const [selectedDate, setSelectedDate] = useState<Date>(dates[0]);
  const [filter, setFilter] = useState<string>("My Classes");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SessionDisplay[]>([]);
  const [sessionCounts, setSessionCounts] = useState<Record<string, { bookedCount: number; waitlistCount: number }>>({});
  const [loadingSchedule, setLoadingSchedule] = useState(true);
  const [classTypes, setClassTypes] = useState<ClassTypeOption[]>([]);
  const [cancellationWindowMinutes, setCancellationWindowMinutes] = useState(60);
  const [bookingConfirmOpen, setBookingConfirmOpen] = useState(false);
  const [pendingSession, setPendingSession] = useState<SessionDisplay | null>(null);
  const [pendingIsWaitlist, setPendingIsWaitlist] = useState(false);

  const enrolledCategoryNames = user ? Object.keys(user.memberships) : [];
  const filterChips = ["My Classes", "All", ...classTypes.map((t) => t.name)];

  useEffect(() => {
    apiFetch<{ cancellationWindowMinutes: number }>("/api/settings").then((r) => {
      if (r.ok && typeof r.data?.cancellationWindowMinutes === "number") {
        setCancellationWindowMinutes(r.data.cancellationWindowMinutes);
      }
    });
    apiFetch<ClassTypeOption[]>("/api/class-types").then((r) => {
      if (r.ok && Array.isArray(r.data)) {
        const sorted = [...r.data].sort((a, b) => a.name.localeCompare(b.name, "en"));
        setClassTypes(sorted);
      }
    });
  }, []);

  useEffect(() => {
    setLoadingSchedule(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    apiFetch<{ sessions: SessionDisplay[] }>(
      `/api/schedule?branch=${encodeURIComponent(selectedBranch)}&date=${encodeURIComponent(dateStr)}`
    )
      .then((result) => {
        if (result.ok && result.data?.sessions) {
          setSessions(result.data.sessions);
        } else {
          setSessions([]);
        }
        setLoadingSchedule(false);
      })
      .catch(() => {
        setSessions([]);
        setLoadingSchedule(false);
      });
  }, [selectedBranch, selectedDate]);

  const filteredSessions =
    filter === "My Classes"
      ? sessions.filter((s) => enrolledCategoryNames.includes(s.category))
      : filter === "All"
        ? sessions
        : sessions.filter((s) => s.category === filter);

  // Load counts for visible sessions
  useEffect(() => {
    if (filteredSessions.length === 0) return;
    filteredSessions.forEach(s => {
      const key = `${s.scheduleId}_${s.sessionDate}`;
      if (!sessionCounts[key]) {
        getSessionCounts(s.scheduleId, s.sessionDate).then(counts => {
          setSessionCounts(prev => ({ ...prev, [key]: counts }));
        });
      }
    });
  }, [filteredSessions.length, selectedDate, selectedBranch]);

  const openBookingConfirm = (session: SessionDisplay, isWaitlist: boolean) => {
    setPendingSession(session);
    setPendingIsWaitlist(isWaitlist);
    setBookingConfirmOpen(true);
  };

  const handleBookingConfirm = async () => {
    if (!pendingSession) return;
    const categoryName = pendingSession.category;
    const sessionData = {
      scheduleId: pendingSession.scheduleId,
      sessionDate: pendingSession.sessionDate,
      startTime: pendingSession.startTime,
      endTime: pendingSession.endTime,
    };
    setBookingConfirmOpen(false);
    setLoadingId(pendingSession.scheduleId);
    if (pendingIsWaitlist) {
      await joinWaitlist(sessionData, categoryName);
    } else {
      await bookSession(sessionData, categoryName);
    }
    const counts = await getSessionCounts(pendingSession.scheduleId, pendingSession.sessionDate);
    setSessionCounts((prev) => ({ ...prev, [`${pendingSession.scheduleId}_${pendingSession.sessionDate}`]: counts }));
    setPendingSession(null);
    setLoadingId(null);
  };

  const handleAction = (session: SessionDisplay, isWaitlist: boolean) => {
    if (isWaitlist) {
      setLoadingId(session.scheduleId);
      joinWaitlist(
        { scheduleId: session.scheduleId, sessionDate: session.sessionDate, startTime: session.startTime, endTime: session.endTime },
        session.category
      ).then(() => {
        getSessionCounts(session.scheduleId, session.sessionDate).then((counts) =>
          setSessionCounts((prev) => ({ ...prev, [`${session.scheduleId}_${session.sessionDate}`]: counts }))
        );
        setLoadingId(null);
      });
    } else {
      openBookingConfirm(session, false);
    }
  };

  const cutoffTimeForSession = (session: SessionDisplay) => {
    const [h, m] = session.startTime.split(":").map(Number);
    const classStart = new Date(session.sessionDate + "T00:00:00");
    classStart.setHours(h, m, 0, 0);
    const cutoff = subMinutes(classStart, cancellationWindowMinutes);
    return format(cutoff, "h:mm a").toLowerCase();
  }

  if (!user) {
    return <div className="flex items-center justify-center h-full">Loading... <Loader2 size={16} /></div>;
  }

  return (
    <MobileLayout>
      <div className="p-6 pb-24">
        {fromEnroll && (
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="mb-4 -ml-2 text-airborne-teal dark:text-airborne-teal">
            <ArrowLeft size={16} className="mr-2" /> Back to Enrollment
          </Button>
        )}
        
        <div className="flex justify-between items-center mb-6">
             <h1 className="text-2xl font-bold text-gray-900 dark:text-[#EDEDED]">Book Class</h1>
             <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#18181B] p-1 rounded">
               <button onClick={() => setSelectedBranch('Lower Parel')} data-testid="button-branch-lp" className={cn("px-3 py-1 text-xs font-medium rounded", selectedBranch === 'Lower Parel' ? "bg-airborne-teal/10 dark:bg-airborne-teal/25 border border-airborne-teal dark:border-teal-400 text-airborne-deep dark:text-teal-200" : "text-gray-500 dark:text-[#9CA3AF]")}>Lower Parel</button>
               <button onClick={() => setSelectedBranch('Mazgaon')} data-testid="button-branch-maz" className={cn("px-3 py-1 text-xs font-medium rounded", selectedBranch === 'Mazgaon' ? "bg-airborne-teal/10 dark:bg-airborne-teal/25 border border-airborne-teal dark:border-teal-400 text-airborne-deep dark:text-teal-200" : "text-gray-500 dark:text-[#9CA3AF]")}>Mazgaon</button>
             </div>
        </div>

        <div className="flex gap-3 mb-6 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
        {dates.map((d, i) => {
            const isSelected = isSameDay(d, selectedDate);
            return (
            <button key={i} onClick={() => setSelectedDate(d)} data-testid={`button-date-${format(d, 'yyyy-MM-dd')}`} className={cn("flex flex-col items-center justify-center min-w-[70px] h-20 rounded border transition-all", isSelected ? "bg-airborne-teal border-airborne-teal text-white shadow-md shadow-teal-100 dark:shadow-teal-900/30" : "bg-white dark:bg-[#111113] border-gray-100 dark:border-white/6 text-gray-400 dark:text-[#6B7280] hover:border-gray-200 dark:hover:border-white/10")}>
                <span className="text-[10px] font-bold uppercase tracking-wider">{format(d, 'EEE')}</span>
                <span className="text-2xl font-bold">{format(d, 'd')}</span>
            </button>
            )
        })}
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            {filterChips.map((chip) => (
                <button key={chip} onClick={() => setFilter(chip)} data-testid={`button-filter-${chip}`} className={cn("px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border", filter === chip ? "bg-airborne-teal/10 dark:bg-airborne-teal/25 border-airborne-teal dark:border-teal-400 text-airborne-deep dark:text-teal-200" : "bg-white dark:bg-[#111113] text-gray-500 dark:text-[#9CA3AF] border-gray-200 dark:border-white/10")}>{chip}</button>
            ))}
        </div>

        <Dialog open={bookingConfirmOpen} onOpenChange={setBookingConfirmOpen}>
          <MemberDialogContent onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Confirm Booking</DialogTitle>
              <DialogDescription>
                {pendingSession && (
                  <>You will not be able to cancel the class after {cutoffTimeForSession(pendingSession)}</>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setBookingConfirmOpen(false)}>Cancel</Button>
              <Button onClick={handleBookingConfirm}>Confirm Booking</Button>
            </DialogFooter>
          </MemberDialogContent>
        </Dialog>

        <div className="space-y-4">
        {loadingSchedule ? (
          <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-gray-400 dark:text-[#6B7280]" /></div>
        ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-[#111113] rounded border border-dashed border-gray-200 dark:border-white/10">
                <p className="text-gray-500 dark:text-[#9CA3AF] text-sm">No classes found.</p>
            </div>
        ) : (
            filteredSessions.map(session => {
            const key = `${session.scheduleId}_${session.sessionDate}`;
            const counts = sessionCounts[key] || { bookedCount: 0, waitlistCount: 0 };
            const isFull = counts.bookedCount >= session.capacity;
            const slotsLeft = Math.max(0, session.capacity - counts.bookedCount);
            const booking = bookedSessions.find(b => b.scheduleId === session.scheduleId && b.sessionDate === session.sessionDate && b.status !== "CANCELLED");
            const membershipDetails = user?.memberships[session.category];
            const hasMembership = Boolean(membershipDetails);
            const bookable = isSessionBookable(session.sessionDate, session.startTime);
            const membershipState = membershipDetails ? getMembershipUsability(membershipDetails).state : null;

            return (
                <div
                  key={key}
                  className={cn(
                    "rounded p-5 flex gap-5 transition-shadow duration-200 border-l-2 hover:shadow-md dark:hover:shadow-black/30",
                    session.genderRestriction === "FEMALE_ONLY"
                      ? "border-l-pink-300 dark:border-l-pink-400"
                      : "border-l-airborne-teal dark:border-l-teal-400",
                    bookable
                      ? session.genderRestriction === "FEMALE_ONLY"
                        ? "bg-rose-50/35 dark:bg-rose-950/15 border border-rose-100 dark:border-rose-900/30 shadow-sm dark:shadow-black/30 hover:shadow-md"
                        : "bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/6 shadow-sm dark:shadow-black/30 hover:shadow-md"
                      : "bg-gray-50 dark:bg-[#18181B] border border-gray-200 dark:border-white/10"
                  )}
                  data-testid={`card-session-${key}`}
                >
                    <div className="flex flex-col items-center justify-center w-16 border-r border-gray-100 dark:border-white/10 pr-5 text-center">
                        <span className={cn("text-lg font-bold", bookable ? "text-gray-900 dark:text-[#EDEDED]" : "text-gray-600 dark:text-[#9CA3AF]")}>{formatTime12h(session.startTime)}</span>
                        <span className="text-[10px] font-medium text-gray-400 dark:text-[#6B7280] uppercase">{formatTime12h(session.endTime)}</span>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className={cn("font-bold text-base", bookable ? "text-gray-900 dark:text-[#EDEDED]" : "text-gray-600 dark:text-[#9CA3AF]")} data-testid={`text-class-${key}`}>{session.category}</h3>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] bg-teal-50 dark:bg-teal-900/40 text-airborne-teal dark:text-teal-300 px-1 rounded">{selectedBranch}</span>
                            {session.genderRestriction === "FEMALE_ONLY" && (
                              <span className="text-[10px] font-medium text-pink-700 dark:text-pink-300 px-1.5 py-0.5 rounded bg-pink-100/80 dark:bg-pink-900/35">
                                Female only
                              </span>
                            )}
                            {isFull && !booking && <span className="text-[10px] font-bold text-red-500 dark:text-red-400 px-1 bg-red-50 dark:bg-red-900/30 rounded">FULL</span>}
                            {!bookable && <span className="text-[10px] font-medium text-gray-500 dark:text-[#9CA3AF] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-[#18181B]" data-testid={`label-booking-closed-${key}`}>Booking closed</span>}
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                        <span className={cn("text-xs font-medium px-2 py-1 rounded-md", slotsLeft > 0 ? "text-gray-400 dark:text-[#6B7280] bg-gray-50 dark:bg-[#18181B]" : "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30")} data-testid={`text-slots-${key}`}>
                          {slotsLeft > 0 ? `${slotsLeft} slots left` : "0 slots left"}
                        </span>

                        {booking ? (
                          <Button disabled size="sm" className={cn("h-9 border shadow-none font-semibold", booking.status === "BOOKED" ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-100 dark:border-green-800" : "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800")} data-testid={`button-status-${key}`}>
                            {booking.status === "BOOKED" ? "Booked" : `Waitlisted (#${booking.waitlistPosition})`}
                          </Button>
                        ) : membershipState === "paused" ? (
                             <Button
                               disabled
                               size="sm"
                               className="h-9 bg-gray-100 dark:bg-[#18181B] text-gray-500 dark:text-[#9CA3AF] text-xs px-5 rounded border border-gray-200 dark:border-white/10 shadow-none"
                               data-testid={`button-paused-${key}`}
                             >
                               Paused
                             </Button>
                        ) : membershipState === "upcoming" ? (
                             <Button
                               disabled
                               size="sm"
                               className="h-9 bg-gray-100 dark:bg-[#18181B] text-gray-500 dark:text-[#9CA3AF] text-xs px-5 rounded border border-gray-200 dark:border-white/10 shadow-none"
                               data-testid={`button-upcoming-${key}`}
                             >
                               {membershipDetails?.startDate
                                 ? `Starts on ${format(new Date(membershipDetails.startDate), "dd MMM yyyy")}`
                                 : "Starts soon"}
                             </Button>
                        ) : !hasMembership ? (
                             <Button size="sm" onClick={() => setLocation('/enroll')} className="h-9 bg-gray-900 dark:bg-[#EDEDED] text-white dark:text-[#0B0B0C] text-xs px-5 rounded" data-testid={`button-enroll-${key}`}>Enroll</Button>
                        ) : membershipState !== "active" ? (
                             <Button
                               size="sm"
                               onClick={() => setLocation(getRenewUrl(session.category))}
                               className="h-9 bg-gray-900 dark:bg-[#EDEDED] text-white dark:text-[#0B0B0C] text-xs px-5 rounded"
                               data-testid={`button-renew-${key}`}
                             >
                               Renew
                             </Button>
                        ) : (
                            <Button size="sm" onClick={() => bookable && handleAction(session, isFull)} disabled={!bookable || loadingId === session.scheduleId} className={cn("h-9 text-white text-xs px-5 rounded disabled:opacity-60", isFull ? "bg-amber-500" : "bg-airborne-teal")} data-testid={`button-book-${key}`}>
                            {loadingId === session.scheduleId ? <Loader2 className="animate-spin h-3 w-3" /> : isFull ? `Join Waitlist (${counts.waitlistCount})` : "Book Class"}
                            </Button>
                        )}
                        </div>
                    </div>
                </div>
            );
            })
        )}
        </div>
      </div>
    </MobileLayout>
  );
}
