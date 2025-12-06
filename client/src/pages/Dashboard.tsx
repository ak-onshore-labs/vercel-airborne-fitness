import { useMember } from "@/context/MemberContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { MOCK_SCHEDULE } from "@/lib/mockData";
import { ArrowRight, Calendar, CheckCircle2, PlusCircle } from "lucide-react";

export default function Dashboard() {
  const { user, bookedSessions, hasMembershipFor } = useMember();
  const [, setLocation] = useLocation();

  if (!user) {
    setLocation("/login");
    return null;
  }

  const activeMemberships = Object.keys(user.memberships);
  const hasAnyMembership = activeMemberships.length > 0;

  // Filter today's classes based on memberships
  const today = new Date();
  const todaysClasses = MOCK_SCHEDULE.filter(session => 
    session.startTime.getDate() === today.getDate() &&
    session.startTime.getMonth() === today.getMonth() &&
    hasMembershipFor(session.classId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')) 
    // Note: The mock data IDs need to roughly match category names. 
    // In a real app, we'd use strict IDs. For this demo, we'll do a loose match or strict check in rendering.
  );
  
  // Better filtered list for display logic
  const availableTodaysClasses = MOCK_SCHEDULE.filter(session => {
      const isToday = session.startTime.getDate() === today.getDate();
      // Map session ID (e.g. 'aerial-fitness') to Category Name 'Aerial Fitness'
      // Mock data IDs are kebab-case, Category Names are Title Case
      // Let's do a robust check
      const categoryName = Object.keys(user.memberships).find(cat => 
          cat.toLowerCase().includes(session.classId.replace(/-/g, ' '))
      );
      return isToday && !!categoryName;
  });


  return (
    <MobileLayout>
      <div className="p-6 space-y-8">
        
        {/* Greeting & Status */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900" data-testid="text-greeting">Hi, {user.name.split(' ')[0]}</h1>
          <p className="text-gray-500 text-sm">Welcome back to Airborne.</p>
        </div>

        {/* Memberships Cards */}
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="font-semibold text-gray-900">Your Memberships</h2>
                {hasAnyMembership && (
                    <Link href="/enroll">
                        <Button variant="ghost" size="sm" className="text-airborne-teal text-xs h-8 hover:bg-teal-50">
                            <PlusCircle size={14} className="mr-1"/> Add New
                        </Button>
                    </Link>
                )}
            </div>

          {hasAnyMembership ? (
            <div className="space-y-3">
              {Object.entries(user.memberships).map(([category, details]) => (
                <div key={category} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm relative overflow-hidden group" data-testid={`card-membership-${category}`}>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900 text-lg">{category}</h3>
                        <span className="bg-teal-50 text-airborne-teal text-[10px] px-2 py-1 rounded-full font-medium uppercase tracking-wide">Active</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">{details.planName}</p>
                    
                    <div className="flex items-end justify-between">
                        <div>
                            <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-airborne-teal">{details.sessionsRemaining}</span>
                            <span className="text-xs text-gray-400 font-medium">sessions left</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">Expires {format(details.expiryDate, 'dd MMM yyyy')}</p>
                        </div>
                        <Link href="/book">
                            <Button size="sm" className="h-9 bg-gray-900 text-white rounded-lg hover:bg-gray-800 shadow-none">
                                Book Class
                            </Button>
                        </Link>
                    </div>
                  </div>
                  {/* Abstract soft decoration */}
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-teal-50 rounded-full blur-2xl group-hover:bg-teal-100 transition-colors" />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-sm text-center" data-testid="card-membership-inactive">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                  <Calendar size={24} />
              </div>
              <h3 className="text-gray-900 font-medium mb-2">No Active Memberships</h3>
              <p className="text-gray-500 text-xs mb-6 max-w-[200px] mx-auto">You need to enroll in a class category to start booking sessions.</p>
              <Link href="/enroll">
                <Button className="w-full bg-airborne-teal hover:bg-airborne-deep text-white shadow-lg shadow-teal-100 rounded-xl" data-testid="button-view-plans">
                  Browse Memberships
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Today's Classes (Only visible if member has membership) */}
        {hasAnyMembership && (
            <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-gray-900">Today's Sessions</h2>
                <Link href="/book">
                <span className="text-xs text-airborne-teal cursor-pointer font-medium" data-testid="link-view-all">View Schedule</span>
                </Link>
            </div>
            
            {availableTodaysClasses.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide">
                    {availableTodaysClasses.map(session => (
                    <div key={session.id} className="min-w-[220px] bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex flex-col justify-between" data-testid={`card-today-session-${session.id}`}>
                        <div>
                        <div className="flex justify-between items-start mb-2">
                            <div className="text-xs font-bold bg-gray-50 px-2 py-1 rounded text-gray-600">
                                {format(session.startTime, 'hh:mm a')}
                            </div>
                            <span className="text-[10px] text-gray-400">{session.totalSpots - session.bookedSpots} spots</span>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1 truncate capitalize">{session.classId.replace(/-/g, ' ')}</h3>
                        <p className="text-xs text-gray-500">Instr. {session.instructor}</p>
                        </div>
                        <div className="mt-4">
                        {bookedSessions.includes(session.id) ? (
                            <Button disabled className="w-full h-9 bg-green-50 text-green-600 border border-green-100 shadow-none">
                                <CheckCircle2 size={14} className="mr-1"/> Booked
                            </Button>
                        ) : (
                            <Link href="/book">
                            <Button size="sm" variant="outline" className="w-full h-9 border-airborne-teal text-airborne-teal hover:bg-teal-50 rounded-lg" data-testid={`button-book-today-${session.id}`}>
                                Book Now
                            </Button>
                            </Link>
                        )}
                        </div>
                    </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 rounded-xl p-6 text-center border border-dashed border-gray-200">
                    <p className="text-gray-500 text-sm">No classes scheduled today for your memberships.</p>
                </div>
            )}
            </div>
        )}
      </div>
    </MobileLayout>
  );
}
