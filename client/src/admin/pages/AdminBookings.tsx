import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const onSearch = () => {
    setSearchSessionDate(sessionDate.trim());
    setSearchMemberMobile(memberMobile.trim());
    setSearchClassTypeName(classTypeName.trim());
    setPage(1);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Bookings</h1>

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
