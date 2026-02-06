import { useState } from "react";
import { useMember } from "@/context/MemberContext";
import { MOCK_SCHEDULE } from "@/lib/mockData";
import { format, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Calendar, Lock, Loader2, MapPin, ArrowLeft } from "lucide-react";
import { getNext7DaysIST } from "@/lib/date";

export default function Book() {
  const { bookSession, joinWaitlist, bookedSessions, user, selectedBranch, setSelectedBranch, sessionInventory } = useMember();
  const [location, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const fromEnroll = searchParams.get('from') === 'enroll';

  const dates = getNext7DaysIST();
  const [selectedDate, setSelectedDate] = useState<Date>(dates[0].date);
  const [filter, setFilter] = useState<string>("All");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const categories = ["All", "Aerial Fitness", "Pilates", "Aerial Hoop", "Functional", "Kids Aerial"];

  const getSessionState = (sessionId: string) => {
    const inv = sessionInventory[sessionId] || { capacity: 14, bookedCount: 8, waitlistCount: 0 };
    const booking = bookedSessions.find(b => b.sessionId === sessionId && b.status !== "CANCELLED");
    return { inv, booking };
  };

  const handleAction = async (session: any, categoryName: string, isWaitlist: boolean) => {
    setLoadingId(session.id);
    if (isWaitlist) {
      await joinWaitlist(session, categoryName);
    } else {
      await bookSession(session, categoryName);
    }
    setLoadingId(null);
  };

  const filteredSessions = MOCK_SCHEDULE.filter(session => {
    return isSameDay(session.startTime, selectedDate) && 
           (filter === "All" || session.classId.includes(filter.toLowerCase().replace(' ', '-')));
  });

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
               <button onClick={() => setSelectedBranch('Lower Parel')} className={cn("px-3 py-1 text-xs font-medium rounded", selectedBranch === 'Lower Parel' ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}>Lower Parel</button>
               <button onClick={() => setSelectedBranch('Mazgaon')} className={cn("px-3 py-1 text-xs font-medium rounded", selectedBranch === 'Mazgaon' ? "bg-white shadow-sm text-gray-900" : "text-gray-500")}>Mazgaon</button>
             </div>
        </div>

        <div className="flex gap-3 mb-6 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
        {dates.map((d, i) => {
            const isSelected = isSameDay(d.date, selectedDate);
            return (
            <button key={i} onClick={() => setSelectedDate(d.date)} className={cn("flex flex-col items-center justify-center min-w-[70px] h-20 rounded border transition-all", isSelected ? "bg-airborne-teal border-airborne-teal text-white shadow-md shadow-teal-100" : "bg-white border-gray-100 text-gray-400 hover:border-gray-200")}>
                <span className="text-[10px] font-bold uppercase tracking-wider">{d.label}</span>
                <span className="text-2xl font-bold">{format(d.date, 'd')}</span>
            </button>
            )
        })}
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            {categories.map(cat => (
                <button key={cat} onClick={() => setFilter(cat)} className={cn("px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border", filter === cat ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-200")}>{cat}</button>
            ))}
        </div>

        <div className="space-y-4">
        {filteredSessions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded border border-dashed border-gray-200">
                <p className="text-gray-500 text-sm">No classes found.</p>
            </div>
        ) : (
            filteredSessions.map(session => {
            const { inv, booking } = getSessionState(session.id);
            const isFull = inv.bookedCount >= inv.capacity;
            const categoryName = Object.keys(user?.memberships || {}).find(cat => cat.toLowerCase().includes(session.classId.replace(/-/g, ' '))) || "";
            const hasMembership = !!categoryName;
            const slotsLeft = Math.max(0, inv.capacity - inv.bookedCount);
            
            return (
                <div key={session.id} className="bg-white border border-gray-100 rounded p-5 flex gap-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col items-center justify-center w-16 border-r border-gray-100 pr-5 text-center">
                        <span className="text-lg font-bold text-gray-900">{format(session.startTime, 'HH:mm')}</span>
                        <span className="text-[10px] font-medium text-gray-400 uppercase">{format(session.endTime, 'HH:mm')}</span>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-bold text-gray-900 capitalize text-base">{session.classId.replace(/-/g, ' ')}</h3>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] bg-teal-50 text-airborne-teal px-1 rounded">{selectedBranch}</span>
                            {isFull && !booking && <span className="text-[10px] font-bold text-red-500 px-1 bg-red-50 rounded">FULL</span>}
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                        <span className={cn("text-xs font-medium px-2 py-1 rounded-md", slotsLeft > 0 ? "text-gray-400 bg-gray-50" : "text-red-500 bg-red-50")}>
                          {slotsLeft > 0 ? `${slotsLeft} slots left` : "0 slots left"}
                        </span>
                        
                        {booking ? (
                          <Button disabled size="sm" className={cn("h-9 border shadow-none font-semibold", booking.status === "BOOKED" ? "bg-green-50 text-green-600 border-green-100" : "bg-amber-50 text-amber-600 border-amber-100")}>
                            {booking.status === "BOOKED" ? "Booked" : `Waitlisted (#${booking.waitlistPosition})`}
                          </Button>
                        ) : !hasMembership ? (
                             <Button size="sm" onClick={() => setLocation('/enroll')} className="h-9 bg-gray-900 text-white text-xs px-5 rounded">Enroll</Button>
                        ) : (
                            <Button size="sm" onClick={() => handleAction(session, categoryName, isFull)} disabled={loadingId === session.id} className={cn("h-9 text-white text-xs px-5 rounded", isFull ? "bg-amber-500" : "bg-airborne-teal")}>
                            {loadingId === session.id ? <Loader2 className="animate-spin h-3 w-3" /> : isFull ? `Join Waitlist (${inv.waitlistCount})` : "Book Class"}
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
