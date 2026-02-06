import { useMember, Booking } from "@/context/MemberContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, XCircle, AlertCircle } from "lucide-react";
import { format, isBefore, subHours } from "date-fns";
import { cn } from "@/lib/utils";

export default function Sessions() {
  const { bookedSessions, cancelBooking, leaveWaitlist } = useMember();
  
  const upcomingBookings = bookedSessions
    .filter(b => b.status !== "CANCELLED")
    .sort((a, b) => a.fullStartTime.getTime() - b.fullStartTime.getTime());

  const isCancellationOpen = (startTime: Date) => {
    return isBefore(new Date(), subHours(startTime, 1));
  };

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const canCancel = isCancellationOpen(booking.fullStartTime);
    const isWaitlisted = booking.status === "WAITLISTED";

    return (
      <div className="bg-white border border-gray-100 p-5 rounded shadow-sm space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 capitalize">{booking.category}</h3>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                isWaitlisted ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-green-50 text-green-600 border border-green-100"
              )}>
                {isWaitlisted ? `Waitlist #${booking.waitlistPosition}` : "Confirmed"}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center text-xs text-gray-500 gap-1.5">
                <Calendar size={12} /> {format(booking.fullStartTime, "EEEE, dd MMM")}
              </div>
              <div className="flex items-center text-xs text-gray-500 gap-1.5">
                <Clock size={12} /> {booking.startTime} - {booking.endTime}
              </div>
              <div className="flex items-center text-xs text-gray-500 gap-1.5">
                <MapPin size={12} /> {booking.branch}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-50 flex justify-between items-center">
          {!canCancel ? (
            <span className="text-[10px] font-bold text-red-400 flex items-center gap-1">
              <AlertCircle size={12} /> Cancellation closed
            </span>
          ) : (
            <div />
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            disabled={!canCancel}
            onClick={() => isWaitlisted ? leaveWaitlist(booking.id) : cancelBooking(booking.id)}
            className={cn(
              "text-xs font-semibold h-8 rounded px-4",
              canCancel ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-gray-300"
            )}
          >
            {isWaitlisted ? "Leave Waitlist" : "Cancel Booking"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <MobileLayout>
      <div className="p-6 pb-24">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Sessions</h1>
        
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="w-full bg-gray-100 p-1 rounded mb-6">
            <TabsTrigger value="upcoming" className="flex-1 rounded py-2 text-sm">Upcoming</TabsTrigger>
            <TabsTrigger value="past" className="flex-1 rounded py-2 text-sm">Past</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upcoming" className="space-y-4">
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map(booking => (
                <BookingCard key={booking.id} booking={booking} />
              ))
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded border border-dashed border-gray-200">
                <p className="text-gray-500 text-sm">No upcoming sessions.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="past" className="text-center py-12 text-gray-400 text-sm">
            No past sessions history available in demo.
          </TabsContent>
        </Tabs>
      </div>
    </MobileLayout>
  );
}
