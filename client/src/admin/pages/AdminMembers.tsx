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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminApiFetch, type ListResponse } from "../api";
import { AdminTablePagination } from "../components/AdminTablePagination";

type MemberItem = {
  id: string;
  userId: string;
  memberType: string;
  name?: string | null;
  email?: string | null;
  mobile?: string;
};

export default function AdminMembers() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [data, setData] = useState<ListResponse<MemberItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberItem | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addMobile, setAddMobile] = useState("");
  const [addGender, setAddGender] = useState<"Male" | "Female">("Male");
  const [addUserRole, setAddUserRole] = useState<"MEMBER" | "STAFF" | "ADMIN">("MEMBER");
  const [addMemberType, setAddMemberType] = useState<"Adult" | "Kid">("Adult");
  const [addMemberName, setAddMemberName] = useState("");
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addMemberDob, setAddMemberDob] = useState("");
  const [addMemberGender, setAddMemberGender] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (searchPhone) params.set("phone", searchPhone);
    if (searchName) params.set("name", searchName);
    if (searchEmail) params.set("email", searchEmail);
    const res = await adminApiFetch<ListResponse<MemberItem>>(`/api/admin/members?${params}`);
    if (res.ok) setData(res.data);
    else setError(res.message);
    setLoading(false);
  }, [page, limit, searchPhone, searchName, searchEmail]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const openAdd = () => {
    setAddName("");
    setAddMobile("");
    setAddGender("Male");
    setAddUserRole("MEMBER");
    setAddMemberType("Adult");
    setAddMemberName("");
    setAddMemberEmail("");
    setAddMemberDob("");
    setAddMemberGender("");
    setAddError(null);
    setAddOpen(true);
  };

  const closeAdd = () => {
    setAddOpen(false);
    setAddError(null);
  };

  const submitAdd = async () => {
    const name = addName.trim();
    const mobile = addMobile.replace(/\D/g, "");
    if (!name) {
      setAddError("Name is required");
      return;
    }
    if (addGender !== "Male" && addGender !== "Female") {
      setAddError("Gender must be Male or Female");
      return;
    }
    if (mobile.length < 10) {
      setAddError("Valid phone number required (at least 10 digits)");
      return;
    }
    setAddSubmitting(true);
    setAddError(null);
    const res = await adminApiFetch<MemberItem>("/api/admin/members", {
      method: "POST",
      body: JSON.stringify({
        name,
        mobile,
        gender: addGender,
        userRole: addUserRole,
        memberType: addMemberType,
        memberName: addMemberName.trim() || undefined,
        memberEmail: addMemberEmail.trim() || undefined,
        memberDob: addMemberDob.trim() || undefined,
        memberGender: addMemberGender.trim() || undefined,
      }),
    });
    setAddSubmitting(false);
    if (res.ok) {
      closeAdd();
      fetchMembers();
    } else {
      setAddError(res.message);
    }
  };

  const onSearch = () => {
    setSearchPhone(phone.trim());
    setSearchName(name.trim());
    setSearchEmail(email.trim());
    setPage(1);
  };

  const openEdit = (member: MemberItem) => {
    setEditingMember(member);
    setEditEmail(member.email ?? "");
    setEditError(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditingMember(null);
    setEditError(null);
  };

  const submitEdit = async () => {
    if (!editingMember) return;
    setEditSubmitting(true);
    const res = await adminApiFetch<MemberItem>(`/api/admin/members/${editingMember.id}`, {
      method: "PATCH",
      body: JSON.stringify({ email: editEmail.trim() || undefined }),
    });
    setEditSubmitting(false);
    if (res.ok) {
      closeEdit();
      fetchMembers();
    } else {
      setEditError(res.message);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Members</h1>
        <Button onClick={openAdd}>Create member</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Phone number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="max-w-[160px]"
        />
        <Input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="max-w-[160px]"
        />
        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="max-w-[200px]"
        />
        <Button onClick={onSearch}>Search</Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Dialog open={addOpen} onOpenChange={(open) => !open && closeAdd()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create member</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">This will create a new user (login identity) and a member profile.</p>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="add-name">Name</Label>
              <Input
                id="add-name"
                placeholder="Full name"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-mobile">Mobile (phone number)</Label>
              <Input
                id="add-mobile"
                type="tel"
                placeholder="10+ digits"
                value={addMobile}
                onChange={(e) => setAddMobile(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Gender</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={addGender}
                onChange={(e) => setAddGender(e.target.value as "Male" | "Female")}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>User role</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={addUserRole}
                onChange={(e) => setAddUserRole(e.target.value as "MEMBER" | "STAFF" | "ADMIN")}
              >
                <option value="MEMBER">Member</option>
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Member type</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={addMemberType}
                onChange={(e) => setAddMemberType(e.target.value as "Adult" | "Kid")}
              >
                <option value="Adult">Adult</option>
                <option value="Kid">Kid</option>
              </select>
            </div>
            {addMemberType === "Kid" && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="add-member-name">Kid&apos;s name</Label>
                  <Input
                    id="add-member-name"
                    placeholder="Child's name"
                    value={addMemberName}
                    onChange={(e) => setAddMemberName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="add-member-dob">Kid&apos;s date of birth</Label>
                  <Input
                    id="add-member-dob"
                    type="date"
                    value={addMemberDob}
                    onChange={(e) => setAddMemberDob(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="add-member-gender">Kid&apos;s gender</Label>
                  <Input
                    id="add-member-gender"
                    placeholder="Optional"
                    value={addMemberGender}
                    onChange={(e) => setAddMemberGender(e.target.value)}
                  />
                </div>
              </>
            )}
            <div className="grid gap-2">
              <Label htmlFor="add-member-email">Email (optional)</Label>
              <Input
                id="add-member-email"
                type="email"
                placeholder="Member email"
                value={addMemberEmail}
                onChange={(e) => setAddMemberEmail(e.target.value)}
              />
            </div>
          </div>
          {addError && <p className="text-sm text-destructive">{addError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={closeAdd} disabled={addSubmitting}>Cancel</Button>
            <Button onClick={submitAdd} disabled={addSubmitting}>{addSubmitting ? "Creating…" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
          </DialogHeader>
          {editingMember && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Name</Label>
                <Input value={editingMember.name ?? "—"} disabled className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input value={editingMember.mobile ?? "—"} disabled className="bg-muted" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-member-email">Email</Label>
                <Input
                  id="edit-member-email"
                  type="email"
                  placeholder="Email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <Input value={editingMember.memberType} disabled className="bg-muted" />
              </div>
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
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading…</TableCell>
              </TableRow>
            ) : data?.items.length ? (
              data.items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.name ?? "—"}</TableCell>
                  <TableCell>{m.mobile ?? "—"}</TableCell>
                  <TableCell>{m.email ?? "—"}</TableCell>
                  <TableCell>{m.memberType}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openEdit(m)}>Edit</Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No members found</TableCell>
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
