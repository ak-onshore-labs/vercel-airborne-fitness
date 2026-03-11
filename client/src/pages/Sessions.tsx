import { useState, useEffect } from "react";
import { useMember, Booking } from "@/context/MemberContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { HeroWithAccent } from "@/components/HeroWithAccent";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, AlertCircle, Loader2 } from "lucide-react";
import { isBefore, subMinutes, addMinutes } from "date-fns";
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
import { formatTime12h } from "@/lib/formatTime";

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

  const MEMBER_BOOKING_CUTOFF_MINUTES = 5;

  const now = new Date();
  const upcomingBookings: Booking[] = [];
  const pastBookings: Booking[] = [];
  for (const b of bookedSessions) {
    if (b.status === "CANCELLED") continue;
    const [h, m] = (b.startTime || "00:00").split(":").map(Number);
    const sessionStart = new Date(b.sessionDate + "T00:00:00");
    sessionStart.setHours(h, m, 0, 0);
    const cutoff = addMinutes(sessionStart, MEMBER_BOOKING_CUTOFF_MINUTES);
    if (now <= cutoff) upcomingBookings.push(b);
    else pastBookings.push(b);
  }
  upcomingBookings.sort((a, b) => a.sessionDate.localeCompare(b.sessionDate) || a.startTime.localeCompare(b.startTime));
  pastBookings.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate) || b.startTime.localeCompare(a.startTime));

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
    const isWaitlisted = booking.status === "WAITLIST";

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 border-l-2 border-l-airborne-teal dark:border-l-teal-400 p-5 rounded shadow-sm space-y-4 transition-shadow duration-200 hover:shadow-md" data-testid={`card-booking-${booking.id}`}>
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 dark:text-gray-100 capitalize" data-testid={`text-booking-category-${booking.id}`}>{booking.category}</h3>
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                isWaitlisted ? "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800" : "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-800"
              )} data-testid={`badge-status-${booking.id}`}>
                {isWaitlisted ? `Waitlist #${booking.waitlistPosition}` : "Confirmed"}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1.5">
                <Calendar size={12} /> {booking.sessionDate}
              </div>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1.5">
                <Clock size={12} /> {formatTime12h(booking.startTime)} - {formatTime12h(booking.endTime)}
              </div>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1.5">
                <MapPin size={12} /> {booking.branch}
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-50 dark:border-gray-700 flex justify-between items-center">
          {!canCancel ? (
            <span className="text-[10px] font-bold text-red-400 dark:text-red-500 flex items-center gap-1">
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
              canCancel ? "text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-gray-300 dark:text-gray-600"
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
        <HeroWithAccent>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Sessions</h1>
        </HeroWithAccent>

        <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded mb-6">
          <button onClick={() => setActiveTab("upcoming")} className={cn("flex-1 py-2 text-xs font-bold rounded transition-all", activeTab === "upcoming" ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm border-b-2 border-airborne-teal dark:border-teal-400" : "text-gray-500 dark:text-gray-400")} data-testid="tab-upcoming">Upcoming</button>
          <button onClick={() => setActiveTab("past")} className={cn("flex-1 py-2 text-xs font-bold rounded transition-all", activeTab === "past" ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm border-b-2 border-airborne-teal dark:border-teal-400" : "text-gray-500 dark:text-gray-400")} data-testid="tab-past">Past</button>
        </div>

        {activeTab === "upcoming" ? (
          <div className="space-y-4">
            {upcomingBookings.length > 0 ? (
              upcomingBookings.map(booking => <BookingCard key={booking.id} booking={booking} />)
            ) : (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded border border-dashed border-gray-200 dark:border-gray-600">
                <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming sessions.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {pastBookings.length > 0 ? (
              pastBookings.map(booking => <BookingCard key={booking.id} booking={booking} />)
            ) : (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded border border-dashed border-gray-200 dark:border-gray-600">
                <p className="text-gray-500 dark:text-gray-400 text-sm">No past sessions.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}
