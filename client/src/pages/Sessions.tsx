import { useMember } from "@/context/MemberContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { format } from "date-fns";
import { MOCK_SCHEDULE } from "@/lib/mockData";
import { Calendar, Clock, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function Sessions() {
  const { bookedSessions, cancelClass } = useMember();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [isLoading, setIsLoading] = useState<string | null>(null);

  // Find session details for booked IDs
  // In a real app this would be an API call or joined data
  // Here we scan MOCK_SCHEDULE (which only has 3 days of data, so "Past" will be empty for demo)
  const mySessions = MOCK_SCHEDULE.filter(s => bookedSessions.includes(s.id));

  const handleCancel = async (sessionId: string, classId: string) => {
      setIsLoading(sessionId);
      // Infer category name again
      const categoryName = classId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      await cancelClass(sessionId, categoryName);
      setIsLoading(null);
  };

  return (
    <MobileLayout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Sessions</h1>

        {/* Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
            <button
                onClick={() => setActiveTab("upcoming")}
                className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    activeTab === "upcoming" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
            >
                Upcoming
            </button>
            <button
                onClick={() => setActiveTab("past")}
                className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                    activeTab === "past" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
            >
                Past
            </button>
        </div>

        {/* List */}
        <div className="space-y-4">
            {activeTab === "upcoming" ? (
                mySessions.length > 0 ? (
                    mySessions.map(session => (
                        <div key={session.id} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-gray-900 text-lg capitalize">{session.classId.replace(/-/g, ' ')}</h3>
                                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                        <Clock size={12} /> {format(session.startTime, 'h:mm a')} - {format(session.endTime, 'h:mm a')}
                                    </p>
                                </div>
                                <div className="bg-teal-50 text-airborne-teal text-center px-3 py-2 rounded-xl min-w-[60px]">
                                    <div className="text-[10px] font-bold uppercase">{format(session.startTime, 'MMM')}</div>
                                    <div className="text-xl font-bold leading-none">{format(session.startTime, 'dd')}</div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
                                <MapPin size={14} className="text-gray-400" />
                                <span>Studio A • Instructor {session.instructor}</span>
                            </div>

                            <Button 
                                variant="outline" 
                                onClick={() => handleCancel(session.id, session.classId)}
                                disabled={isLoading === session.id}
                                className="w-full h-10 border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-xl text-xs"
                            >
                                {isLoading === session.id ? "Cancelling..." : "Cancel Booking"}
                            </Button>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                            <Search size={24} />
                        </div>
                        <h3 className="text-gray-900 font-medium mb-1">No upcoming sessions</h3>
                        <p className="text-gray-400 text-xs">Book a class to see it here.</p>
                    </div>
                )
            ) : (
                <div className="text-center py-12">
                    <p className="text-gray-400 text-sm">No past sessions history available in demo.</p>
                </div>
            )}
        </div>
      </div>
    </MobileLayout>
  );
}
