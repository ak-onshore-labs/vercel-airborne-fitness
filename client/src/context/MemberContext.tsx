import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { MembershipPlan, ClassSession, ClassCategory } from '@/lib/mockData';
import { useLocation } from 'wouter';

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

interface MemberContextType {
  user: UserProfile | null;
  bookedSessions: { sessionId: string; branch: string }[];
  selectedBranch: 'Lower Parel' | 'Mazgaon';
  setSelectedBranch: (branch: 'Lower Parel' | 'Mazgaon') => void;
  login: (phone: string) => Promise<boolean>;
  logout: () => void;
  enroll: (details: any, selectedPlans: SelectedPlan[]) => void;
  bookClass: (sessionId: string, categoryName: string, branch: string) => Promise<boolean>;
  cancelClass: (sessionId: string, categoryName: string) => Promise<void>;
  hasMembershipFor: (categoryName: string) => boolean;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

export function MemberProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bookedSessions, setBookedSessions] = useState<{ sessionId: string; branch: string }[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<'Lower Parel' | 'Mazgaon'>('Lower Parel');
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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

  const bookClass = async (sessionId: string, categoryName: string, branch: string) => {
    await new Promise(resolve => setTimeout(resolve, 800));
    if (!user || !hasMembershipFor(categoryName)) {
      toast({ variant: "destructive", title: "Booking Failed", description: "No active membership." });
      return false;
    }
    const membership = user.memberships[categoryName];
    if (membership.sessionsRemaining <= 0) {
      toast({ variant: "destructive", title: "Booking Failed", description: "No sessions remaining." });
      return false;
    }
    setBookedSessions(prev => [...prev, { sessionId, branch }]);
    setUser({
      ...user,
      memberships: { ...user.memberships, [categoryName]: { ...membership, sessionsRemaining: membership.sessionsRemaining - 1 } }
    });
    toast({ title: "Class Booked!", description: `See you at ${branch}.` });
    return true;
  };

  const cancelClass = async (sessionId: string, categoryName: string) => {
    if (!user || !user.memberships[categoryName]) return;
    await new Promise(resolve => setTimeout(resolve, 500));
    setBookedSessions(prev => prev.filter(b => b.sessionId !== sessionId));
    const membership = user.memberships[categoryName];
    setUser({
      ...user,
      memberships: { ...user.memberships, [categoryName]: { ...membership, sessionsRemaining: membership.sessionsRemaining + 1 } }
    });
    toast({ title: "Booking Cancelled" });
  };

  return (
    <MemberContext.Provider value={{ user, bookedSessions, selectedBranch, setSelectedBranch, login, logout, enroll, bookClass, cancelClass, hasMembershipFor }}>
      {children}
    </MemberContext.Provider>
  );
}

export function useMember() {
  const context = useContext(MemberContext);
  if (!context) throw new Error('useMember must be used within a MemberProvider');
  return context;
}
