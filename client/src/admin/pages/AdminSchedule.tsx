import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminApiFetch, type ListResponse } from "../api";
import { AdminTablePagination } from "../components/AdminTablePagination";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type ScheduleItem = {
  id: string;
  category: string;
  branch: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  capacity: number;
  isActive: boolean;
};

export default function AdminSchedule() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [classTypeName, setClassTypeName] = useState("");
  const [branch, setBranch] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState<string>("");
  const [startTime, setStartTime] = useState("");
  const [searchClassTypeName, setSearchClassTypeName] = useState("");
  const [searchBranch, setSearchBranch] = useState("");
  const [searchDayOfWeek, setSearchDayOfWeek] = useState<number | "">("");
  const [searchStartTime, setSearchStartTime] = useState("");
  const [data, setData] = useState<ListResponse<ScheduleItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleItem | null>(null);
  const [editCapacity, setEditCapacity] = useState(10);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (searchClassTypeName) params.set("classTypeName", searchClassTypeName);
    if (searchBranch) params.set("branch", searchBranch);
    if (searchDayOfWeek !== "") params.set("dayOfWeek", String(searchDayOfWeek));
    if (searchStartTime) params.set("startTime", searchStartTime);
    const res = await adminApiFetch<ListResponse<ScheduleItem>>(`/api/admin/schedule?${params}`);
    if (res.ok) setData(res.data);
    else setError(res.message);
    setLoading(false);
  }, [page, limit, searchClassTypeName, searchBranch, searchDayOfWeek, searchStartTime]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const onSearch = () => {
    setSearchClassTypeName(classTypeName.trim());
    setSearchBranch(branch.trim());
    setSearchDayOfWeek(dayOfWeek === "" ? "" : parseInt(dayOfWeek, 10));
    setSearchStartTime(startTime.trim());
    setPage(1);
  };

  const openEdit = (slot: ScheduleItem) => {
    setEditingSlot(slot);
    setEditCapacity(slot.capacity);
    setEditIsActive(slot.isActive);
    setEditError(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingSlot(null);
    setEditError(null);
  };

  const submitEdit = async () => {
    if (!editingSlot) return;
    setEditError(null);
    if (editCapacity < 1 || editCapacity > 999) {
      setEditError("Capacity must be between 1 and 999");
      return;
    }
    setEditSubmitting(true);
    const res = await adminApiFetch<ScheduleItem>(`/api/admin/schedule-slots/${editingSlot.id}`, {
      method: "PATCH",
      body: JSON.stringify({ capacity: editCapacity, isActive: editIsActive }),
    });
    setEditSubmitting(false);
    if (res.ok) {
      closeEdit();
      fetchSchedule();
    } else {
      setEditError(res.message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Schedule</h1>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Class type name"
          value={classTypeName}
          onChange={(e) => setClassTypeName(e.target.value)}
          className="max-w-[180px]"
        />
        <Input
          placeholder="Branch"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
          className="max-w-[140px]"
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(e.target.value)}
        >
          <option value="">Any day</option>
          {DAYS.map((d, i) => (
            <option key={d} value={i}>{d}</option>
          ))}
        </select>
        <Input
          placeholder="Time (HH:MM)"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="max-w-[120px]"
        />
        <Button onClick={onSearch}>Search</Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Dialog open={editOpen} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit schedule</DialogTitle>
          </DialogHeader>
          {editingSlot && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Class type</Label>
                <Input value={editingSlot.category} disabled className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label>Branch</Label>
                <Input value={editingSlot.branch} disabled className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label>Day</Label>
                <Input value={DAYS[editingSlot.dayOfWeek] ?? editingSlot.dayOfWeek} disabled className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label>Time</Label>
                <Input value={`${editingSlot.startTime} – ${editingSlot.endTime}`} disabled className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-capacity">Capacity</Label>
                <Input
                  id="edit-capacity"
                  type="number"
                  min={1}
                  max={999}
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(parseInt(e.target.value, 10) || 1)}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Inactive slots cannot receive new bookings.</p>
                </div>
                <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
              </div>
              {!editIsActive && (
                <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-3 text-sm text-amber-800 dark:text-amber-200">
                  Future bookings for this slot will be disabled. Existing bookings are not affected.
                </div>
              )}
            </div>
          )}
          {editError && <p className="text-sm text-destructive">{editError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit} disabled={editSubmitting}>
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={editSubmitting}>
              {editSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class type</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Day</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">Loading…</TableCell>
              </TableRow>
            ) : data?.items.length ? (
              data.items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.category}</TableCell>
                  <TableCell>{s.branch}</TableCell>
                  <TableCell>{DAYS[s.dayOfWeek] ?? s.dayOfWeek}</TableCell>
                  <TableCell>{s.startTime} – {s.endTime}</TableCell>
                  <TableCell>{s.capacity}</TableCell>
                  <TableCell>{s.isActive ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openEdit(s)}>
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No slots found</TableCell>
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
    </div>
  );
}
