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
import { adminApiFetch, type ListResponse } from "../api";
import { AdminTablePagination } from "../components/AdminTablePagination";
import { useAdminPermissions } from "../useAdminPermissions";
import type { User, UserRole } from "@shared/schema";

const USER_ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "MEMBER", label: "Member" },
  { value: "STAFF", label: "Staff" },
  { value: "ADMIN", label: "Admin" },
];

export type GenderOption = "Male" | "Female";

const GENDER_OPTIONS: { value: GenderOption; label: string }[] = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
];

/** Normalize stored gender for display/select; invalid or legacy values become blank. */
function normalizeGenderForSelect(gender: string | undefined | null): GenderOption | "" {
  if (gender === "Male" || gender === "Female") return gender;
  return "";
}

/** Display text for gender; show — for invalid/legacy. */
function displayGender(gender: string | undefined | null): string {
  if (gender === "Male" || gender === "Female") return gender;
  return "—";
}

type ModalMode = "add" | "edit";

export default function AdminUsers() {
  const { ADD, EDIT } = useAdminPermissions("users");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [nameInput, setNameInput] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [data, setData] = useState<ListResponse<User> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add");
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formGender, setFormGender] = useState<GenderOption | "">("");
  const [formUserRole, setFormUserRole] = useState<UserRole>("MEMBER");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await adminApiFetch<ListResponse<User>>(
      `/api/admin/users?page=${page}&limit=${limit}${nameSearch ? `&name=${encodeURIComponent(nameSearch)}` : ""}`
    );
    if (res.ok) setData(res.data);
    else setError(res.message);
    setLoading(false);
  }, [page, limit, nameSearch]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onSearch = () => {
    setNameSearch(nameInput.trim());
    setPage(1);
  };

  const openAdd = () => {
    setEditingUser(null);
    setModalMode("add");
    setFormName("");
    setFormPhone("");
    setFormGender("");
    setFormUserRole("MEMBER");
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setModalMode("edit");
    setFormName(user.name ?? "");
    setFormPhone(user.mobile ?? "");
    setFormGender(normalizeGenderForSelect(user.gender));
    setFormUserRole((user.userRole as UserRole) ?? "MEMBER");
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setFormError(null);
  };

  const validateForm = (): string | null => {
    if (!formName.trim()) return "Name is required";
    if (modalMode === "add") {
      const mobile = formPhone.replace(/\D/g, "");
      if (mobile.length < 10) return "Enter a valid phone number (at least 10 digits)";
    }
    if (formGender !== "Male" && formGender !== "Female") return "Please select Gender (Male or Female)";
    return null;
  };

  const submitForm = async () => {
    setFormError(null);
    const validation = validateForm();
    if (validation) {
      setFormError(validation);
      return;
    }

    if (modalMode === "add") {
      const mobile = formPhone.replace(/\D/g, "");
      setFormSubmitting(true);
      const res = await adminApiFetch<User>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          name: formName.trim(),
          mobile,
          gender: formGender,
          userRole: formUserRole,
        }),
      });
      setFormSubmitting(false);
      if (res.ok) {
        closeModal();
        fetchUsers();
      } else {
        setFormError(res.message);
      }
      return;
    }

    if (!editingUser) return;
    setFormSubmitting(true);
    const res = await adminApiFetch<User>(`/api/admin/users/${editingUser.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: formName.trim(),
        gender: formGender,
        userRole: formUserRole,
      }),
    });
    setFormSubmitting(false);
    if (res.ok) {
      closeModal();
      fetchUsers();
    } else {
      setFormError(res.message);
    }
  };

  const isEdit = modalMode === "edit";

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Users</h1>

      <div className="flex justify-end">
        {ADD && (
          <Button variant="default" onClick={openAdd}>
            Add user
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Name"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
          className="max-w-xs"
        />
        <Button onClick={onSearch}>Search</Button>
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit user" : "Add user"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="user-form-name">Name</Label>
              <Input
                id="user-form-name"
                placeholder="Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user-form-phone">Phone number</Label>
              <Input
                id="user-form-phone"
                type="tel"
                placeholder="Phone number"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                disabled={isEdit}
                className={isEdit ? "bg-muted" : ""}
              />
              {isEdit && (
                <p className="text-xs text-muted-foreground">Phone number cannot be changed.</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Gender</Label>
              <Select
                value={formGender === "" ? "__none__" : formGender}
                onValueChange={(v) => setFormGender(v === "__none__" ? "" : (v as GenderOption))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select gender</SelectItem>
                  {GENDER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>User type</Label>
              <Select
                value={formUserRole}
                onValueChange={(v) => setFormUserRole(v as UserRole)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {formError && (
            <p className="text-sm text-destructive">{formError}</p>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeModal}
              disabled={formSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={submitForm} disabled={formSubmitting}>
              {formSubmitting ? (isEdit ? "Saving…" : "Adding…") : (isEdit ? "Save" : "Add user")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : data?.items.length ? (
              data.items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.name || "—"}</TableCell>
                  <TableCell>{u.mobile}</TableCell>
                  <TableCell>{displayGender(u.gender)}</TableCell>
                  <TableCell>{u.userRole ?? "—"}</TableCell>
                  <TableCell>
                    {EDIT && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(u)}
                      >
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No users found
                </TableCell>
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
