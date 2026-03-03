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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type PlanItem = {
  id: string;
  classTypeName: string;
  classTypeId?: string;
  name: string;
  sessionsTotal: number;
  validityDays: number;
  price: number;
  isActive: boolean;
};

type ClassTypeOption = { id: string; name: string };

export default function AdminPlans() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [classTypeName, setClassTypeName] = useState("");
  const [planName, setPlanName] = useState("");
  const [searchClassTypeName, setSearchClassTypeName] = useState("");
  const [searchPlanName, setSearchPlanName] = useState("");
  const [data, setData] = useState<ListResponse<PlanItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [classTypes, setClassTypes] = useState<ClassTypeOption[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addClassTypeId, setAddClassTypeId] = useState("");
  const [addName, setAddName] = useState("");
  const [addSessions, setAddSessions] = useState(10);
  const [addValidityDays, setAddValidityDays] = useState(30);
  const [addPrice, setAddPrice] = useState(0);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (searchClassTypeName) params.set("classTypeName", searchClassTypeName);
    if (searchPlanName) params.set("planName", searchPlanName);
    const res = await adminApiFetch<ListResponse<PlanItem>>(`/api/admin/plans?${params}`);
    if (res.ok) setData(res.data);
    else setError(res.message);
    setLoading(false);
  }, [page, limit, searchClassTypeName, searchPlanName]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  useEffect(() => {
    adminApiFetch<ListResponse<ClassTypeOption>>("/api/admin/class-types?limit=100").then((r) => {
      if (r.ok) setClassTypes(r.data.items);
    });
  }, []);

  const onSearch = () => {
    setSearchClassTypeName(classTypeName.trim());
    setSearchPlanName(planName.trim());
    setPage(1);
  };

  const openAdd = () => {
    setAddClassTypeId("");
    setAddName("");
    setAddSessions(10);
    setAddValidityDays(30);
    setAddPrice(0);
    setAddError(null);
    setAddOpen(true);
  };

  const submitAdd = async () => {
    setAddError(null);
    if (!addClassTypeId || !addName.trim()) {
      setAddError("Class type and plan name are required");
      return;
    }
    setAddSubmitting(true);
    const res = await adminApiFetch<PlanItem>("/api/admin/plans", {
      method: "POST",
      body: JSON.stringify({
        classTypeId: addClassTypeId,
        name: addName.trim(),
        sessionsTotal: addSessions,
        validityDays: addValidityDays,
        price: addPrice,
      }),
    });
    setAddSubmitting(false);
    if (res.ok) {
      setAddOpen(false);
      fetchPlans();
    } else {
      setAddError(res.message);
    }
  };

  const openEdit = (plan: PlanItem) => {
    setEditingPlan(plan);
    setEditIsActive(plan.isActive);
    setEditError(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingPlan(null);
    setEditError(null);
  };

  const submitEdit = async () => {
    if (!editingPlan) return;
    setEditSubmitting(true);
    const res = await adminApiFetch<PlanItem>(`/api/admin/plans/${editingPlan.id}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive: editIsActive }),
    });
    setEditSubmitting(false);
    if (res.ok) {
      closeEdit();
      fetchPlans();
    } else {
      setEditError(res.message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Plans</h1>

      <div className="flex justify-end">
        <Button variant="default" onClick={openAdd}>
          Add plan
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Class type name"
          value={classTypeName}
          onChange={(e) => setClassTypeName(e.target.value)}
          className="max-w-[180px]"
        />
        <Input
          placeholder="Plan name"
          value={planName}
          onChange={(e) => setPlanName(e.target.value)}
          className="max-w-[180px]"
        />
        <Button onClick={onSearch}>Search</Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add plan</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Class type</Label>
              <Select value={addClassTypeId} onValueChange={setAddClassTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class type" />
                </SelectTrigger>
                <SelectContent>
                  {classTypes.map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-plan-name">Plan name</Label>
              <Input id="add-plan-name" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Plan name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-sessions">Sessions</Label>
              <Input id="add-sessions" type="number" min={1} value={addSessions} onChange={(e) => setAddSessions(parseInt(e.target.value, 10) || 1)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-validity">Validity (days)</Label>
              <Input id="add-validity" type="number" min={1} value={addValidityDays} onChange={(e) => setAddValidityDays(parseInt(e.target.value, 10) || 1)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-price">Price</Label>
              <Input id="add-price" type="number" min={0} step={0.01} value={addPrice} onChange={(e) => setAddPrice(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          {addError && <p className="text-sm text-destructive">{addError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={addSubmitting}>Cancel</Button>
            <Button onClick={submitAdd} disabled={addSubmitting}>{addSubmitting ? "Adding…" : "Add plan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit plan</DialogTitle>
          </DialogHeader>
          {editingPlan && (
            <div className="grid gap-4 py-4">
              <p className="text-sm text-muted-foreground">{editingPlan.classTypeName} – {editingPlan.name}</p>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Inactive plans cannot be used for new enrollments.</p>
                </div>
                <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
              </div>
              {!editIsActive && (
                <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-3 text-sm text-amber-800 dark:text-amber-200">
                  No more future enrollment. Existing memberships are not affected.
                </div>
              )}
            </div>
          )}
          {editError && <p className="text-sm text-destructive">{editError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit} disabled={editSubmitting}>Cancel</Button>
            <Button onClick={submitEdit} disabled={editSubmitting}>{editSubmitting ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class type</TableHead>
              <TableHead>Plan name</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead>Validity (days)</TableHead>
              <TableHead>Price</TableHead>
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
              data.items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.classTypeName}</TableCell>
                  <TableCell>{p.name}</TableCell>
                  <TableCell>{p.sessionsTotal}</TableCell>
                  <TableCell>{p.validityDays}</TableCell>
                  <TableCell>{p.price}</TableCell>
                  <TableCell>{p.isActive ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openEdit(p)}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No plans found</TableCell>
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
