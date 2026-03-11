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
import { useAdminPermissions } from "../useAdminPermissions";

type ClassTypeItem = {
  id: string;
  name: string;
  ageGroup: string;
  strengthLevel: number;
  isActive: boolean;
};

const AGE_GROUP_OPTIONS = [
  { value: "Adult", label: "Adult" },
  { value: "Kid", label: "Kid" },
];

const STRENGTH_LEVELS = [1, 2, 3, 4, 5];

export default function AdminClassTypes() {
  const { ADD } = useAdminPermissions("class-types");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
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

  const fetchClassTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminApiFetch<ListResponse<ClassTypeItem>>(
      `/api/admin/class-types?page=${page}&limit=${limit}`
    );
    if (res.ok) setData(res.data);
    else setError(res.message);
    setLoading(false);
  }, [page, limit]);

  useEffect(() => {
    fetchClassTypes();
  }, [fetchClassTypes]);

  const openAdd = () => {
    setAddName("");
    setAddAgeGroup("Adult");
    setAddStrengthLevel(1);
    setAddInfoBullets([""]);
    setAddError(null);
    setAddOpen(true);
  };

  const addInfoBulletRow = () => {
    setAddInfoBullets((prev) => [...prev, ""]);
  };

  const setInfoBulletAt = (index: number, value: string) => {
    setAddInfoBullets((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const removeInfoBulletAt = (index: number) => {
    setAddInfoBullets((prev) => prev.filter((_, i) => i !== index));
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

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Class Types</h1>

      <div className="flex justify-end">
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
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label>Info bullets</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addInfoBulletRow}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {addInfoBullets.map((value, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      placeholder={`Bullet ${index + 1}`}
                      value={value}
                      onChange={(e) => setInfoBulletAt(index, e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() => removeInfoBulletAt(index)}
                      aria-label="Remove bullet"
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            </div>
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

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Age group</TableHead>
              <TableHead>Strength level</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Loading…</TableCell>
              </TableRow>
            ) : data?.items.length ? (
              data.items.map((ct) => (
                <TableRow key={ct.id}>
                  <TableCell>{ct.name}</TableCell>
                  <TableCell>{ct.ageGroup}</TableCell>
                  <TableCell>{ct.strengthLevel}</TableCell>
                  <TableCell>{ct.isActive ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No class types</TableCell>
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
