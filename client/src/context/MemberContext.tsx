import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiFetch, setStoredToken, getStoredToken } from '@/lib/api';
import { membershipEnrollmentStartBounds } from '@shared/membershipDates';

export interface MembershipDetails {
  id: string;
  sessionsRemaining: number;
  expiryDate: string;
  extensionApplied: boolean;
  planName?: string;
  pauseUsed: boolean;
  pauseStart?: string | null;
  pauseEnd?: string | null;
  validityDays?: number;
  startDate?: string | null;
}

export type MembershipMap = Record<string, MembershipDetails>;

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  dob?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  medicalConditions?: string | null;
  memberships: MembershipMap;
  userRole?: "ADMIN" | "STAFF" | "MEMBER";
}

export interface SelectedPlan {
  category: string;
  plan: { id: string; name: string; sessions: number; price: number; validityDays?: number };
}

export type BookingStatus = "BOOKED" | "CANCELLED" | "ATTENDED" | "ABSENT" | "WAITLIST";

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

export interface VerifyOtpPayload {
  token: string;
  user: { id: string; name: string; mobile: string; gender: string; userRole?: string };
  members: Array<{ id: string; userId: string; memberType: string; name?: string | null; dob?: string | null; gender?: string | null; email?: string | null; emergencyContactName?: string | null; emergencyContactPhone?: string | null; medicalConditions?: string | null }>;
  memberships: MembershipMap;
  isNew: boolean;
}

