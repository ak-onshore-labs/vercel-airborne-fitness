import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { MembershipPlan, ClassSession, ClassCategory } from '@/lib/mockData';
import { useLocation } from 'wouter';

export interface MembershipDetails {
  sessionsRemaining: number;
  expiryDate: Date;
  planName: string;
}

// Map of Class Category Name -> Membership Details
export type MembershipMap = Record<string, MembershipDetails>;

interface UserProfile {
  name: string;
  phone: string;
  email?: string;
  memberships: MembershipMap; // Empty if new user
}

interface MemberContextType {
  user: UserProfile | null;
  bookedSessions: string[]; // List of session IDs
  login: (phone: string) => Promise<boolean>;
  logout: () => void;
  enroll: (details: any, plan: MembershipPlan, categoryName: string) => void;
  bookClass: (sessionId: string, categoryName: string) => Promise<boolean>;
  cancelClass: (sessionId: string, categoryName: string) => Promise<void>;
  hasMembershipFor: (categoryName: string) => boolean;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

export function MemberProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [bookedSessions, setBookedSessions] = useState<string[]>([]);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const login = async (phone: string): Promise<boolean> => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (phone === '9999988888') {
      // NEW MEMBER
      setUser({
        name: "New Member",
        phone,
        memberships: {} // Empty memberships
      });
      return true; // Success, caller handles redirect to /enroll
    } 
    else if (phone === '9999977777') {
      // EXISTING MEMBER - Preloaded Data
      setUser({
        name: "Sarah Jenkins",
        phone,
        memberships: {
          "Aerial Fitness": {
            sessionsRemaining: 14,
            expiryDate: new Date("2025-03-30"),
            planName: "3 Months (24 Sessions)"
          },
          "Functional Training": {
            sessionsRemaining: 8,
            expiryDate: new Date("2025-03-21"),
            planName: "Monthly (8 Sessions)"
          }
        }
      });
      return true; // Success, caller handles redirect to /dashboard
    } 
    else {
      // Invalid user
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "Phone number not demo-enabled.",
      });
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setBookedSessions([]);
  };

  const enroll = (details: any, plan: MembershipPlan, categoryName: string) => {
    if (!user) return;

    const newMembership: MembershipDetails = {
      sessionsRemaining: plan.sessions,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * (plan.validityDays || 30)),
      planName: plan.name
    };

    setUser({
      ...user,
      name: details.name || user.name,
      email: details.email,
      memberships: {
        ...user.memberships,
        [categoryName]: newMembership
      }
    });

    toast({
      title: "Enrollment Successful!",
      description: `You are now a member of ${categoryName}.`,
    });
  };

  const hasMembershipFor = (categoryName: string): boolean => {
    if (!user) return false;
    // Simple partial match to handle "Aerial Fitness" matching "Aerial Fitness - Adults" etc if keys vary slightly
    // But based on mockData keys, they should be exact matches from ClassCategory type
    return !!user.memberships[categoryName];
  };

  const bookClass = async (sessionId: string, categoryName: string) => {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate net
    
    if (!user || !hasMembershipFor(categoryName)) {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: "You do not have an active membership for this class type.",
      });
      return false;
    }

    const membership = user.memberships[categoryName];
    if (membership.sessionsRemaining <= 0) {
      toast({
        variant: "destructive",
        title: "Booking Failed",
        description: "No sessions remaining. Please renew.",
      });
      return false;
    }

    if (bookedSessions.includes(sessionId)) {
      return false;
    }

    setBookedSessions(prev => [...prev, sessionId]);
    
    // Decrement session count
    setUser({
      ...user,
      memberships: {
        ...user.memberships,
        [categoryName]: {
          ...membership,
          sessionsRemaining: membership.sessionsRemaining - 1
        }
      }
    });
    
    toast({
      title: "Class Booked!",
      description: "See you at the studio.",
    });
    return true;
  };

  const cancelClass = async (sessionId: string, categoryName: string) => {
    if (!user || !user.memberships[categoryName]) return;

    await new Promise(resolve => setTimeout(resolve, 500));
    setBookedSessions(prev => prev.filter(id => id !== sessionId));
    
    // Refund session
    const membership = user.memberships[categoryName];
    setUser({
      ...user,
      memberships: {
        ...user.memberships,
        [categoryName]: {
          ...membership,
          sessionsRemaining: membership.sessionsRemaining + 1
        }
      }
    });

    toast({
      title: "Booking Cancelled",
      description: "Session credit has been refunded.",
    });
  };

  return (
    <MemberContext.Provider value={{ user, bookedSessions, login, logout, enroll, bookClass, cancelClass, hasMembershipFor }}>
      {children}
    </MemberContext.Provider>
  );
}

export function useMember() {
  const context = useContext(MemberContext);
  if (context === undefined) {
    throw new Error('useMember must be used within a MemberProvider');
  }
  return context;
}
