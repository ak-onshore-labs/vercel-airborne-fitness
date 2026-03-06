import { useState, useEffect, useCallback } from "react";
import { format, isSameDay, addDays, startOfToday } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApiFetch, type ListResponse } from "../api";
import { AdminTablePagination } from "../components/AdminTablePagination";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type MemberOption = { id: string; name?: string | null; mobile?: string };

type SessionDisplay = {
  scheduleId: string;
  sessionDate: string;
  classId: string;
  category: string;
  branch: string;
  startTime: string;
  endTime: string;
  capacity: number;
};

type MembershipForMember = {
  id: string;
  memberId: string;
  membershipPlanId: string;
  sessionsRemaining: number;
  expiryDate: string;
  classTypeName?: string;
};

type BookingItem = {
  id: string;
  memberId: string;
  scheduleId: string;
  sessionDate: string;
  status: string;
  memberMobile?: string;
  classTypeName?: string;
  startTime?: string;
  endTime?: string;
  branch?: string;
};

type UpcomingDay = {
  date: string;
  sessions: Array<{
    scheduleId: string;
    sessionDate: string;
    startTime: string;
    endTime: string;
    category: string;
    bookingCount: number;
    capacity: number;
  }>;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function getNext7Days(): Date[] {
  const today = startOfToday();
  return Array.from({ length: 7 }).map((_, i) => addDays(today, i));
}

export default function AdminBookings() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sessionDate, setSessionDate] = useState("");
  const [memberMobile, setMemberMobile] = useState("");
  const [classTypeName, setClassTypeName] = useState("");
  const [searchSessionDate, setSearchSessionDate] = useState("");
  const [searchMemberMobile, setSearchMemberMobile] = useState("");
  const [searchClassTypeName, setSearchClassTypeName] = useState("");
  const [data, setData] = useState<ListResponse<BookingItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [branches, setBranches] = useState<string[]>([]);
  const [upcomingBranch, setUpcomingBranch] = useState("");
  const [upcomingData, setUpcomingData] = useState<UpcomingDay[]>([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);

  const [addBookingOpen, setAddBookingOpen] = useState(false);
  const [addStep, setAddStep] = useState<1 | 2>(1);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSearchResults, setMemberSearchResults] = useState<MemberOption[]>([]);
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null);
  const [addLoadingMemberSearch, setAddLoadingMemberSearch] = useState(false);
  const addDates = getNext7Days();
  const [addBranch, setAddBranch] = useState("");
  const [addSelectedDate, setAddSelectedDate] = useState<Date | null>(null);
  const [addSessions, setAddSessions] = useState<SessionDisplay[]>([]);
  const [addSessionCounts, setAddSessionCounts] = useState<Record<string, { bookedCount: number; waitlistCount: number }>>({});
  const [addFilter, setAddFilter] = useState("My Classes");
  const [addApplicableClassTypes, setAddApplicableClassTypes] = useState<string[]>([]);
  const [addLoadingSchedule, setAddLoadingSchedule] = useState(false);
  const [addBookingLoadingId, setAddBookingLoadingId] = useState<string | null>(null);
  const [addMemberBookings, setAddMemberBookings] = useState<Array<{ scheduleId: string; sessionDate: string }>>([]);
  const { toast } = useToast();

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (searchSessionDate) params.set("sessionDate", searchSessionDate);
    if (searchMemberMobile) params.set("memberMobile", searchMemberMobile);
    if (searchClassTypeName) params.set("classTypeName", searchClassTypeName);
    const res = await adminApiFetch<ListResponse<BookingItem>>(`/api/admin/bookings?${params}`);
    if (res.ok) setData(res.data);
    else setError(res.message);
    setLoading(false);
  }, [page, limit, searchSessionDate, searchMemberMobile, searchClassTypeName]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    adminApiFetch<string[]>("/api/admin/branches").then((r) => {
      if (r.ok) {
        setBranches(r.data);
        if (r.data.length > 0 && !upcomingBranch) setUpcomingBranch(r.data[0]);
      }
    });
  }, []);

  const fetchUpcoming = useCallback(async () => {
    if (!upcomingBranch) return;
    setUpcomingLoading(true);
    const fromDate = new Date().toISOString().slice(0, 10);
    const res = await adminApiFetch<UpcomingDay[]>(`/api/admin/bookings/upcoming?branch=${encodeURIComponent(upcomingBranch)}&fromDate=${fromDate}&days=5`);
    if (res.ok) setUpcomingData(res.data);
    else setUpcomingData([]);
    setUpcomingLoading(false);
  }, [upcomingBranch]);

  useEffect(() => {
    if (upcomingBranch) fetchUpcoming();
    else setUpcomingData([]);
  }, [upcomingBranch, fetchUpcoming]);

  const openAddBooking = () => {
    setAddBookingOpen(true);
    setAddStep(1);
    setMemberSearch("");
    setMemberSearchResults([]);
    setSelectedMember(null);
    setAddFilter("My Classes");
    setAddBranch(branches[0] ?? "");
    setAddSelectedDate(addDates[0] ?? null);
    setAddSessions([]);
    setAddSessionCounts({});
  };

  const closeAddBooking = () => {
    setAddBookingOpen(false);
    setSelectedMember(null);
    setAddMemberBookings([]);
  };

  const searchMembers = useCallback(async () => {
    const q = memberSearch.trim();
    if (!q) {
      setMemberSearchResults([]);
      return;
    }
    setAddLoadingMemberSearch(true);
    const params = new URLSearchParams({ limit: "50" });
    if (/^\d+$/.test(q.replace(/\s/g, ""))) params.set("phone", q);
    else params.set("name", q);
    const res = await adminApiFetch<ListResponse<MemberOption>>(`/api/admin/members?${params}`);
    if (res.ok) setMemberSearchResults(res.data.items);
    else setMemberSearchResults([]);
    setAddLoadingMemberSearch(false);
  }, [memberSearch]);

  useEffect(() => {
    if (!addBookingOpen || addStep !== 2 || !selectedMember) {
      setAddApplicableClassTypes([]);
      return;
    }
    adminApiFetch<ListResponse<MembershipForMember>>(
      `/api/admin/memberships?memberId=${encodeURIComponent(selectedMember.id)}&limit=100`
    ).then((r) => {
      if (!r.ok || !r.data?.items) {
        setAddApplicableClassTypes([]);
        return;
      }
      const now = new Date();
      const active = r.data.items.filter(
        (m) =>
          m.sessionsRemaining > 0 &&
          m.expiryDate &&
          new Date(m.expiryDate) > now &&
          m.classTypeName
      );
      const names = Array.from(new Set(active.map((m) => m.classTypeName!)));
      setAddApplicableClassTypes(names);
    });
  }, [addBookingOpen, addStep, selectedMember?.id]);

  useEffect(() => {
    if (!addBookingOpen || addStep !== 2 || !addBranch || !addSelectedDate) {
      setAddSessions([]);
      return;
    }
    setAddLoadingSchedule(true);
    const dateStr = format(addSelectedDate, "yyyy-MM-dd");
    adminApiFetch<{ sessions: SessionDisplay[] }>(
      `/api/schedule?branch=${encodeURIComponent(addBranch)}&date=${encodeURIComponent(dateStr)}`
    ).then((res) => {
      if (res.ok && res.data?.sessions) setAddSessions(res.data.sessions);
      else setAddSessions([]);
      setAddLoadingSchedule(false);
    });
  }, [addBookingOpen, addStep, addBranch, addSelectedDate]);

  useEffect(() => {
    if (addSessions.length === 0) return;
    addSessions.forEach((s) => {
      const key = `${s.scheduleId}_${s.sessionDate}`;
      if (!addSessionCounts[key]) {
        adminApiFetch<{ bookedCount: number; waitlistCount: number }>(
          `/api/session-bookings?scheduleId=${encodeURIComponent(s.scheduleId)}&date=${encodeURIComponent(s.sessionDate)}`
        ).then((r) => {
          if (r.ok) setAddSessionCounts((prev) => ({ ...prev, [key]: r.data }));
        });
      }
    });
  }, [addSessions.length]);

  useEffect(() => {
    if (!selectedMember || addStep !== 2) return;
    adminApiFetch<Array<{ scheduleId: string; sessionDate: string; status?: string }>>(`/api/bookings/${selectedMember.id}`).then((r) => {
      if (r.ok && Array.isArray(r.data)) {
        setAddMemberBookings(
          r.data.filter((b) => b.status !== "CANCELLED").map((b) => ({ scheduleId: b.scheduleId, sessionDate: b.sessionDate }))
        );
      } else {
        setAddMemberBookings([]);
      }
    });
  }, [selectedMember?.id, addStep]);

  const addFilteredSessions =
    addFilter === "All"
      ? addSessions
      : addFilter === "My Classes"
        ? addSessions.filter((s) => addApplicableClassTypes.includes(s.category))
        : addSessions.filter((s) => s.category === addFilter);

  const addFilterChips = ["All", "My Classes", ...addApplicableClassTypes];

  const handleAdminBook = async (session: SessionDisplay) => {
    if (!selectedMember) return;
    const key = `${session.scheduleId}_${session.sessionDate}`;
    const counts = addSessionCounts[key] || { bookedCount: 0, waitlistCount: 0 };
    if (counts.bookedCount >= session.capacity) {
      toast({ variant: "destructive", title: "Session is full" });
      return;
    }
    setAddBookingLoadingId(session.scheduleId);
    const res = await adminApiFetch<BookingItem & { category?: string; branch?: string; startTime?: string; endTime?: string }>("/api/admin/bookings", {
      method: "POST",
      body: JSON.stringify({
        memberId: selectedMember.id,
        scheduleId: session.scheduleId,
        sessionDate: session.sessionDate,
      }),
    });
    setAddBookingLoadingId(null);
    if (res.ok) {
      toast({ title: "Booking created" });
      setAddMemberBookings((prev) => [...prev, { scheduleId: session.scheduleId, sessionDate: session.sessionDate }]);
      const newCounts = { ...counts, bookedCount: counts.bookedCount + 1 };
      setAddSessionCounts((prev) => ({ ...prev, [key]: newCounts }));
      fetchBookings();
    } else {
      toast({ variant: "destructive", title: "Booking failed", description: res.message });
    }
  };

  useEffect(() => {
    if (addBookingOpen && addStep === 2 && branches.length > 0 && !addBranch) {
      setAddBranch(branches[0]);
    }
  }, [addBookingOpen, addStep, branches, addBranch]);

  useEffect(() => {
    if (addBookingOpen && addStep === 2 && !addSelectedDate && addDates.length > 0) {
      setAddSelectedDate(addDates[0]);
    }
  }, [addBookingOpen, addStep, addDates, addSelectedDate]);

  const onSearch = () => {
    setSearchSessionDate(sessionDate.trim());
    setSearchMemberMobile(memberMobile.trim());
    setSearchClassTypeName(classTypeName.trim());
    setPage(1);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <Button onClick={openAddBooking}>Add booking</Button>
      </div>

      <Dialog open={addBookingOpen} onOpenChange={(open) => !open && closeAddBooking()}>
        <DialogContent className={cn("sm:max-w-lg", addStep === 2 && "sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col")}>
          <DialogHeader>
            <DialogTitle>{addStep === 1 ? "Add booking – Select member" : "Add booking – Select class"}</DialogTitle>
            <DialogDescription>
              {addStep === 1
                ? "Search by name or phone, then select a member to book for."
                : selectedMember && `Booking for ${selectedMember.name ?? "—"} (${selectedMember.mobile ?? ""})`}
            </DialogDescription>
          </DialogHeader>

          {addStep === 1 && (
            <div className="space-y-4 py-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by name or phone"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchMembers()}
                />
                <Button onClick={searchMembers} disabled={addLoadingMemberSearch}>
                  {addLoadingMemberSearch ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
              </div>
              {memberSearchResults.length > 0 && (
                <div className="border rounded-md divide-y max-h-60 overflow-auto">
                  {memberSearchResults.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMember(m)}
                      className={cn(
                        "w-full px-4 py-3 text-left hover:bg-muted/50",
                        selectedMember?.id === m.id && "bg-primary/10 border-l-2 border-primary"
                      )}
                    >
                      <span className="font-medium">{m.name ?? "—"}</span>
                      {m.mobile && <span className="text-muted-foreground text-sm ml-2">({m.mobile})</span>}
                    </button>
                  ))}
                </div>
              )}
              {memberSearch.trim() && !addLoadingMemberSearch && memberSearchResults.length === 0 && (
                <p className="text-sm text-muted-foreground">No members found.</p>
              )}
            </div>
          )}

          {addStep === 2 && (
            <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="flex gap-2 items-center">
                <Label className="shrink-0">Branch</Label>
                <div className="flex gap-1 flex-wrap">
                  {branches.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setAddBranch(b)}
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-md border",
                        addBranch === b ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                      )}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {addDates.map((d) => {
                  const isSelected = addSelectedDate && isSameDay(d, addSelectedDate);
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      onClick={() => setAddSelectedDate(d)}
                      className={cn(
                        "shrink-0 flex flex-col items-center min-w-[56px] py-2 rounded border text-sm",
                        isSelected ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted/50"
                      )}
                    >
                      <span className="font-medium">{format(d, "EEE")}</span>
                      <span className="text-lg font-bold">{format(d, "d")}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2 flex-wrap">
                {addFilterChips.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setAddFilter(chip)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium border",
                      addFilter === chip ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted/50"
                    )}
                  >
                    {chip}
                  </button>
                ))}
              </div>
              <div className="space-y-3">
                {addLoadingSchedule ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : addFilteredSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No classes for this branch and date.</p>
                ) : (
                  addFilteredSessions.map((session) => {
                    const key = `${session.scheduleId}_${session.sessionDate}`;
                    const counts = addSessionCounts[key] || { bookedCount: 0, waitlistCount: 0 };
                    const isFull = counts.bookedCount >= session.capacity;
                    const slotsLeft = Math.max(0, session.capacity - counts.bookedCount);
                    const alreadyBooked = addMemberBookings.some(
                      (b) => b.scheduleId === session.scheduleId && b.sessionDate === session.sessionDate
                    );
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-4 p-4 border rounded-lg bg-card"
                      >
                        <div>
                          <p className="font-semibold">{session.category}</p>
                          <p className="text-sm text-muted-foreground">
                            {session.startTime} – {session.endTime} · {session.branch}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {slotsLeft} slots left
                          </p>
                        </div>
                        <div>
                          {alreadyBooked ? (
                            <Button size="sm" disabled className="bg-green-50 text-green-700 border-green-200">Booked</Button>
                          ) : isFull ? (
                            <Button size="sm" disabled variant="secondary">Full</Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleAdminBook(session)}
                              disabled={addBookingLoadingId === session.scheduleId}
                            >
                              {addBookingLoadingId === session.scheduleId ? <Loader2 className="h-4 w-4 animate-spin" /> : "Book"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {addStep === 1 ? (
              <>
                <Button variant="outline" onClick={closeAddBooking}>Cancel</Button>
                <Button onClick={() => setAddStep(2)} disabled={!selectedMember}>
                  Next
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setAddStep(1)}>Back</Button>
                <Button variant="outline" onClick={closeAddBooking}>Done</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All bookings</TabsTrigger>
          <TabsTrigger value="upcoming">Next 5 days</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Date (YYYY-MM-DD)"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="max-w-[160px]"
            />
            <Input
              placeholder="Member mobile"
              value={memberMobile}
              onChange={(e) => setMemberMobile(e.target.value)}
              className="max-w-[160px]"
            />
            <Input
              placeholder="Class type name"
              value={classTypeName}
              onChange={(e) => setClassTypeName(e.target.value)}
              className="max-w-[180px]"
            />
            <Button onClick={onSearch}>Search</Button>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Member mobile</TableHead>
                  <TableHead>Class type</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell>
                  </TableRow>
                ) : data?.items.length ? (
                  data.items.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>{b.sessionDate}</TableCell>
                      <TableCell>{b.startTime && b.endTime ? `${b.startTime} – ${b.endTime}` : "—"}</TableCell>
                      <TableCell>{b.memberMobile ?? "—"}</TableCell>
                      <TableCell>{b.classTypeName ?? "—"}</TableCell>
                      <TableCell>{b.branch ?? "—"}</TableCell>
                      <TableCell>{b.status}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No bookings found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {data && (
            <AdminTablePagination
              page={page}
              limit={limit}
              total={data.total}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-4 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Label className="sr-only">Branch</Label>
            <Select value={upcomingBranch} onValueChange={setUpcomingBranch}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchUpcoming} disabled={upcomingLoading}>
              Refresh
            </Button>
          </div>

          {upcomingLoading ? (
            <p className="text-sm text-muted-foreground py-8">Loading…</p>
          ) : upcomingData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8">
              {upcomingBranch ? "No sessions for the next 5 days for this branch." : "Select a branch."}
            </p>
          ) : (
            <div className="space-y-6">
              {upcomingData.map((day) => (
                <Card key={day.date}>
                  <CardHeader className="pb-2 text-base font-medium">
                    {formatDate(day.date)}
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {day.sessions.length === 0 ? (
                        <p className="text-sm text-muted-foreground col-span-full">No sessions this day</p>
                      ) : (
                        day.sessions.map((s) => (
                          <Card key={`${s.scheduleId}-${s.sessionDate}`} className="bg-muted/50">
                            <CardContent className="pt-4">
                              <p className="font-medium">{s.startTime} – {s.endTime}</p>
                              <p className="text-sm text-muted-foreground">{s.category || "—"}</p>
                              <p className="text-sm mt-1">
                                <span className="font-medium">{s.bookingCount}</span> / {s.capacity} bookings
                              </p>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
