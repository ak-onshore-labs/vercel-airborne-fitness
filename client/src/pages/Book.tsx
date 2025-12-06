import { useState } from "react";
import { useMember } from "@/context/MemberContext";
import { MOCK_SCHEDULE, ClassCategory } from "@/lib/mockData";
import { format, isSameDay, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, Filter, Lock, Loader2 } from "lucide-react";

export default function Book() {
  const { bookClass, bookedSessions, hasMembershipFor, user } = useMember();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filter, setFilter] = useState<string>("All");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const categories = ["All", "Aerial Fitness", "Pilates", "Aerial Hoop", "Functional", "Kids Aerial"];
  const dates = [new Date(), addDays(new Date(), 1), addDays(new Date(), 2)];

  const handleBook = async (sessionId: string, categoryName: string) => {
    setLoadingId(sessionId);
    await bookClass(sessionId, categoryName);
    setLoadingId(null);
  };

  // Filter logic
  const filteredSessions = MOCK_SCHEDULE.filter(session => {
    const isDateMatch = isSameDay(session.startTime, selectedDate);
    if (!isDateMatch) return false;
    
    // Map session classId (kebab) to display name (Title Case)
    const sessionCategoryName = session.classId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    
    if (filter === "All") return true;
    return session.classId.includes(filter.toLowerCase().replace(' ', '-').split('&')[0].trim());
  });

  // const hasAnyMembership = user && Object.keys(user.memberships).length > 0;

  return (
    <MobileLayout>
      <div className="p-6 pb-24">
        <div className="flex justify-between items-center mb-6">
             <h1 className="text-2xl font-bold text-gray-900">Book Class</h1>
             <div className="bg-gray-100 p-2 rounded-full">
                 <Calendar size={20} className="text-gray-500" />
             </div>
        </div>

        {/* Date Selector */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
        {dates.map((date, i) => {
            const isSelected = isSameDay(date, selectedDate);
            return (
            <button
                key={i}
                onClick={() => setSelectedDate(date)}
                data-testid={`button-date-${format(date, 'yyyy-MM-dd')}`}
                className={cn(
                "flex flex-col items-center justify-center min-w-[70px] h-20 rounded border transition-all",
                isSelected 
                    ? "bg-airborne-teal border-airborne-teal text-white shadow-md shadow-teal-100 scale-105" 
                    : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                )}
            >
                <span className="text-[10px] font-bold uppercase tracking-wider">{format(date, 'EEE')}</span>
                <span className="text-2xl font-bold">{format(date, 'd')}</span>
            </button>
            )
        })}
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            {categories.map(cat => (
                <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={cn(
                    "px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all border",
                    filter === cat 
                    ? "bg-gray-900 text-white border-gray-900" 
                    : "bg-white text-gray-500 border-gray-200"
                )}
                >
                {cat}
                </button>
            ))}
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
        {filteredSessions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded border border-dashed border-gray-200">
                <p className="text-gray-500 text-sm">No classes found for this date.</p>
            </div>
        ) : (
            filteredSessions.map(session => {
            const isBooked = bookedSessions.includes(session.id);
            const isFull = session.bookedSpots >= session.totalSpots;
            // Infer category name again for booking function
            const categoryName = Object.keys(user?.memberships || {}).find(cat => 
                cat.toLowerCase().includes(session.classId.replace(/-/g, ' '))
            ) || "";
            
            const hasMembership = !!categoryName;
            
            return (
                <div key={session.id} className="bg-white border border-gray-100 rounded p-5 flex gap-5 shadow-sm hover:shadow-md transition-shadow" data-testid={`card-session-${session.id}`}>
                    <div className="flex flex-col items-center justify-center w-16 border-r border-gray-100 pr-5">
                        <span className="text-lg font-bold text-gray-900">{format(session.startTime, 'HH:mm')}</span>
                        <span className="text-[10px] font-medium text-gray-400 uppercase">{format(session.endTime, 'HH:mm')}</span>
                    </div>
                    
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-gray-900 capitalize text-base">{session.classId.replace(/-/g, ' ')}</h3>
                        {isFull && !isBooked && (
                            <span className="text-[10px] text-amber-600 font-bold px-2 py-1 bg-amber-50 rounded-full border border-amber-100">FULL</span>
                        )}
                        </div>
                        <p className="text-xs text-gray-500 mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-airborne-teal"></span>
                            Instructor: {session.instructor}
                        </p>
                        
                        <div className="flex justify-between items-center">
                        <span className="text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-md">
                            {session.totalSpots - session.bookedSpots} spots left
                        </span>
                        
                        {isBooked ? (
                            <Button disabled size="sm" className="h-9 bg-green-50 text-green-600 border border-green-100 shadow-none font-semibold" data-testid={`button-booked-${session.id}`}>
                            Booked
                            </Button>
                        ) : !hasMembership ? (
                             <Button 
                                size="sm" 
                                onClick={() => setLocation('/enroll')}
                                className="h-9 bg-gray-900 text-white text-xs px-5 rounded font-semibold shadow-md"
                                data-testid={`button-enroll-${session.id}`}
                            >
                                Enroll
                            </Button>
                        ) : isFull ? (
                            <Button size="sm" variant="outline" className="h-9 text-xs border-gray-200 text-gray-600 hover:bg-gray-50" data-testid={`button-waitlist-${session.id}`}>
                            Join Waitlist
                            </Button>
                        ) : (
                            <Button 
                            size="sm" 
                            onClick={() => handleBook(session.id, categoryName)}
                            disabled={loadingId === session.id}
                            className="h-9 bg-airborne-teal hover:bg-airborne-deep text-white text-xs px-5 rounded font-semibold shadow-md shadow-teal-100"
                            data-testid={`button-book-${session.id}`}
                            >
                            {loadingId === session.id ? <Loader2 className="animate-spin h-3 w-3" /> : "Book Class"}
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
