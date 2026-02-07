import { useState, useEffect } from "react";
import { useMember } from "@/context/MemberContext";
import { format, isSameDay, addDays, startOfToday } from "date-fns";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface ScheduleItem {
  id: string;
  classId: string;
  category: string;
  branch: string;
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  capacity: number;
}

interface SessionDisplay {
  scheduleId: string;
  sessionDate: string;
  classId: string;
  category: string;
  branch: string;
  startTime: string;
  endTime: string;
  startDate: Date;
  endDate: Date;
  capacity: number;
}

function getNext7Days() {
  const today = startOfToday();
  return Array.from({ length: 7 }).map((_, i) => addDays(today, i));
}

function buildSessionsForDate(schedule: ScheduleItem[], date: Date, branch: string): SessionDisplay[] {
  const dow = date.getDay();
  return schedule
    .filter(s => s.dayOfWeek === dow && s.branch === branch)
    .map(s => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const startDate = new Date(date);
      startDate.setHours(s.startHour, s.startMinute, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(s.endHour, s.endMinute, 0, 0);
      return {
        scheduleId: s.id,
        sessionDate: dateStr,
        classId: s.classId,
        category: s.category,
        branch: s.branch,
        startTime: format(startDate, 'HH:mm'),
        endTime: format(endDate, 'HH:mm'),
        startDate,
        endDate,
        capacity: s.capacity,
      };
    })
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

export default function Book() {
  const { bookSession, joinWaitlist, bookedSessions, user, selectedBranch, setSelectedBranch, getSessionCounts } = useMember();
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const fromEnroll = searchParams.get('from') === 'enroll';

  const dates = getNext7Days();
  const [selectedDate, setSelectedDate] = useState<Date>(dates[0]);
  const [filter, setFilter] = useState<string>("All");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [sessionCounts, setSessionCounts] = useState<Record<string, { bookedCount: number; waitlistCount: number }>>({});
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  const categories = ["All", "Aerial Fitness", "Pilates", "Aerial Hoop", "Functional", "Kids Aerial"];

  useEffect(() => {
    apiFetch<ScheduleItem[]>('/api/schedule')
      .then((result) => {
        if (result.ok && Array.isArray(result.data)) {
          setSchedule(result.data);
        }
        setLoadingSchedule(false);
      })
      .catch(() => setLoadingSchedule(false));
  }, []);

  const sessions = buildSessionsForDate(schedule, selectedDate, selectedBranch);
  const filteredSessions = sessions.filter(s =>
    filter === "All" || s.classId.includes(filter.toLowerCase().replace(/ /g, '-'))
  );

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

  const handleAction = async (session: SessionDisplay, isWaitlist: boolean) => {
    const categoryName = session.category;
    setLoadingId(session.scheduleId);
    const sessionData = { scheduleId: session.scheduleId, sessionDate: session.sessionDate, startTime: session.startTime, endTime: session.endTime };
    if (isWaitlist) {
      await joinWaitlist(sessionData, categoryName);
    } else {
      await bookSession(sessionData, categoryName);
    }
    // Refresh count
    const counts = await getSessionCounts(session.scheduleId, session.sessionDate);
    setSessionCounts(prev => ({ ...prev, [`${session.scheduleId}_${session.sessionDate}`]: counts }));
    setLoadingId(null);
  };

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
            {categories.map(cat => (
                <button key={cat} onClick={() => setFilter(cat)} data-testid={`button-filter-${cat}`} className={cn("px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border", filter === cat ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200")}>{cat}</button>
            ))}
        </div>

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
                          <h3 className="font-bold text-gray-900 capitalize text-base" data-testid={`text-class-${key}`}>{session.classId.replace(/-/g, ' ')}</h3>
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
