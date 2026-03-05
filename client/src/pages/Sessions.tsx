import { useState, useEffect } from "react";
import { useMember, Booking } from "@/context/MemberContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, AlertCircle, Loader2 } from "lucide-react";
import { isBefore, subMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

export default function Sessions() {
  const { user, bookedSessions, cancelBooking, leaveWaitlist, refreshBookings } = useMember();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [cancellationWindowMinutes, setCancellationWindowMinutes] = useState(60);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<Booking | null>(null);
  const [isWaitlisted, setIsWaitlisted] = useState(false);

  useEffect(() => {
    apiFetch<{ cancellationWindowMinutes: number }>("/api/settings").then((r) => {
      if (r.ok && typeof r.data?.cancellationWindowMinutes === "number") {
        setCancellationWindowMinutes(r.data.cancellationWindowMinutes);
      }
    });
  }, []);

  const upcomingBookings = bookedSessions
    .filter(b => b.status !== "CANCELLED")
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate) || a.startTime.localeCompare(b.startTime));

  const isCancellationOpen = (sessionDate: string, startTime: string) => {
    try {
      const [h, m] = startTime.split(':').map(Number);
      const dt = new Date(sessionDate + 'T00:00:00');
      dt.setHours(h, m, 0, 0);
      return isBefore(new Date(), subMinutes(dt, cancellationWindowMinutes));
    } catch {
      return true;
    }
  };

  const openCancelModal = (booking: Booking, waitlisted: boolean) => {
    setBookingToCancel(booking);
    setIsWaitlisted(waitlisted);
    setCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    if (isWaitlisted) {
      await leaveWaitlist(bookingToCancel.id);
    } else {
      await cancelBooking(bookingToCancel.id);
    }
    await refreshBookings();
    setCancelModalOpen(false);
    setBookingToCancel(null);
  };

  if (!user) {
    return <div className="flex items-center justify-center h-full">Loading... <Loader2 size={16} /></div>;
  }

  const BookingCard = ({ booking }: { booking: Booking }) => {
    const canCancel = isCancellationOpen(booking.sessionDate, booking.startTime);
    const isWaitlisted = booking.status === "WAITLISTED";

    return (
      <div className="bg-white border border-gray-100 p-5 rounded shadow-sm space-y-4" data-testid={`card-booking-${booking.id}`}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 capitalize" data-testid={`text-booking-category-${booking.id}`}>{booking.category}</h3>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                isWaitlisted ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-green-50 text-green-600 border border-green-100"
              )} data-testid={`badge-status-${booking.id}`}>
                {isWaitlisted ? `Waitlist #${booking.waitlistPosition}` : "Confirmed"}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center text-xs text-gray-500 gap-1.5">
                <Calendar size={12} /> {booking.sessionDate}
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
            onClick={() => canCancel && openCancelModal(booking, isWaitlisted)}
            className={cn(
              "text-xs font-semibold h-8 rounded px-4",
              canCancel ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-gray-300"
            )}
            data-testid={`button-cancel-${booking.id}`}
          >
            {isWaitlisted ? "Leave Waitlist" : "Cancel Booking"}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <MobileLayout>
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Cancel Class?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel? Your slot will be passed to another member in the waiting list and you won&apos;t be able to attend the class.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>No</Button>
            <Button variant="destructive" onClick={handleConfirmCancel}>Yes, Cancel Class</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="p-6 pb-24">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Sessions</h1>
        
        <div className="flex p-1 bg-gray-100 rounded mb-6">
          <button onClick={() => setActiveTab("upcoming")} className={cn("flex-1 py-2 text-xs font-bold rounded transition-all", activeTab === "upcoming" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")} data-testid="tab-upcoming">Upcoming</button>
          <button onClick={() => setActiveTab("past")} className={cn("flex-1 py-2 text-xs font-bold rounded transition-all", activeTab === "past" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")} data-testid="tab-past">Past</button>
        </div>

        {activeTab === "upcoming" ? (
          <div className="space-y-4">
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map(booking => <BookingCard key={booking.id} booking={booking} />)
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded border border-dashed border-gray-200">
                <p className="text-gray-500 text-sm">No upcoming sessions.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400 text-sm">
            No past sessions history available.
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
