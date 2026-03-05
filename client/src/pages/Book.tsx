import { useState, useEffect } from "react";
import { useMember } from "@/context/MemberContext";
import { format, isSameDay, addDays, startOfToday, subMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

interface SessionDisplay {
  scheduleId: string;
  sessionDate: string;
  classId: string;
  category: string;
  branch: string;
  startTime: string;
  endTime: string;
  capacity: number;
}

interface ClassTypeOption {
  id: string;
  name: string;
  ageGroup?: string;
  strengthLevel: number;
  isActive: boolean;
}

function getNext7Days() {
  const today = startOfToday();
  return Array.from({ length: 7 }).map((_, i) => addDays(today, i));
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
      if (r.ok && Array.isArray(r.data)) setClassTypes(r.data);
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
    return format(cutoff, "MMM d, yyyy 'at' h:mm a");
  }

  if (!user) {
    return <div className="flex items-center justify-center h-full">Loading... <Loader2 size={16} /></div>;
  }

  return (
    <MobileLayout>
      <div className="p-6 pb-24">
        {fromEnroll && (
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="mb-4 -ml-2 text-airborne-teal">
            <ArrowLeft size={16} className="mr-2" /> Back to Enrollment
          </Button>
        )}
        
        <div className="flex justify-between items-center mb-6">
             <h1 className="text-2xl font-bold text-gray-900">Book Class</h1>
             <div className="flex items-center gap-2 bg-gray-100 p-1 rounded">
               <button onClick={() => setSelectedBranch('Lower Parel')} data-testid="button-branch-lp" className={cn("px-3 py-1 text-xs font-medium rounded", selectedBranch === 'Lower Parel' ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}>Lower Parel</button>
               <button onClick={() => setSelectedBranch('Mazgaon')} data-testid="button-branch-maz" className={cn("px-3 py-1 text-xs font-medium rounded", selectedBranch === 'Mazgaon' ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}>Mazgaon</button>
             </div>
        </div>

        <div className="flex gap-3 mb-6 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
        {dates.map((d, i) => {
            const isSelected = isSameDay(d, selectedDate);
            return (
            <button key={i} onClick={() => setSelectedDate(d)} data-testid={`button-date-${format(d, 'yyyy-MM-dd')}`} className={cn("flex flex-col items-center justify-center min-w-[70px] h-20 rounded border transition-all", isSelected ? "bg-airborne-teal border-airborne-teal text-white shadow-md shadow-teal-100" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200")}>
                <span className="text-[10px] font-bold uppercase tracking-wider">{format(d, 'EEE')}</span>
                <span className="text-2xl font-bold">{format(d, 'd')}</span>
            </button>
            )
        })}
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            {filterChips.map((chip) => (
                <button key={chip} onClick={() => setFilter(chip)} data-testid={`button-filter-${chip}`} className={cn("px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border", filter === chip ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200")}>{chip}</button>
            ))}
        </div>

        <Dialog open={bookingConfirmOpen} onOpenChange={setBookingConfirmOpen}>
          <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Confirm Booking</DialogTitle>
              <DialogDescription>
                {pendingSession && (
                  <>You will not be allowed to cancel this class past {cutoffTimeForSession(pendingSession)}</>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setBookingConfirmOpen(false)}>Cancel</Button>
              <Button onClick={handleBookingConfirm}>Confirm Booking</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="space-y-4">
        {loadingSchedule ? (
          <div className="text-center py-12"><Loader2 className="animate-spin mx-auto text-gray-400" /></div>
        ) : filteredSessions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded border border-dashed border-gray-200">
                <p className="text-gray-500 text-sm">No classes found.</p>
            </div>
        ) : (
            filteredSessions.map(session => {
            const key = `${session.scheduleId}_${session.sessionDate}`;
            const counts = sessionCounts[key] || { bookedCount: 0, waitlistCount: 0 };
            const isFull = counts.bookedCount >= session.capacity;
            const slotsLeft = Math.max(0, session.capacity - counts.bookedCount);
            const booking = bookedSessions.find(b => b.scheduleId === session.scheduleId && b.sessionDate === session.sessionDate && b.status !== "CANCELLED");
            const hasMembership = !!user?.memberships[session.category];
            
            return (
                <div key={key} className="bg-white border border-gray-100 rounded p-5 flex gap-5 shadow-sm hover:shadow-md transition-shadow" data-testid={`card-session-${key}`}>
                    <div className="flex flex-col items-center justify-center w-16 border-r border-gray-100 pr-5 text-center">
                        <span className="text-lg font-bold text-gray-900">{session.startTime}</span>
                        <span className="text-[10px] font-medium text-gray-400 uppercase">{session.endTime}</span>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-gray-900 text-base" data-testid={`text-class-${key}`}>{session.category}</h3>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] bg-teal-50 text-airborne-teal px-1 rounded">{selectedBranch}</span>
                            {isFull && !booking && <span className="text-[10px] font-bold text-red-500 px-1 bg-red-50 rounded">FULL</span>}
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                        <span className={cn("text-xs font-medium px-2 py-1 rounded-md", slotsLeft > 0 ? "text-gray-400 bg-gray-50" : "text-red-500 bg-red-50")} data-testid={`text-slots-${key}`}>
                          {slotsLeft > 0 ? `${slotsLeft} slots left` : "0 slots left"}
                        </span>
                        
                        {booking ? (
                          <Button disabled size="sm" className={cn("h-9 border shadow-none font-semibold", booking.status === "BOOKED" ? "bg-green-50 text-green-600 border-green-100" : "bg-amber-50 text-amber-600 border-amber-100")} data-testid={`button-status-${key}`}>
                            {booking.status === "BOOKED" ? "Booked" : `Waitlisted (#${booking.waitlistPosition})`}
                          </Button>
                        ) : !hasMembership ? (
                             <Button size="sm" onClick={() => setLocation('/enroll')} className="h-9 bg-gray-900 text-white text-xs px-5 rounded" data-testid={`button-enroll-${key}`}>Enroll</Button>
                        ) : (
                            <Button size="sm" onClick={() => handleAction(session, isFull)} disabled={loadingId === session.scheduleId} className={cn("h-9 text-white text-xs px-5 rounded", isFull ? "bg-amber-500" : "bg-airborne-teal")} data-testid={`button-book-${key}`}>
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
