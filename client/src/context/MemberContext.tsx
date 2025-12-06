import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { MembershipPlan, ClassSession } from '@/lib/mockData';

interface UserProfile {
  name: string;
  phone: string;
  email?: string;
  isEnrolled: boolean;
}

interface ActiveMembership {
  planName: string;
  sessionsRemaining: number;
  expiryDate: Date;
}

interface MemberContextType {
  user: UserProfile | null;
  activeMembership: ActiveMembership | null;
  bookedSessions: string[]; // List of session IDs
  login: (phone: string) => Promise<void>;
  logout: () => void;
  enroll: (details: any, plan: MembershipPlan) => void;
  bookClass: (sessionId: string) => Promise<boolean>;
  cancelClass: (sessionId: string) => Promise<void>;
}

const MemberContext = createContext<MemberContextType | undefined>(undefined);

export function MemberProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeMembership, setActiveMembership] = useState<ActiveMembership | null>(null);
  const [bookedSessions, setBookedSessions] = useState<string[]>([]);
  const { toast } = useToast();

  const login = async (phone: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock user data
    setUser({
      name: "Aditi Sharma",
      phone,
      isEnrolled: false // Default to false to show enroll flow, or true to show dashboard
    });
    
    // For demo purposes, if it's a specific number, give them a membership
    if (phone === '9876543210') {
      setUser({
        name: "Aditi Sharma",
        phone,
        isEnrolled: true
      });
      setActiveMembership({
        planName: "Aerial Fitness - 8 Sessions",
        sessionsRemaining: 5,
        expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20) // 20 days left
      });
    }
  };

  const logout = () => {
    setUser(null);
    setActiveMembership(null);
    setBookedSessions([]);
  };

  const enroll = (details: any, plan: MembershipPlan) => {
    setUser(prev => prev ? { ...prev, ...details, isEnrolled: true } : null);
    setActiveMembership({
      planName: plan.name,
      sessionsRemaining: plan.sessions,
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * (plan.validityDays || 30))
    });
    toast({
      title: "Welcome to Airborne!",
      description: "Membership activated successfully.",
    });
  };

  const bookClass = async (sessionId: string) => {
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate net
    
    if (!activeMembership || activeMembership.sessionsRemaining <= 0) {
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
    setActiveMembership(prev => prev ? { ...prev, sessionsRemaining: prev.sessionsRemaining - 1 } : null);
    
    toast({
      title: "Class Booked!",
      description: "See you at the studio.",
    });
    return true;
  };

  const cancelClass = async (sessionId: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setBookedSessions(prev => prev.filter(id => id !== sessionId));
    setActiveMembership(prev => prev ? { ...prev, sessionsRemaining: prev.sessionsRemaining + 1 } : null);
    toast({
      title: "Booking Cancelled",
      description: "Session credit has been refunded.",
    });
  };

  return (
    <MemberContext.Provider value={{ user, activeMembership, bookedSessions, login, logout, enroll, bookClass, cancelClass }}>
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
