import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { MembershipPlan, ClassSession, ClassCategory } from '@/lib/mockData';
import { useLocation } from 'wouter';
import { isBefore, subHours } from 'date-fns';

export interface MembershipDetails {
  sessionsRemaining: number;
  expiryDate: Date;
  planName: string;
}

export type MembershipMap = Record<string, MembershipDetails>;

interface UserProfile {
  name: string;
  phone: string;
  email?: string;
  memberships: MembershipMap;
}

export interface SelectedPlan {
  category: string;
  plan: MembershipPlan;
}

export type BookingStatus = "BOOKED" | "WAITLISTED" | "CANCELLED";

export interface Booking {
  id: string;
  sessionId: string;
  status: BookingStatus;
  createdAt: number;
  category: string;
  branch: "Lower Parel" | "Mazgaon";
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  waitlistPosition?: number;
  fullStartTime: Date;
}

interface SessionInventory {
  capacity: number;
  bookedCount: number;
  waitlistCount: number;
}

interface MemberContextType {
  user: UserProfile | null;
  bookedSessions: Booking[];
  selectedBranch: 'Lower Parel' | 'Mazgaon';
  setSelectedBranch: (branch: 'Lower Parel' | 'Mazgaon') => void;
  sessionInventory: Record<string, SessionInventory>;
  login: (phone: string) => Promise<boolean>;
  logout: () => void;
  enroll: (details: any, selectedPlans: SelectedPlan[]) => void;
  bookSession: (session: any, categoryName: string) => Promise<boolean>;
  joinWaitlist: (session: any, categoryName: string) => Promise<boolean>;
  cancelBooking: (bookingId: string) => Promise<void>;
  leaveWaitlist: (bookingId: string) => Promise<void>;
  hasMembershipFor: (categoryName: string) => boolean;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

export function MemberProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bookedSessions, setBookedSessions] = useState<Booking[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<'Lower Parel' | 'Mazgaon'>('Lower Parel');
  const [sessionInventory, setSessionInventory] = useState<Record<string, SessionInventory>>({
    "session-0-2": { capacity: 14, bookedCount: 14, waitlistCount: 2 }, // Seed full
    "session-1-2": { capacity: 14, bookedCount: 14, waitlistCount: 0 }, // Seed full
  });
  
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const getInventory = (sessionId: string): SessionInventory => {
    return sessionInventory[sessionId] || { capacity: 14, bookedCount: 8, waitlistCount: 0 };
  };

  const login = async (phone: string): Promise<boolean> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    if (phone === '9999988888' || phone === '9999977777') {
      setUser({
        name: phone === '9999977777' ? "Sarah Jenkins" : "New Member",
        phone,
        memberships: phone === '9999977777' ? {
          "Aerial Fitness": { sessionsRemaining: 14, expiryDate: new Date("2025-03-30"), planName: "3 Months (24 Sessions)" },
          "Functional Training": { sessionsRemaining: 8, expiryDate: new Date("2025-03-21"), planName: "Monthly (8 Sessions)" }
        } : {}
      });
      return true;
    } 
    toast({ variant: "destructive", title: "Access Denied", description: "Phone number not demo-enabled." });
    return false;
  };

  const logout = () => { setUser(null); setBookedSessions([]); };

  const enroll = (details: any, selectedPlans: SelectedPlan[]) => {
    if (!user) return;
    const newMemberships: MembershipMap = { ...user.memberships };
    selectedPlans.forEach(({ category, plan }) => {
      newMemberships[category] = {
        sessionsRemaining: plan.sessions,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * (plan.validityDays || 30)),
        planName: plan.name
      };
    });
    setUser({ ...user, name: details.name || user.name, email: details.email, memberships: newMemberships });
    toast({ title: "Enrollment Successful!", description: `You are now a member.` });
  };

  const hasMembershipFor = (categoryName: string): boolean => !!user?.memberships[categoryName];

  const bookSession = async (session: any, categoryName: string) => {
    if (!user || !hasMembershipFor(categoryName)) return false;
    const inv = getInventory(session.id);
    if (inv.bookedCount >= inv.capacity) return false;

    const booking: Booking = {
      id: Math.random().toString(36).substr(2, 9),
      sessionId: session.id,
      status: "BOOKED",
      createdAt: Date.now(),
      category: categoryName,
      branch: selectedBranch,
      date: session.startTime.toISOString().split('T')[0],
      startTime: session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      endTime: session.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fullStartTime: session.startTime
    };

    setBookedSessions(prev => [...prev, booking]);
    setSessionInventory(prev => ({
      ...prev,
      [session.id]: { ...getInventory(session.id), bookedCount: getInventory(session.id).bookedCount + 1 }
    }));
    
    const membership = user.memberships[categoryName];
    setUser({
      ...user,
      memberships: { ...user.memberships, [categoryName]: { ...membership, sessionsRemaining: membership.sessionsRemaining - 1 } }
    });

    toast({ title: "Booked successfully" });
    return true;
  };

  const joinWaitlist = async (session: any, categoryName: string) => {
    if (!user || !hasMembershipFor(categoryName)) return false;
    const inv = getInventory(session.id);
    const newWaitlistCount = inv.waitlistCount + 1;

    const booking: Booking = {
      id: Math.random().toString(36).substr(2, 9),
      sessionId: session.id,
      status: "WAITLISTED",
      createdAt: Date.now(),
      category: categoryName,
      branch: selectedBranch,
      date: session.startTime.toISOString().split('T')[0],
      startTime: session.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      endTime: session.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      waitlistPosition: newWaitlistCount,
      fullStartTime: session.startTime
    };

    setBookedSessions(prev => [...prev, booking]);
    setSessionInventory(prev => ({
      ...prev,
      [session.id]: { ...getInventory(session.id), waitlistCount: newWaitlistCount }
    }));

    toast({ title: `Added to waitlist. Position #${newWaitlistCount}` });
    return true;
  };

  const recomputeWaitlist = (sessionId: string, currentBookings: Booking[]) => {
    let position = 1;
    return currentBookings.map(b => {
      if (b.sessionId === sessionId && b.status === "WAITLISTED") {
        return { ...b, waitlistPosition: position++ };
      }
      return b;
    });
  };

  const cancelBooking = async (bookingId: string) => {
    const booking = bookedSessions.find(b => b.id === bookingId);
    if (!booking) return;

    const newBookings = bookedSessions.map(b => b.id === bookingId ? { ...b, status: "CANCELLED" as BookingStatus } : b);
    const sessionId = booking.sessionId;
    const inv = getInventory(sessionId);
    
    let updatedBookings = newBookings;
    let newInv = { ...inv, bookedCount: Math.max(0, inv.bookedCount - 1) };

    if (inv.waitlistCount > 0) {
      const firstWaitlisted = updatedBookings
        .filter(b => b.sessionId === sessionId && b.status === "WAITLISTED")
        .sort((a, b) => a.createdAt - b.createdAt)[0];

      if (firstWaitlisted) {
        updatedBookings = updatedBookings.map(b => b.id === firstWaitlisted.id ? { ...b, status: "BOOKED" as BookingStatus, waitlistPosition: undefined } : b);
        newInv.waitlistCount -= 1;
        newInv.bookedCount += 1;
        updatedBookings = recomputeWaitlist(sessionId, updatedBookings);
        toast({ title: "Spot opened. Waitlist member promoted." });
      }
    }

    setBookedSessions(updatedBookings);
    setSessionInventory(prev => ({ ...prev, [sessionId]: newInv }));
    
    if (user && user.memberships[booking.category]) {
      const membership = user.memberships[booking.category];
      setUser({
        ...user,
        memberships: { ...user.memberships, [booking.category]: { ...membership, sessionsRemaining: membership.sessionsRemaining + 1 } }
      });
    }

    toast({ title: "Booking cancelled" });
  };

  const leaveWaitlist = async (bookingId: string) => {
    const booking = bookedSessions.find(b => b.id === bookingId);
    if (!booking) return;

    let updatedBookings = bookedSessions.map(b => b.id === bookingId ? { ...b, status: "CANCELLED" as BookingStatus } : b);
    const sessionId = booking.sessionId;
    const inv = getInventory(sessionId);

    updatedBookings = recomputeWaitlist(sessionId, updatedBookings);
    
    setBookedSessions(updatedBookings);
    setSessionInventory(prev => ({
      ...prev,
      [sessionId]: { ...getInventory(sessionId), waitlistCount: Math.max(0, inv.waitlistCount - 1) }
    }));

    toast({ title: "Removed from waitlist" });
  };

  return (
    <MemberContext.Provider value={{ 
      user, bookedSessions, selectedBranch, setSelectedBranch, sessionInventory,
      login, logout, enroll, bookSession, joinWaitlist, cancelBooking, leaveWaitlist, hasMembershipFor 
    }}>
      {children}
    </MemberContext.Provider>
  );
}

export function useMember() {
  const context = useContext(MemberContext);
  if (!context) throw new Error('useMember must be used within a MemberProvider');
  return context;
}
