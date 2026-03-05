import { useMember } from "@/context/MemberContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { Calendar, CheckCircle2, PlusCircle, Loader2 } from "lucide-react";

export default function Dashboard() {
  const { user, bookedSessions } = useMember();
  const [, setLocation] = useLocation();

  if (!user) {
    return <div className="flex items-center justify-center h-full">Loading... <Loader2 size={16} /></div>;
  }

  const activeMemberships = Object.keys(user.memberships);
  const hasAnyMembership = activeMemberships.length > 0;

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todaysBookings = bookedSessions.filter(b => b.sessionDate === todayStr && b.status === "BOOKED");

  return (
    <MobileLayout>
      <div className="p-6 space-y-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900" data-testid="text-greeting">Hi, {user.name.split(' ')[0]}</h1>
          <p className="text-gray-500 text-sm">Welcome back to Airborne.</p>
        </div>

        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="font-semibold text-gray-900">Your Memberships</h2>
                {hasAnyMembership && (
                    <Link href="/enroll">
                        <Button variant="ghost" size="sm" className="text-airborne-teal text-xs h-8 hover:bg-teal-50" data-testid="button-add-membership">
                            <PlusCircle size={14} className="mr-1"/> Add New
                        </Button>
                    </Link>
                )}
            </div>

          {hasAnyMembership ? (
            <div className="space-y-3">
              {Object.entries(user.memberships).map(([category, details]) => (
                <div key={category} className="bg-white border border-gray-100 p-5 rounded shadow-sm relative overflow-hidden group" data-testid={`card-membership-${category}`}>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900 text-lg">{category}</h3>
                        <span className="bg-teal-50 text-airborne-teal text-[10px] px-2 py-1 rounded font-medium uppercase tracking-wide">Active</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">{details.planName}</p>
                    <div className="flex items-end justify-between">
                        <div>
                            <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-airborne-teal" data-testid={`text-sessions-${category}`}>{details.sessionsRemaining}</span>
                            <span className="text-xs text-gray-400 font-medium">sessions left</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">Expires {format(new Date(details.expiryDate), 'dd MMM yyyy')}</p>
                        </div>
                        <Link href="/book">
                            <Button size="sm" className="h-9 bg-gray-900 text-white rounded" data-testid={`button-book-${category}`}>Book Class</Button>
                        </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-100 p-6 rounded shadow-sm text-center" data-testid="card-membership-inactive">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                  <Calendar size={24} />
              </div>
              <h3 className="text-gray-900 font-medium mb-2">No Active Memberships</h3>
              <p className="text-gray-500 text-xs mb-6 max-w-[200px] mx-auto">Enroll in a class category to start booking sessions.</p>
              <Link href="/enroll">
                <Button className="w-full bg-airborne-teal text-white rounded shadow-lg shadow-teal-100" data-testid="button-view-plans">Browse Memberships</Button>
              </Link>
            </div>
          )}
        </div>

        {hasAnyMembership && (
            <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-gray-900">Today's Bookings</h2>
                <Link href="/book">
                  <span className="text-xs text-airborne-teal font-medium" data-testid="link-view-all">View Schedule</span>
                </Link>
            </div>
            {todaysBookings.length > 0 ? (
                <div className="space-y-3">
                    {todaysBookings.map(booking => (
                    <div key={booking.id} className="bg-white border border-gray-100 p-4 rounded shadow-sm flex justify-between items-center" data-testid={`card-today-booking-${booking.id}`}>
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1 capitalize">{booking.category}</h3>
                          <p className="text-xs text-gray-500">{booking.startTime} - {booking.endTime} | {booking.branch}</p>
                        </div>
                        <Button disabled className="h-9 bg-green-50 text-green-600 border border-green-100 shadow-none"><CheckCircle2 size={14} className="mr-1"/> Booked</Button>
                    </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 rounded p-6 text-center border border-dashed border-gray-200">
                    <p className="text-gray-500 text-sm">No bookings for today. <Link href="/book"><span className="text-airborne-teal font-medium cursor-pointer">Book a class</span></Link></p>
                </div>
            )}
            </div>
        )}
      </div>
    </MobileLayout>
  );
}
