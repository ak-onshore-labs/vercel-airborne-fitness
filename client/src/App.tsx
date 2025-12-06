import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MemberProvider } from "@/context/MemberContext";
import NotFound from "@/pages/not-found";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Book from "@/pages/Book";
import Enroll from "@/pages/Enroll";
import Profile from "@/pages/Profile";
import MobileLayout from "@/components/layout/MobileLayout";

// Placeholder pages for Sessions/News
const Sessions = () => (
  <MobileLayout>
    <div className="p-6 text-center pt-20">
      <h1 className="text-xl font-bold mb-2">My Sessions</h1>
      <p className="text-gray-400">No past sessions found.</p>
    </div>
  </MobileLayout>
);

const News = () => (
  <MobileLayout>
    <div className="p-6 text-center pt-20">
      <h1 className="text-xl font-bold mb-2">Studio News</h1>
      <div className="space-y-4 text-left mt-8">
        <div className="bg-airborne-surface border border-white/5 p-4 rounded-xl">
           <div className="text-xs text-airborne-teal mb-1">Dec 01, 2025</div>
           <h3 className="font-bold mb-1">New Aerial Hoop Workshop</h3>
           <p className="text-sm text-gray-400">Join us this weekend for an intensive hoop workshop...</p>
        </div>
        <div className="bg-airborne-surface border border-white/5 p-4 rounded-xl">
           <div className="text-xs text-airborne-teal mb-1">Nov 28, 2025</div>
           <h3 className="font-bold mb-1">Instructor Spotlight: Sarah</h3>
           <p className="text-sm text-gray-400">Meet our newest aerial silks expert...</p>
        </div>
      </div>
    </div>
  </MobileLayout>
);

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/book" component={Book} />
      <Route path="/enroll" component={Enroll} />
      <Route path="/sessions" component={Sessions} />
      <Route path="/news" component={News} />
      <Route path="/profile" component={Profile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemberProvider>
          <Toaster />
          <Router />
        </MemberProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