interface MemberContextType {
  user: UserProfile | null;
  bookedSessions: Booking[];
  selectedBranch: 'Lower Parel' | 'Mazgaon';
  setSelectedBranch: (branch: 'Lower Parel' | 'Mazgaon') => void;
  login: (phone: string) => Promise<LoginResult>;
  loginWithPayload: (payload: VerifyOtpPayload) => Promise<LoginResult>;
  logout: () => void;
  enroll: (details: any, selectedPlans: SelectedPlan[], waiver?: any, kidInfo?: any, transactionId?: string, membershipStartDate?: string) => Promise<void>;
  bookSession: (session: any, categoryName: string) => Promise<boolean>;
  joinWaitlist: (session: any, categoryName: string) => Promise<boolean>;
  cancelBooking: (bookingId: string) => Promise<void>;
  leaveWaitlist: (bookingId: string) => Promise<void>;
  hasMembershipFor: (categoryName: string) => boolean;
  selfExtendMembership: (categoryName: string) => Promise<boolean>;
  pauseMembership: (membershipId: string) => Promise<boolean>;
  refreshBookings: () => Promise<void>;
  getSessionCounts: (scheduleId: string, date: string) => Promise<{ bookedCount: number; waitlistCount: number }>;
  updateProfile: (data: Partial<Pick<UserProfile, 'name' | 'email' | 'dob' | 'emergencyContactName' | 'emergencyContactPhone' | 'medicalConditions'>>) => Promise<boolean>;
  /** False until the first `/api/auth/me` (or no-token) bootstrap finishes. */
  sessionRestored: boolean;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

export function MemberProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bookedSessions, setBookedSessions] = useState<Booking[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<'Lower Parel' | 'Mazgaon'>('Lower Parel');
  const { toast } = useToast();
  const [sessionRestored, setSessionRestored] = useState(false);

  const login = async (_phone: string): Promise<LoginResult> => {
    toast({ variant: "destructive", title: "Use OTP to sign in" });
    return { success: false };
  };

  const loginWithPayload = async (payload: VerifyOtpPayload): Promise<LoginResult> => {
    try {
      setStoredToken(payload.token);
      const { user: apiUser, members, memberships, isNew } = payload;
      const normalizedMemberships: MembershipMap = Object.fromEntries(
        Object.entries(memberships || {}).map(([k, v]) => [
          k,
          {
            ...v,
            extensionApplied: (v as any).extensionApplied === true,
            pauseUsed: (v as any).pauseUsed === true,
            pauseStart: (v as any).pauseStart ?? null,
            pauseEnd: (v as any).pauseEnd ?? null,
            validityDays: typeof (v as any).validityDays === "number" ? (v as any).validityDays : undefined,
            startDate: (v as any).startDate ?? null,
          },
        ])
      );
      const primaryMember = members[0];
      const memberId = primaryMember?.id ?? apiUser.id;
      setUser({
        id: memberId,
        name: (apiUser.name || primaryMember?.name) ?? "",
        phone: apiUser.mobile,
        email: primaryMember?.email ?? undefined,
        dob: primaryMember?.dob ?? undefined,
        emergencyContactName: primaryMember?.emergencyContactName ?? undefined,
        emergencyContactPhone: primaryMember?.emergencyContactPhone ?? undefined,
        medicalConditions: primaryMember?.medicalConditions ?? undefined,
        memberships: normalizedMemberships,
        userRole: ((apiUser as { userRole?: string }).userRole === "ADMIN" || (apiUser as { userRole?: string }).userRole === "STAFF" ? (apiUser as { userRole?: string }).userRole : "MEMBER") as "ADMIN" | "STAFF" | "MEMBER",
      });
      const bookingsResult = await apiFetch<Booking[]>(`/api/bookings/${memberId}`);
      if (bookingsResult.ok && Array.isArray(bookingsResult.data)) {
        setBookedSessions(bookingsResult.data.filter((b) => b.status !== "CANCELLED"));
      }
      return { success: true, isNew };
    } catch {
      toast({ variant: "destructive", title: "Connection error" });
      return { success: false };
    }
  };

  const logout = () => {
    setStoredToken(null);
    setUser(null);
    setBookedSessions([]);
  };

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const token = getStoredToken();
      if (!token) {
        logout();
        if (!cancelled) setSessionRestored(true);
        return;
      }

      const result = await apiFetch<Omit<VerifyOtpPayload, "token">>("/api/auth/me");
      if (cancelled) return;

      if (result.ok) {
        await loginWithPayload({ token, ...result.data });
      } else if (result.status === 401) {
        logout();
      }
      if (!cancelled) setSessionRestored(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time session bootstrap
  }, []);

  const enroll = async (details: any, selectedPlans: SelectedPlan[], waiver?: any, kidInfo?: any, transactionId?: string, membershipStartDate?: string) => {
    if (!user) return;
    const start = membershipStartDate ?? membershipEnrollmentStartBounds(new Date()).min;
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
          planId: sp.plan.id,
          planName: sp.plan.name,
          sessions: sp.plan.sessions,
          price: sp.plan.price,
          validityDays: sp.plan.validityDays,
        })),
        waiver,
        kidDetails: kidInfo,
        membershipStartDate: start,
        ...(transactionId && { transactionId }),
      }),
    });
    if (!result.ok) {
      toast({ variant: "destructive", title: "Enrollment failed", description: result.message });
      throw new Error(result.message);
    }
    setUser(prev => prev ? {
      ...prev,
      name: details.name || prev.name,
      email: details.email,
      dob: details.dob ?? prev.dob,
      emergencyContactName: details.emergencyContactName ?? prev.emergencyContactName,
      emergencyContactPhone: details.emergencyContactPhone ?? prev.emergencyContactPhone,
      medicalConditions: details.medicalConditions ?? prev.medicalConditions,
      memberships: result.data.memberships,
    } : null);
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

  const bookSession = async (session: any, _categoryName: string) => {
    if (!user) return false;
    const result = await apiFetch<Booking>('/api/book', {
      method: 'POST',
      body: JSON.stringify({
        memberId: user.id,
        scheduleId: session.scheduleId,
        sessionDate: session.sessionDate,
      }),
    });
    if (!result.ok) {
      toast({ variant: "destructive", title: "Booking Failed", description: result.message });
      return false;
    }
    setBookedSessions(prev => [...prev, result.data]);
    const cat = result.data.category;
    if (cat) {
      setUser(prev => {
        if (!prev) return null;
        const m = prev.memberships[cat];
        if (!m) return prev;
        return { ...prev, memberships: { ...prev.memberships, [cat]: { ...m, sessionsRemaining: m.sessionsRemaining - 1 } } };
      });
    }
    toast({ title: "Booked successfully!" });
    return true;
  };

  const joinWaitlist = async (session: any, _categoryName: string) => {
    if (!user) return false;
    const result = await apiFetch<Booking>('/api/join-waitlist', {
      method: 'POST',
      body: JSON.stringify({
        memberId: user.id,
        scheduleId: session.scheduleId,
        sessionDate: session.sessionDate,
      }),
    });
    if (!result.ok) {
      toast({ variant: "destructive", title: "Join waitlist failed", description: result.message });
      return false;
    }
    setBookedSessions(prev => [...prev, result.data]);
    toast({ title: "Added to waitlist!" });
    return true;
  };

  const cancelBooking = async (bookingId: string) => {
    if (!user) return;
    const booking = bookedSessions.find((b) => b.id === bookingId);
    const result = await apiFetch<{ bookings: Booking[] }>('/api/cancel', {
      method: 'POST',
      body: JSON.stringify({ bookingId, memberId: user.id }),
    });
    if (!result.ok) {
      toast({ variant: "destructive", title: "Cancel failed", description: result.message });
      return;
    }
    setBookedSessions(result.data.bookings);
    if (booking?.status === "BOOKED" && booking.category) {
      const cat = booking.category;
      setUser((prev) => {
        if (!prev) return null;
        const m = prev.memberships[cat];
        if (!m) return prev;
        return {
          ...prev,
          memberships: {
            ...prev.memberships,
            [cat]: { ...m, sessionsRemaining: m.sessionsRemaining + 1 },
          },
        };
      });
    }
    toast({ title: "Booking cancelled" });
  };

  const leaveWaitlist = async (bookingId: string) => {
    await cancelBooking(bookingId);
  };

  const selfExtendMembership = async (categoryName: string): Promise<boolean> => {
    if (!user) return false;
    const membership = user.memberships[categoryName];
    if (!membership?.id) return false;
    const result = await apiFetch<{ id: string; expiryDate: string; extensionApplied: boolean }>(
      `/api/memberships/${encodeURIComponent(membership.id)}/self-extend`,
      { method: "POST" }
    );
    if (!result.ok) {
      toast({ variant: "destructive", title: "Extension failed", description: result.message });
      return false;
    }
    setUser((prev) => {
      if (!prev) return null;
      const m = prev.memberships[categoryName];
      if (!m) return prev;
      return {
        ...prev,
        memberships: {
          ...prev.memberships,
          [categoryName]: {
            ...m,
            expiryDate: result.data.expiryDate,
            extensionApplied: result.data.extensionApplied,
          },
        },
      };
    });
    toast({ title: "Membership extended by 1 week" });
    return true;
  };

  const pauseMembership = async (membershipId: string): Promise<boolean> => {
    if (!user) return false;
    const result = await apiFetch<{
      pauseStart: string | null;
      pauseEnd: string | null;
      expiryDate: string;
      pauseUsed: boolean;
      sessionsRemaining: number;
    }>(`/api/memberships/${encodeURIComponent(membershipId)}/pause`, { method: "POST" });

    if (!result.ok) {
      toast({ variant: "destructive", title: "Pause failed", description: result.message });
      return false;
    }

    setUser((prev) => {
      if (!prev) return null;
      const entries = Object.entries(prev.memberships);
      const found = entries.find(([, d]) => d.id === membershipId);
      if (!found) return prev;
      const [category] = found;
      const existing = prev.memberships[category];
      return {
        ...prev,
        memberships: {
          ...prev.memberships,
          [category]: {
            ...existing,
            pauseStart: result.data.pauseStart,
            pauseEnd: result.data.pauseEnd,
            expiryDate: result.data.expiryDate,
            pauseUsed: result.data.pauseUsed === true,
            sessionsRemaining: result.data.sessionsRemaining,
          },
        },
      };
    });

    toast({ title: "Membership paused" });
    return true;
  };

  const updateProfile = async (data: Partial<Pick<UserProfile, 'name' | 'email' | 'dob' | 'emergencyContactName' | 'emergencyContactPhone' | 'medicalConditions'>>): Promise<boolean> => {
    if (!user) return false;
    const result = await apiFetch<UserProfile>(`/api/members/${user.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!result.ok) return false;
    const updated = result.data as Partial<UserProfile>;
    setUser(prev => prev ? { ...prev, ...updated, memberships: prev.memberships } : null);
    return true;
  };

  return (
    <MemberContext.Provider value={{ 
      user, bookedSessions, selectedBranch, setSelectedBranch,
      login, loginWithPayload, logout, enroll, bookSession, joinWaitlist, cancelBooking, leaveWaitlist, 
      hasMembershipFor, selfExtendMembership, pauseMembership, refreshBookings, getSessionCounts, updateProfile,
      sessionRestored,
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
