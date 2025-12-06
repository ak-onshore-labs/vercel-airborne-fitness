import { useMember } from "@/context/MemberContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { MOCK_SCHEDULE } from "@/lib/mockData";
import { ArrowRight, Calendar, CheckCircle2 } from "lucide-react";

export default function Dashboard() {
  const { user, activeMembership, bookedSessions } = useMember();
  const [, setLocation] = useLocation();

  if (!user) {
    setLocation("/login");
    return null;
  }

  // Filter today's classes
  const today = new Date();
  const todaysClasses = MOCK_SCHEDULE.filter(session => 
    session.startTime.getDate() === today.getDate() &&
    session.startTime.getMonth() === today.getMonth()
  );

  return (
    <MobileLayout>
      <div className="p-6 space-y-8">
        
        {/* Greeting & Status */}
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-greeting">Hi, {user.name.split(' ')[0]}</h1>
              <p className="text-gray-400 text-sm">Ready to fly today?</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
              activeMembership 
                ? "bg-airborne-teal/10 border-airborne-teal text-airborne-teal" 
                : "bg-gray-800 border-gray-700 text-gray-400"
            }`} data-testid="status-membership">
              {activeMembership ? "Active Member" : "Guest"}
            </div>
          </div>

          {activeMembership ? (
            <div className="bg-gradient-to-br from-airborne-deep to-airborne-teal p-5 rounded-2xl shadow-lg relative overflow-hidden" data-testid="card-membership-active">
              <div className="relative z-10 text-white">
                <p className="text-xs font-medium opacity-80 mb-1">{activeMembership.planName}</p>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold">{activeMembership.sessionsRemaining}</span>
                  <span className="text-sm opacity-80">sessions left</span>
                </div>
                <div className="w-full bg-black/20 h-1.5 rounded-full mb-2">
                  <div className="bg-white h-full rounded-full w-3/4" />
                </div>
                <p className="text-[10px] opacity-70">Expires {format(activeMembership.expiryDate, 'dd MMM yyyy')}</p>
              </div>
              {/* Abstract decorative circle */}
              <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
            </div>
          ) : (
            <div className="bg-airborne-surface border border-white/5 p-5 rounded-2xl shadow-sm" data-testid="card-membership-inactive">
              <h3 className="text-white font-medium mb-1">No Active Membership</h3>
              <p className="text-gray-400 text-xs mb-4">Start your journey with a class pack.</p>
              <Link href="/enroll">
                <Button size="sm" className="w-full bg-airborne-teal hover:bg-airborne-aqua text-white" data-testid="button-view-plans">
                  View Plans
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/book">
            <div className="bg-airborne-surface border border-white/5 p-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group" data-testid="card-action-book">
              <div className="w-10 h-10 rounded-full bg-airborne-teal/10 flex items-center justify-center text-airborne-teal mb-3 group-hover:scale-110 transition-transform">
                <Calendar size={20} />
              </div>
              <h3 className="font-medium text-sm">Book Class</h3>
            </div>
          </Link>
          <Link href="/sessions">
            <div className="bg-airborne-surface border border-white/5 p-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group" data-testid="card-action-sessions">
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-110 transition-transform">
                <CheckCircle2 size={20} />
              </div>
              <h3 className="font-medium text-sm">My Sessions</h3>
            </div>
          </Link>
        </div>

        {/* Today's Classes */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg">Today's Classes</h2>
            <Link href="/book">
              <span className="text-xs text-airborne-teal cursor-pointer" data-testid="link-view-all">View all</span>
            </Link>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6 scrollbar-hide">
            {todaysClasses.map(session => (
              <div key={session.id} className="min-w-[200px] bg-airborne-surface border border-white/5 p-4 rounded-xl flex flex-col justify-between" data-testid={`card-today-session-${session.id}`}>
                <div>
                  <div className="text-xs text-airborne-teal font-medium mb-1 uppercase tracking-wide">
                    {format(session.startTime, 'hh:mm a')}
                  </div>
                  <h3 className="font-medium text-white mb-1 truncate">{session.classId.replace('-', ' ').toUpperCase()}</h3>
                  <p className="text-xs text-gray-500">{session.totalSpots - session.bookedSpots} spots left</p>
                </div>
                <div className="mt-4">
                  {bookedSessions.includes(session.id) ? (
                     <div className="text-xs font-medium text-green-400 flex items-center gap-1">
                       <CheckCircle2 size={12} /> Booked
                     </div>
                  ) : (
                    <Link href="/book">
                      <Button size="sm" variant="outline" className="w-full h-8 text-xs border-white/10 hover:bg-white/5" data-testid={`button-book-today-${session.id}`}>
                        Book Now
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {todaysClasses.length === 0 && (
               <div className="w-full text-center py-8 text-gray-500 text-sm">
                 No classes scheduled for today.
               </div>
            )}
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
