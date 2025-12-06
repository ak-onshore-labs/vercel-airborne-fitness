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
import Sessions from "@/pages/Sessions";
import News from "@/pages/News";

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
