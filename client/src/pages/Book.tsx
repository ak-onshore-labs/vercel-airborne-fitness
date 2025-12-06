import { useState } from "react";
import { useMember } from "@/context/MemberContext";
import { MOCK_SCHEDULE, ClassCategory } from "@/lib/mockData";
import { format, isSameDay, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";

export default function Book() {
  const { bookClass, bookedSessions, activeMembership } = useMember();
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filter, setFilter] = useState<string>("All");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const categories = ["All", "Aerial Fitness", "Pilates", "Aerial Hoop", "Functional"];
  const dates = [new Date(), addDays(new Date(), 1), addDays(new Date(), 2)];

  const handleBook = async (sessionId: string) => {
    if (!activeMembership) {
      setLocation("/enroll");
      return;
    }
    setLoadingId(sessionId);
    await bookClass(sessionId);
    setLoadingId(null);
  };

  const filteredSessions = MOCK_SCHEDULE.filter(session => {
    const isDateMatch = isSameDay(session.startTime, selectedDate);
    if (!isDateMatch) return false;
    
    if (filter === "All") return true;
    // Simple includes check for mapping category names to IDs
    return session.classId.includes(filter.toLowerCase().replace(' ', '-').split('&')[0].trim());
  });

  return (
    <MobileLayout>
      <div className="p-6 pb-24">
        <h1 className="text-2xl font-bold mb-6">Book a Class</h1>

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
                  "flex flex-col items-center justify-center min-w-[70px] h-20 rounded-xl border transition-all",
                  isSelected 
                    ? "bg-airborne-teal border-airborne-teal text-white shadow-[0_0_15px_rgba(4,192,193,0.3)]" 
                    : "bg-airborne-surface border-white/5 text-gray-400 hover:bg-white/5"
                )}
              >
                <span className="text-xs font-medium uppercase">{format(date, 'EEE')}</span>
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
              data-testid={`button-filter-${cat.replace(' ', '-')}`}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border",
                filter === cat 
                  ? "bg-white text-black border-white" 
                  : "bg-transparent text-gray-400 border-white/10 hover:border-white/30"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No classes available for this filter.
            </div>
          ) : (
            filteredSessions.map(session => {
              const isBooked = bookedSessions.includes(session.id);
              const isFull = session.bookedSpots >= session.totalSpots;
              
              return (
                <div key={session.id} className="bg-airborne-surface border border-white/5 rounded-xl p-4 flex gap-4" data-testid={`card-session-${session.id}`}>
                  <div className="flex flex-col items-center justify-center w-16 border-r border-white/5 pr-4">
                    <span className="text-sm font-bold text-white">{format(session.startTime, 'HH:mm')}</span>
                    <span className="text-[10px] text-gray-500">{format(session.endTime, 'HH:mm')}</span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-semibold text-white capitalize">{session.classId.replace(/-/g, ' ')}</h3>
                      {isFull && !isBooked && (
                        <span className="text-[10px] text-amber-500 font-medium px-2 py-0.5 bg-amber-500/10 rounded">FULL</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-3">Instructor: {session.instructor}</p>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {session.totalSpots - session.bookedSpots} spots left
                      </span>
                      
                      {isBooked ? (
                        <Button disabled size="sm" className="h-8 bg-green-500/20 text-green-500 hover:bg-green-500/20 border-none" data-testid={`button-booked-${session.id}`}>
                          Booked
                        </Button>
                      ) : isFull ? (
                        <Button size="sm" variant="outline" className="h-8 text-xs border-white/10" data-testid={`button-waitlist-${session.id}`}>
                          Waitlist
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => handleBook(session.id)}
                          disabled={loadingId === session.id}
                          className="h-8 bg-airborne-teal hover:bg-airborne-aqua text-white text-xs px-6"
                          data-testid={`button-book-${session.id}`}
                        >
                          {loadingId === session.id ? "..." : "Book"}
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
