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

/** Hour 0–23 to label; 24 for "end of day" in time-to */
function hourLabel(h: number) {
  if (h === 0) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  if (h === 24) return "12:00 AM (midnight)";
  if (h < 12) return `${h}:00 AM`;
  return `${h - 12}:00 PM`;
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => ({ value: i, label: hourLabel(i) }));
const HOUR_OPTIONS_TO = [...HOUR_OPTIONS, { value: 24, label: hourLabel(24) }];

type ClassTypeOption = { id: string; name: string };
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

  const [addOpen, setAddOpen] = useState(false);
  const [classTypes, setClassTypes] = useState<ClassTypeOption[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [addClassTypeId, setAddClassTypeId] = useState("");
  const [addBranch, setAddBranch] = useState("");
  const [addDayOfWeek, setAddDayOfWeek] = useState(1);
  const [addStartHour, setAddStartHour] = useState(9);
  const [addEndHour, setAddEndHour] = useState(10);
  const [addCapacity, setAddCapacity] = useState(14);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

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

  useEffect(() => {
    adminApiFetch<ListResponse<ClassTypeOption>>("/api/admin/class-types?limit=100").then((r) => {
      if (r.ok) setClassTypes(r.data.items);
    });
  }, []);

  useEffect(() => {
    if (addOpen) {
      adminApiFetch<string[]>("/api/admin/branches").then((r) => {
        if (r.ok) {
          setBranches(r.data);
          setAddBranch((prev) => (prev === "" && r.data.length > 0 ? r.data[0] : prev));
        }
      });
    }
  }, [addOpen]);

  useEffect(() => {
    const nextEnd = addStartHour + 1;
    if (addEndHour <= addStartHour || addEndHour > 24) {
      setAddEndHour(nextEnd > 24 ? 24 : nextEnd);
    }
  }, [addStartHour]);

  const openAdd = () => {
    setAddClassTypeId("");
    setAddBranch(branches[0] ?? "");
    setAddDayOfWeek(1);
    setAddStartHour(9);
    setAddEndHour(10);
    setAddCapacity(14);
    setAddError(null);
    setAddOpen(true);
  };

  const closeAdd = () => {
    setAddOpen(false);
    setAddError(null);
  };

  const submitAdd = async () => {
    if (!addClassTypeId || !addBranch) {
      setAddError("Class type and branch are required");
      return;
    }
    if (addEndHour <= addStartHour) {
      setAddError("End time must be after start time");
      return;
    }
    if (addCapacity < 1 || addCapacity > 999) {
      setAddError("Capacity must be between 1 and 999");
      return;
    }
    setAddSubmitting(true);
    setAddError(null);
    const res = await adminApiFetch<ScheduleItem>("/api/admin/schedule-slots", {
      method: "POST",
      body: JSON.stringify({
        classTypeId: addClassTypeId,
        branch: addBranch,
        dayOfWeek: addDayOfWeek,
        startHour: addStartHour,
        startMinute: 0,
        endHour: addEndHour === 24 ? 24 : addEndHour,
        endMinute: 0,
        capacity: addCapacity,
      }),
    });
    setAddSubmitting(false);
    if (res.ok) {
      closeAdd();
      fetchSchedule();
    } else {
      setAddError(res.message);
    }
  };

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
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <Button onClick={openAdd}>Add schedule</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm min-w-[180px]"
          value={classTypeName}
          onChange={(e) => setClassTypeName(e.target.value)}
        >
          <option value="">Any class type</option>
          {classTypes.map((ct) => (
            <option key={ct.id} value={ct.name}>{ct.name}</option>
          ))}
        </select>
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

      <Dialog open={addOpen} onOpenChange={(open) => !open && closeAdd()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add schedule</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Class type</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={addClassTypeId}
                onChange={(e) => setAddClassTypeId(e.target.value)}
              >
                <option value="">Select class type</option>
                {classTypes.map((ct) => (
                  <option key={ct.id} value={ct.id}>{ct.name}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Branch</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={addBranch}
                onChange={(e) => setAddBranch(e.target.value)}
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Day</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={addDayOfWeek}
                onChange={(e) => setAddDayOfWeek(parseInt(e.target.value, 10))}
              >
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Time from</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={addStartHour}
                  onChange={(e) => {
                    const h = parseInt(e.target.value, 10);
                    setAddStartHour(h);
                    setAddEndHour(h + 1 > 24 ? 24 : h + 1);
                  }}
                >
                  {HOUR_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Time to</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={addEndHour}
                  onChange={(e) => setAddEndHour(parseInt(e.target.value, 10))}
                >
                  {HOUR_OPTIONS_TO.filter((o) => o.value > addStartHour).map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-capacity">Capacity</Label>
              <Input
                id="add-capacity"
                type="number"
                min={1}
                max={999}
                value={addCapacity}
                onChange={(e) => setAddCapacity(parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>
          {addError && <p className="text-sm text-destructive">{addError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={closeAdd} disabled={addSubmitting}>
              Cancel
            </Button>
            <Button onClick={submitAdd} disabled={addSubmitting}>
              {addSubmitting ? "Adding…" : "Add"}
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
