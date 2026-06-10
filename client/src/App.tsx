import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/ThemeContext";
import { MemberProvider } from "@/context/MemberContext";
import NotFound from "@/pages/not-found";
import { queryClient } from "./lib/queryClient";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Book from "@/pages/Book";
import Enroll from "@/pages/Enroll";
import EnrollSuccess from "@/pages/EnrollSuccess";
import Profile from "@/pages/Profile";
import ProfileSettings from "@/pages/ProfileSettings";
import Sessions from "@/pages/Sessions";

const AdminApp = lazy(() =>
  import("@/admin").then((m) => ({ default: m.AdminApp }))
);

function AdminRouteFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] dark:bg-[#0B0B0C]">
      <Loader2 className="h-8 w-8 animate-spin text-airborne-teal" aria-label="Loading admin" />
    </div>
  );
}

function AdminRoute() {
  return (
    <Suspense fallback={<AdminRouteFallback />}>
      <AdminApp />
    </Suspense>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/admin" component={AdminRoute} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/book" component={Book} />
      <Route path="/enroll" component={Enroll} />
      <Route path="/enroll/success" component={EnrollSuccess} />
      <Route path="/sessions" component={Sessions} />
      <Route path="/profile" component={Profile} />
      <Route path="/profile/settings" component={ProfileSettings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <MemberProvider>
            <Toaster />
            <Router />
          </MemberProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
