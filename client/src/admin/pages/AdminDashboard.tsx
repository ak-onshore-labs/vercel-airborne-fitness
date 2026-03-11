import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { getDashboard, type DashboardStats } from "../api";
import type { DashboardMembershipRow } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { Loader2, Eye } from "lucide-react";

function SessionTable({
  rows,
  emptyMessage,
}: {
  rows: DashboardStats["classesFullToday"];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Class</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Time</TableHead>
          <TableHead className="text-right">Booked / Capacity</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={`${r.scheduleId}-${r.sessionDate}-${r.startTime}`}>
            <TableCell className="font-medium">{r.category}</TableCell>
            <TableCell>{r.branch}</TableCell>
            <TableCell>{r.startTime}</TableCell>
            <TableCell className="text-right">
              {r.bookingCount} / {r.capacity}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function MembershipDetailSheet({
  open,
  onOpenChange,
  title,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  items: DashboardMembershipRow[];
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex flex-col w-full sm:max-w-md overflow-hidden border-l-2 border-l-primary/30"
      >
        <SheetHeader>
          <SheetTitle className="text-primary/95">{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-auto -mx-6 px-6 mt-4">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No memberships in this window.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-primary/10">
                  <TableHead className="text-primary/80 font-medium">Member</TableHead>
                  <TableHead className="text-primary/80 font-medium">Plan / Class</TableHead>
                  <TableHead className="text-primary/80 font-medium">Expiry</TableHead>
                  <TableHead className="text-right text-primary/80 font-medium">Sessions</TableHead>
                  <TableHead className="text-primary/80 font-medium">Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.memberName || "—"}</TableCell>
                    <TableCell>
                      <span className="block">{row.planName}</span>
                      {row.classTypeName && (
                        <span className="text-xs text-muted-foreground">{row.classTypeName}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {format(parseISO(row.expiryDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">{row.sessionsRemaining}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.memberMobile ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LifecycleCard({
  label,
  count,
  onView,
}: {
  label: string;
  count: number;
  onView: () => void;
}) {
  return (
    <Card className="flex flex-col border-l-2 border-l-primary/30 bg-card hover:border-l-primary/50 transition-colors">
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0 flex flex-row items-end justify-between gap-2">
        <span className="text-xl font-semibold tabular-nums text-foreground">{count}</span>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 h-8 gap-1 text-xs text-primary hover:text-primary hover:bg-primary/10"
          onClick={onView}
        >
          <Eye className="h-3.5 w-3.5" />
          View
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetState, setSheetState] = useState<{
    title: string;
    items: DashboardMembershipRow[];
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getDashboard()
      .then((data) => {
        if (!cancelled) {
          setStats(data ?? null);
          if (data === null) setError("Failed to load dashboard");
        }
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load dashboard");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary/70" aria-hidden />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6">
        <p className="text-destructive">{error ?? "Failed to load dashboard"}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-xl sm:text-2xl font-semibold border-b border-primary/20 pb-2">
        Dashboard
      </h1>

      {/* Top KPIs — tight row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-muted/40 border-t-2 border-t-primary/40 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Active members
            </p>
            <p className="text-2xl font-semibold mt-1 tabular-nums text-foreground">
              {stats.activeMembersCount}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-muted/40 border-t-2 border-t-primary/40 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Today&apos;s bookings
            </p>
            <p className="text-2xl font-semibold mt-1 tabular-nums text-foreground">
              {stats.todayBookingsCount}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-muted/40 border-t-2 border-t-primary/40 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Today&apos;s occupancy
            </p>
            <p className="text-2xl font-semibold mt-1 tabular-nums text-foreground">
              {stats.todayOccupancyRatePercent}%
            </p>
          </CardContent>
        </Card>
        <Card className="bg-muted/40 border-t-2 border-t-primary/40 shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Waitlist (today + upcoming)
            </p>
            <p className="text-2xl font-semibold mt-1 tabular-nums text-foreground">
              {stats.waitlistCountTodayAndUpcoming}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Membership lifecycle — actionable */}
      <section>
        <h2 className="text-sm font-semibold text-primary/90 uppercase tracking-wide mb-3">
          Membership lifecycle
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <LifecycleCard
            label="Expiring in next 7 days"
            count={stats.membershipsExpiringIn7Days}
            onView={() =>
              setSheetState({
                title: "Memberships expiring in next 7 days",
                items: stats.membershipsExpiringNext7Days,
              })
            }
          />
          <LifecycleCard
            label="Expiring in next 30 days"
            count={stats.membershipsExpiringIn30Days}
            onView={() =>
              setSheetState({
                title: "Memberships expiring in next 30 days",
                items: stats.membershipsExpiringNext30Days,
              })
            }
          />
          <LifecycleCard
            label="Expired in last 7 days"
            count={stats.membershipsExpiredInLast7Days}
            onView={() =>
              setSheetState({
                title: "Memberships expired in last 7 days",
                items: stats.membershipsExpiredLast7Days,
              })
            }
          />
          <LifecycleCard
            label="Expired in last 30 days"
            count={stats.membershipsExpiredInLast30Days}
            onView={() =>
              setSheetState({
                title: "Memberships expired in last 30 days",
                items: stats.membershipsExpiredLast30Days,
              })
            }
          />
        </div>
      </section>

      {/* Capacity insights */}
      <section>
        <h2 className="text-sm font-semibold text-primary/90 uppercase tracking-wide mb-3">
          Capacity (today)
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border border-border">
            <CardHeader className="pb-2 border-b border-primary/10">
              <CardTitle className="text-sm font-medium">Classes full today</CardTitle>
            </CardHeader>
            <CardContent>
              <SessionTable
                rows={stats.classesFullToday}
                emptyMessage="No classes at capacity today."
              />
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardHeader className="pb-2 border-b border-primary/10">
              <CardTitle className="text-sm font-medium">Classes almost full today (≥80%)</CardTitle>
            </CardHeader>
            <CardContent>
              <SessionTable
                rows={stats.classesAlmostFullToday}
                emptyMessage="None in this range today."
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Business insights */}
      <section>
        <h2 className="text-sm font-semibold text-primary/90 uppercase tracking-wide mb-3">
          Business
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border border-border">
            <CardHeader className="pb-2 border-b border-primary/10">
              <CardTitle className="text-sm font-medium">Most booked (last 30 days, top 5)</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.mostBookedClassTypesLast30Days.length === 0 ? (
                <p className="text-sm text-muted-foreground">No bookings in the last 30 days.</p>
              ) : (
                <ul className="space-y-2">
                  {stats.mostBookedClassTypesLast30Days.map((r) => (
                    <li key={r.classTypeName} className="flex justify-between text-sm">
                      <span>{r.classTypeName}</span>
                      <span className="font-medium tabular-nums">{r.bookingCount}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardHeader className="pb-2 border-b border-primary/10">
              <CardTitle className="text-sm font-medium">Recent enrollments</CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentEnrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent enrollments.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.recentEnrollments.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.memberName || "—"}</TableCell>
                        <TableCell>{e.planName}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(parseISO(e.createdAt), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Branch insights */}
      <section>
        <h2 className="text-sm font-semibold text-primary/90 uppercase tracking-wide mb-3">
          By branch (today)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.branchWiseBookingsAndOccupancy.map((b) => (
            <Card key={b.branch} className="border border-border">
              <CardContent className="p-4">
                <p className="font-medium">{b.branch}</p>
                <p className="text-lg font-semibold tabular-nums mt-1">{b.bookingCount} bookings</p>
                <p className="text-sm text-muted-foreground">{b.occupancyRatePercent}% occupancy</p>
              </CardContent>
            </Card>
          ))}
          {stats.branchWiseBookingsAndOccupancy.length === 0 && (
            <p className="text-sm text-muted-foreground col-span-full">No branch data for today.</p>
          )}
        </div>
      </section>

      {sheetState && (
        <MembershipDetailSheet
          open={!!sheetState}
          onOpenChange={(open) => !open && setSheetState(null)}
          title={sheetState.title}
          items={sheetState.items}
        />
      )}
    </div>
  );
}
