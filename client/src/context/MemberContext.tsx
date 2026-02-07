import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { apiFetch } from '@/lib/api';

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

export interface LoginResult {
  success: boolean;
  isNew?: boolean;
}

interface MemberContextType {
  user: UserProfile | null;
  bookedSessions: Booking[];
  selectedBranch: 'Lower Parel' | 'Mazgaon';
  setSelectedBranch: (branch: 'Lower Parel' | 'Mazgaon') => void;
  login: (phone: string) => Promise<LoginResult>;
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

  const login = async (phone: string): Promise<LoginResult> => {
    try {
      const result = await apiFetch<{ member: UserProfile; memberships: MembershipMap; isNew: boolean }>('/api/login', {
        method: 'POST',
        body: JSON.stringify({ phone }),
      });
      if (!result.ok) {
        toast({ variant: "destructive", title: "Login Failed", description: result.message });
        return { success: false };
      }
      const { member, memberships, isNew } = result.data;
      setUser({
        id: member.id,
        name: member.name,
        phone: member.phone,
        email: member.email,
        memberships,
      });

      // Load bookings
      const bookingsResult = await apiFetch<Booking[]>(`/api/bookings/${member.id}`);
      if (bookingsResult.ok && Array.isArray(bookingsResult.data)) {
        setBookedSessions(bookingsResult.data.filter((b) => b.status !== "CANCELLED"));
      }

      return { success: true, isNew };
    } catch {
      toast({ variant: "destructive", title: "Connection error" });
      return { success: false };
    }
  };

  const logout = () => { setUser(null); setBookedSessions([]); };

  const enroll = async (details: any, selectedPlans: SelectedPlan[], waiver?: any, kidInfo?: any) => {
    if (!user) return;
    const result = await apiFetch<{ memberships: MembershipMap }>('/api/enroll', {
      method: 'POST',
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
    if (!result.ok) {
      toast({ variant: "destructive", title: "Enrollment failed", description: result.message });
      throw new Error(result.message);
    }
    setUser(prev => prev ? { ...prev, name: details.name || prev.name, email: details.email, memberships: result.data.memberships } : null);
    toast({ title: "Enrollment Successful!" });
  };

  const hasMembershipFor = (categoryName: string): boolean => !!user?.memberships[categoryName];

  const refreshBookings = useCallback(async () => {
    if (!user) return;
    const result = await apiFetch<Booking[]>(`/api/bookings/${user.id}`);
    if (result.ok && Array.isArray(result.data)) {
      setBookedSessions(result.data.filter((b) => b.status !== "CANCELLED"));
    }
  }, [user]);

  const getSessionCounts = async (scheduleId: string, date: string) => {
    const result = await apiFetch<{ bookedCount: number; waitlistCount: number }>(
      `/api/session-bookings?scheduleId=${encodeURIComponent(scheduleId)}&date=${encodeURIComponent(date)}`
    );
    if (result.ok) return result.data;
    return { bookedCount: 0, waitlistCount: 0 };
  };

  const bookSession = async (session: any, categoryName: string) => {
    if (!user) return false;
    const result = await apiFetch<Booking>('/api/book', {
      method: 'POST',
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
    if (!result.ok) {
      toast({ variant: "destructive", title: "Booking Failed", description: result.message });
      return false;
    }
    setBookedSessions(prev => [...prev, result.data]);
    setUser(prev => {
      if (!prev) return null;
      const m = prev.memberships[categoryName];
      if (!m) return prev;
      return { ...prev, memberships: { ...prev.memberships, [categoryName]: { ...m, sessionsRemaining: m.sessionsRemaining - 1 } } };
    });
    toast({ title: "Booked successfully!" });
    return true;
  };

  const joinWaitlist = async (session: any, categoryName: string) => {
    if (!user) return false;
    const result = await apiFetch<Booking>('/api/waitlist', {
      method: 'POST',
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
    if (!result.ok) {
      toast({ variant: "destructive", title: "Waitlist Failed", description: result.message });
      return false;
    }
    setBookedSessions(prev => [...prev, result.data]);
    toast({ title: `Added to waitlist. Position #${result.data.waitlistPosition}` });
    return true;
  };

  const cancelBooking = async (bookingId: string) => {
    if (!user) return;
    const result = await apiFetch<{ bookings: Booking[] }>('/api/cancel', {
      method: 'POST',
      body: JSON.stringify({ bookingId, memberId: user.id }),
    });
    if (!result.ok) {
      toast({ variant: "destructive", title: "Cancel failed", description: result.message });
      return;
    }
    setBookedSessions(result.data.bookings);
    const loginResult = await apiFetch<{ memberships: MembershipMap }>('/api/login', {
      method: 'POST',
      body: JSON.stringify({ phone: user.phone }),
    });
    if (loginResult.ok) {
      setUser(prev => prev ? { ...prev, memberships: loginResult.data.memberships } : null);
    }
    toast({ title: "Booking cancelled" });
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
