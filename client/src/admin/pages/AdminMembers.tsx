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
      <h1 className="text-2xl font-semibold">Members</h1>

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
