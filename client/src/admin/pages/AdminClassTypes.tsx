import { useState, useEffect, useCallback, useMemo } from "react";
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
import { Plus } from "lucide-react";
import { adminApiFetch, type ListResponse } from "../api";
import { AdminTablePagination } from "../components/AdminTablePagination";
import {
  ActiveFilterSelect,
  applyActiveFilterAndSort,
  inactiveRowClass,
  type ActiveFilter,
} from "../components/ActiveFilter";
import { useAdminPermissions } from "../useAdminPermissions";

type ClassTypeItem = {
  id: string;
  name: string;
  ageGroup: string;
  strengthLevel: number;
  infoBullets: string[];
  isActive: boolean;
};

const AGE_GROUP_OPTIONS = [
  { value: "Adult", label: "Adult" },
  { value: "Kid", label: "Kid" },
];

const STRENGTH_LEVELS = [1, 2, 3, 4, 5];

// Frontend-only filter+sort+paginate phase: fetch a generous page to enable
// global active-first sorting and Active/Inactive/All filtering without
// changing any backend route. Current dataset size is well below this ceiling.
const FETCH_LIMIT = 500;

function BulletListEditor({
  bullets,
  onChange,
  label = "Info bullets",
}: {
  bullets: string[];
  onChange: (next: string[]) => void;
  label?: string;
}) {
  const setAt = (index: number, value: string) => {
    const next = [...bullets];
    next[index] = value;
    onChange(next);
  };
  const removeAt = (index: number) => {
    onChange(bullets.filter((_, i) => i !== index));
  };
  const addRow = () => {
    onChange([...bullets, ""]);
  };
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          className="h-8"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {bullets.length === 0 ? (
          <p className="text-xs text-muted-foreground">No bullets yet. Click Add to create one.</p>
        ) : (
          bullets.map((value, index) => (
            <div key={index} className="flex gap-2 items-center">
              <Input
                placeholder={`Bullet ${index + 1}`}
                value={value}
                onChange={(e) => setAt(index, e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => removeAt(index)}
                aria-label="Remove bullet"
              >
                ×
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function AdminClassTypes() {
  const { ADD, EDIT } = useAdminPermissions("class-types");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [data, setData] = useState<ListResponse<ClassTypeItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addAgeGroup, setAddAgeGroup] = useState<"Adult" | "Kid">("Adult");
  const [addStrengthLevel, setAddStrengthLevel] = useState<number>(1);
  const [addInfoBullets, setAddInfoBullets] = useState<string[]>([""]);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<ClassTypeItem | null>(null);
  const [editStrengthLevel, setEditStrengthLevel] = useState<number>(1);
  const [editInfoBullets, setEditInfoBullets] = useState<string[]>([""]);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchClassTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminApiFetch<ListResponse<ClassTypeItem>>(
      `/api/admin/class-types?page=1&limit=${FETCH_LIMIT}`,
    );
    if (res.ok) setData(res.data);
    else setError(res.message);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClassTypes();
  }, [fetchClassTypes]);

  useEffect(() => {
    setPage(1);
  }, [activeFilter, limit]);

  const filteredSortedItems = useMemo(
    () => applyActiveFilterAndSort(data?.items ?? [], activeFilter),
    [data, activeFilter],
  );

  const pagedItems = useMemo(
    () => filteredSortedItems.slice((page - 1) * limit, page * limit),
    [filteredSortedItems, page, limit],
  );

  const openAdd = () => {
    setAddName("");
    setAddAgeGroup("Adult");
    setAddStrengthLevel(1);
    setAddInfoBullets([""]);
    setAddError(null);
    setAddOpen(true);
  };

  const submitAdd = async () => {
    setAddError(null);
    if (!addName.trim()) {
      setAddError("Name is required");
      return;
    }
    const bullets = addInfoBullets.map((s) => s.trim()).filter(Boolean);
    setAddSubmitting(true);
    const res = await adminApiFetch<ClassTypeItem>("/api/admin/class-types", {
      method: "POST",
      body: JSON.stringify({
        name: addName.trim(),
        ageGroup: addAgeGroup,
        strengthLevel: addStrengthLevel,
        infoBullets: bullets,
      }),
    });
    setAddSubmitting(false);
    if (res.ok) {
      setAddOpen(false);
      fetchClassTypes();
    } else {
      setAddError(res.message);
    }
  };

  const openEdit = (ct: ClassTypeItem) => {
    setEditing(ct);
    setEditStrengthLevel(ct.strengthLevel);
    const rowBullets = (ct as { infoBullets?: unknown }).infoBullets;
    setEditInfoBullets(
      Array.isArray(rowBullets) && rowBullets.length > 0
        ? (rowBullets as string[])
        : [""],
    );
    setEditIsActive(ct.isActive);
    setEditError(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
    setEditError(null);
  };

  const submitEdit = async () => {
    if (!editing) return;
    setEditError(null);
    if (!Number.isInteger(editStrengthLevel) || editStrengthLevel < 1) {
      setEditError("Strength level must be an integer ≥ 1");
      return;
    }
    const cleanBullets = editInfoBullets.map((s) => s.trim()).filter(Boolean);
    if (typeof editIsActive !== "boolean") {
      setEditError("Invalid active state");
      return;
    }
    setEditSubmitting(true);
    const res = await adminApiFetch<ClassTypeItem>(
      `/api/admin/class-types/${editing.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          strengthLevel: editStrengthLevel,
          infoBullets: cleanBullets,
          isActive: editIsActive,
        }),
      },
    );
    setEditSubmitting(false);
    if (res.ok) {
      closeEdit();
      fetchClassTypes();
    } else {
      setEditError(res.message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Class Types</h1>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <ActiveFilterSelect value={activeFilter} onChange={setActiveFilter} />
        {ADD && (
          <Button variant="default" onClick={openAdd}>
            Add class type
          </Button>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add class type</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add-ct-name">Name</Label>
              <Input
                id="add-ct-name"
                placeholder="Name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Age group</Label>
              <Select
                value={addAgeGroup}
                onValueChange={(v) => setAddAgeGroup(v as "Adult" | "Kid")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGE_GROUP_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Strength level (1–5)</Label>
              <Select
                value={String(addStrengthLevel)}
                onValueChange={(v) => setAddStrengthLevel(parseInt(v, 10))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRENGTH_LEVELS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <BulletListEditor
              bullets={addInfoBullets}
              onChange={setAddInfoBullets}
            />
          </div>
          {addError && (
            <p className="text-sm text-destructive">{addError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddOpen(false)}
              disabled={addSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={submitAdd} disabled={addSubmitting}>
              {addSubmitting ? "Adding…" : "Add class type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit class type</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-4 py-4">
              <p className="text-sm text-muted-foreground">
                {editing.name} — {editing.ageGroup}
              </p>
              <div className="grid gap-2">
                <Label>Strength level (1–5)</Label>
                <Select
                  value={String(editStrengthLevel)}
                  onValueChange={(v) => setEditStrengthLevel(parseInt(v, 10))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STRENGTH_LEVELS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <BulletListEditor
                bullets={editInfoBullets}
                onChange={setEditInfoBullets}
              />
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive class types are hidden from member-facing class lists. Existing records are not deleted.
                  </p>
                </div>
                <Switch
                  checked={editIsActive}
                  onCheckedChange={setEditIsActive}
                />
              </div>
              {!editIsActive && (
                <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 p-3 text-sm text-amber-800 dark:text-amber-200">
                  Inactive class types are hidden from member-facing class lists. Existing records are not deleted.
                </div>
              )}
            </div>
          )}
          {editError && <p className="text-sm text-destructive">{editError}</p>}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeEdit}
              disabled={editSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={submitEdit} disabled={editSubmitting}>
              {editSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Age group</TableHead>
              <TableHead>Strength level</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading…</TableCell>
              </TableRow>
            ) : pagedItems.length ? (
              pagedItems.map((ct) => (
                <TableRow key={ct.id} className={inactiveRowClass(ct.isActive)}>
                  <TableCell>{ct.name}</TableCell>
                  <TableCell>{ct.ageGroup}</TableCell>
                  <TableCell>{ct.strengthLevel}</TableCell>
                  <TableCell>{ct.isActive ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    {EDIT && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(ct)}
                        aria-label={`Edit ${ct.name}`}
                      >
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No class types</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data && (
        <AdminTablePagination
          page={page}
          limit={limit}
          total={filteredSortedItems.length}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}
    </div>
  );
}
