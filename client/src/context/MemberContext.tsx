import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

export interface MembershipDetails {
  id: string;
  sessionsRemaining: number;
  expiryDate: string;
  planName: string;
}

export type MembershipMap = Record<string, MembershipDetails>;

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  memberships: MembershipMap;
}

export interface SelectedPlan {
  category: string;
  plan: { id: string; name: string; sessions: number; price: number; validityDays?: number };
}

export type BookingStatus = "BOOKED" | "WAITLISTED" | "CANCELLED";

export interface Booking {
  id: string;
  scheduleId: string;
  sessionDate: string;
  status: BookingStatus;
  createdAt: string;
  category: string;
  branch: string;
  startTime: string;
  endTime: string;
  waitlistPosition?: number;
}

interface MemberContextType {
  user: UserProfile | null;
  bookedSessions: Booking[];
  selectedBranch: 'Lower Parel' | 'Mazgaon';
  setSelectedBranch: (branch: 'Lower Parel' | 'Mazgaon') => void;
  login: (phone: string) => Promise<boolean>;
  logout: () => void;
  enroll: (details: any, selectedPlans: SelectedPlan[], waiver?: any, kidInfo?: any) => Promise<void>;
  bookSession: (session: any, categoryName: string) => Promise<boolean>;
  joinWaitlist: (session: any, categoryName: string) => Promise<boolean>;
  cancelBooking: (bookingId: string) => Promise<void>;
  leaveWaitlist: (bookingId: string) => Promise<void>;
  hasMembershipFor: (categoryName: string) => boolean;
  refreshBookings: () => Promise<void>;
  getSessionCounts: (scheduleId: string, date: string) => Promise<{ bookedCount: number; waitlistCount: number }>;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

export function MemberProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bookedSessions, setBookedSessions] = useState<Booking[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<'Lower Parel' | 'Mazgaon'>('Lower Parel');
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const login = async (phone: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        toast({ variant: "destructive", title: "Login Failed" });
        return false;
      }
      const data = await res.json();
      setUser({
        id: data.member.id,
        name: data.member.name,
        phone: data.member.phone,
        email: data.member.email,
        memberships: data.memberships,
      });

      // Load bookings
      const bookingsRes = await fetch(`/api/bookings/${data.member.id}`);
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        setBookedSessions(bookingsData.filter((b: any) => b.status !== "CANCELLED"));
      }

      return true;
    } catch {
      toast({ variant: "destructive", title: "Connection error" });
      return false;
    }
  };

  const logout = () => { setUser(null); setBookedSessions([]); };

  const enroll = async (details: any, selectedPlans: SelectedPlan[], waiver?: any, kidInfo?: any) => {
    if (!user) return;
    try {
      const res = await fetch('/api/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: user.id,
          personalDetails: {
            name: details.name,
            email: details.email,
            dob: details.dob,
            emergencyContactName: details.emergencyContactName,
            emergencyContactPhone: details.emergencyContactPhone,
            medicalConditions: details.medicalConditions,
          },
          plans: selectedPlans.map(sp => ({
            category: sp.category,
            planName: sp.plan.name,
            sessions: sp.plan.sessions,
            price: sp.plan.price,
            validityDays: sp.plan.validityDays,
          })),
          waiver,
          kidDetails: kidInfo,
        }),
      });
      if (!res.ok) throw new Error('Enrollment failed');
      const data = await res.json();
      setUser(prev => prev ? { ...prev, name: details.name || prev.name, email: details.email, memberships: data.memberships } : null);
      toast({ title: "Enrollment Successful!" });
    } catch {
      toast({ variant: "destructive", title: "Enrollment failed" });
    }
  };

  const hasMembershipFor = (categoryName: string): boolean => !!user?.memberships[categoryName];

  const refreshBookings = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`/api/bookings/${user.id}`);
    if (res.ok) {
      const data = await res.json();
      setBookedSessions(data.filter((b: any) => b.status !== "CANCELLED"));
    }
  }, [user]);

  const getSessionCounts = async (scheduleId: string, date: string) => {
    const res = await fetch(`/api/session-bookings?scheduleId=${scheduleId}&date=${date}`);
    if (res.ok) return res.json();
    return { bookedCount: 0, waitlistCount: 0 };
  };

  const bookSession = async (session: any, categoryName: string) => {
    if (!user) return false;
    try {
      const res = await fetch('/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: user.id,
          scheduleId: session.scheduleId,
          sessionDate: session.sessionDate,
          category: categoryName,
          branch: selectedBranch,
          startTime: session.startTime,
          endTime: session.endTime,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ variant: "destructive", title: "Booking Failed", description: err.message });
        return false;
      }
      const booking = await res.json();
      setBookedSessions(prev => [...prev, booking]);
      
      // Decrement local membership count
      setUser(prev => {
        if (!prev) return null;
        const m = prev.memberships[categoryName];
        if (!m) return prev;
        return { ...prev, memberships: { ...prev.memberships, [categoryName]: { ...m, sessionsRemaining: m.sessionsRemaining - 1 } } };
      });

      toast({ title: "Booked successfully!" });
      return true;
    } catch {
      toast({ variant: "destructive", title: "Booking error" });
      return false;
    }
  };

  const joinWaitlist = async (session: any, categoryName: string) => {
    if (!user) return false;
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: user.id,
          scheduleId: session.scheduleId,
          sessionDate: session.sessionDate,
          category: categoryName,
          branch: selectedBranch,
          startTime: session.startTime,
          endTime: session.endTime,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ variant: "destructive", title: "Waitlist Failed", description: err.message });
        return false;
      }
      const booking = await res.json();
      setBookedSessions(prev => [...prev, booking]);
      toast({ title: `Added to waitlist. Position #${booking.waitlistPosition}` });
      return true;
    } catch {
      toast({ variant: "destructive", title: "Waitlist error" });
      return false;
    }
  };

  const cancelBooking = async (bookingId: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, memberId: user.id }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBookedSessions(data.bookings);
      
      // Refresh memberships to get updated session count
      const loginRes = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: user.phone }),
      });
      if (loginRes.ok) {
        const loginData = await loginRes.json();
        setUser(prev => prev ? { ...prev, memberships: loginData.memberships } : null);
      }

      toast({ title: "Booking cancelled" });
    } catch {
      toast({ variant: "destructive", title: "Cancel failed" });
    }
  };

  const leaveWaitlist = async (bookingId: string) => {
    await cancelBooking(bookingId);
  };

  return (
    <MemberContext.Provider value={{ 
      user, bookedSessions, selectedBranch, setSelectedBranch,
      login, logout, enroll, bookSession, joinWaitlist, cancelBooking, leaveWaitlist, 
      hasMembershipFor, refreshBookings, getSessionCounts
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
