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

type MemberOption = { id: string; name?: string | null; mobile?: string };
type PlanOption = { id: string; name: string; classTypeName: string; sessionsTotal: number; validityDays: number };

type MembershipItem = {
  id: string;
  memberId: string;
  membershipPlanId: string;
  sessionsRemaining: number;
  expiryDate: string;
  carryForward: number;
  extensionRequestedAt?: string | null;
  extensionApprovedAt?: string | null;
  extensionApplied: boolean;
  memberName?: string;
  planName?: string;
  classTypeName?: string;
};

export default function AdminMemberships() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [memberIdFilter, setMemberIdFilter] = useState("");
  const [planIdFilter, setPlanIdFilter] = useState("");
  const [memberMobileFilter, setMemberMobileFilter] = useState("");
  const [searchMemberId, setSearchMemberId] = useState("");
  const [searchPlanId, setSearchPlanId] = useState("");
  const [searchMemberMobile, setSearchMemberMobile] = useState("");
  const [data, setData] = useState<ListResponse<MembershipItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [addMemberId, setAddMemberId] = useState("");
  const [addPlanId, setAddPlanId] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchMemberships = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (searchMemberId) params.set("memberId", searchMemberId);
    if (searchPlanId) params.set("membershipPlanId", searchPlanId);
    if (searchMemberMobile) params.set("memberMobile", searchMemberMobile);
    const res = await adminApiFetch<ListResponse<MembershipItem>>(`/api/admin/memberships?${params}`);
    if (res.ok) setData(res.data);
    else setError(res.message);
    setLoading(false);
  }, [page, limit, searchMemberId, searchPlanId, searchMemberMobile]);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  useEffect(() => {
    if (addOpen) {
      adminApiFetch<ListResponse<MemberOption>>("/api/admin/members?limit=500").then((r) => {
        if (r.ok) setMembers(r.data.items);
      });
      adminApiFetch<ListResponse<PlanOption>>("/api/admin/plans?limit=100").then((r) => {
        if (r.ok) setPlans(r.data.items);
      });
    }
  }, [addOpen]);

  const openAdd = () => {
    setAddMemberId("");
    setAddPlanId("");
    setAddError(null);
    setAddOpen(true);
  };

  const closeAdd = () => {
    setAddOpen(false);
    setAddError(null);
  };

  const submitAdd = async () => {
    if (!addMemberId || !addPlanId) {
      setAddError("Member and plan are required");
      return;
    }
    setAddSubmitting(true);
    setAddError(null);
    const res = await adminApiFetch<MembershipItem>("/api/admin/memberships", {
      method: "POST",
      body: JSON.stringify({ memberId: addMemberId, membershipPlanId: addPlanId }),
    });
    setAddSubmitting(false);
    if (res.ok) {
      closeAdd();
      fetchMemberships();
    } else {
      setAddError(res.message);
    }
  };

  const onSearch = () => {
    setSearchMemberId(memberIdFilter.trim());
    setSearchPlanId(planIdFilter.trim());
    setSearchMemberMobile(memberMobileFilter.trim());
    setPage(1);
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return d;
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Memberships</h1>
        <Button onClick={openAdd}>Create membership</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Member ID"
          value={memberIdFilter}
          onChange={(e) => setMemberIdFilter(e.target.value)}
          className="max-w-[200px]"
        />
        <Input
          placeholder="Member mobile"
          value={memberMobileFilter}
          onChange={(e) => setMemberMobileFilter(e.target.value)}
          className="max-w-[180px]"
        />
        <Input
          placeholder="Plan ID"
          value={planIdFilter}
          onChange={(e) => setPlanIdFilter(e.target.value)}
          className="max-w-[200px]"
        />
        <Button onClick={onSearch}>Search</Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Dialog open={addOpen} onOpenChange={(open) => !open && closeAdd()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create membership</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Member</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={addMemberId}
                onChange={(e) => setAddMemberId(e.target.value)}
              >
                <option value="">Select member</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name ?? "—"} {m.mobile ? `(${m.mobile})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label>Plan</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={addPlanId}
                onChange={(e) => setAddPlanId(e.target.value)}
              >
                <option value="">Select plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.classTypeName} – {p.name} ({p.sessionsTotal} sessions, {p.validityDays} days)
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              Sessions and expiry will use the plan defaults. The membership will be active from now.
            </p>
          </div>
          {addError && <p className="text-sm text-destructive">{addError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={closeAdd} disabled={addSubmitting}>
              Cancel
            </Button>
            <Button onClick={submitAdd} disabled={addSubmitting}>
              {addSubmitting ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Class type</TableHead>
              <TableHead className="text-right">Sessions left</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Extension</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : data?.items.length ? (
              data.items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <span className="font-medium">{m.memberName ?? "—"}</span>
                    {m.memberId && (
                      <span className="block text-xs text-muted-foreground truncate max-w-[140px]" title={m.memberId}>
                        {m.memberId}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{m.planName ?? "—"}</TableCell>
                  <TableCell>{m.classTypeName ?? "—"}</TableCell>
                  <TableCell className="text-right">{m.sessionsRemaining}</TableCell>
                  <TableCell>{formatDate(m.expiryDate)}</TableCell>
                  <TableCell>
                    {m.extensionApplied
                      ? "Applied"
                      : m.extensionRequestedAt
                        ? "Requested"
                        : "—"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No memberships found
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
