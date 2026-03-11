import { useMemo, useState, useEffect, useCallback } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApiFetch, type ListResponse } from "../api";
import { AdminTablePagination } from "../components/AdminTablePagination";
import { useAdminPermissions } from "../useAdminPermissions";

type MemberOption = { id: string; name?: string | null; mobile?: string };
type PlanOption = { id: string; name: string; classTypeName: string; sessionsTotal: number; validityDays: number; price: number };

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
  const { ADD } = useAdminPermissions("memberships");
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
  const [addStep, setAddStep] = useState<1 | 2 | 3>(1);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [planSearch, setPlanSearch] = useState("");
  const [addMemberId, setAddMemberId] = useState("");
  const [addPlanId, setAddPlanId] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [planClassTypeTab, setPlanClassTypeTab] = useState<string>("");

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
      setAddStep(1);
      setMemberSearch("");
      setPlanSearch("");
      setMembers([]);
      adminApiFetch<ListResponse<PlanOption>>("/api/admin/plans?limit=200").then((r) => {
        if (r.ok) setPlans(r.data.items);
      });
    }
  }, [addOpen]);

  // Member search (debounced)
  useEffect(() => {
    if (!addOpen) return;
    const q = memberSearch.trim();
    if (!q) {
      setMembers([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      setMemberSearchLoading(true);
      const params = new URLSearchParams({ limit: "20" });
      const digits = q.replace(/\D/g, "");
      if (digits.length >= 3) params.set("phone", digits);
      params.set("name", q);
      const r = await adminApiFetch<ListResponse<MemberOption>>(`/api/admin/members?${params.toString()}`);
      if (r.ok) setMembers(r.data.items);
      setMemberSearchLoading(false);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [addOpen, memberSearch]);

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
      body: JSON.stringify({ memberId: addMemberId, membershipPlanId: addPlanId, paymentMode: "Cash" }),
    });
    setAddSubmitting(false);
    if (res.ok) {
      closeAdd();
      fetchMemberships();
    } else {
      setAddError(res.message);
    }
  };

  const selectedMember = useMemo(
    () => members.find((m) => m.id === addMemberId),
    [members, addMemberId]
  );
  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === addPlanId),
    [plans, addPlanId]
  );
  const planGroups = useMemo(() => {
    const q = planSearch.trim().toLowerCase();
    const filtered = q
      ? plans.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.classTypeName.toLowerCase().includes(q)
        )
      : plans;
    const groups = new Map<string, PlanOption[]>();
    for (const p of filtered) {
      const key = p.classTypeName || "Other";
      groups.set(key, [...(groups.get(key) ?? []), p]);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [plans, planSearch]);

  // Sync plan tab to first class type when groups change (e.g. when dialog opens or search changes)
  useEffect(() => {
    if (addStep !== 2 || !planGroups.length) return;
    const first = planGroups[0][0];
    setPlanClassTypeTab((prev) => (planGroups.some(([k]) => k === prev) ? prev : first));
  }, [addStep, planGroups]);

  const subtotal = selectedPlan?.price ?? 0;
  const gst = subtotal * 0.18;
  const total = subtotal + gst;

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
        {ADD && <Button onClick={openAdd}>Create membership</Button>}
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
            {/* Steps indicator */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className={addStep === 1 ? "text-foreground font-medium" : ""}>1. Search member</span>
              <span className={addStep === 2 ? "text-foreground font-medium" : ""}>2. Select plan</span>
              <span className={addStep === 3 ? "text-foreground font-medium" : ""}>3. Payment</span>
            </div>

            {addStep === 1 && (
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>Search member</Label>
                  <Input
                    placeholder="Search by name or mobile"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Type at least 3 digits to search by phone, or any text to search by name.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label>Select member</Label>
                  <div className="max-h-48 overflow-auto rounded-md border">
                    {memberSearchLoading ? (
                      <div className="p-3 text-sm text-muted-foreground">Searching…</div>
                    ) : members.length ? (
                      members.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setAddMemberId(m.id)}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-muted ${
                            addMemberId === m.id
                              ? "bg-muted dark:bg-gray-700 ring-2 ring-primary ring-inset"
                              : ""
                          }`}
                        >
                          <div className="font-medium">{m.name ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{m.mobile ?? ""}</div>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-sm text-muted-foreground">
                        {memberSearch.trim() ? "No members found." : "Search to see members."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {addStep === 2 && (
              <div className="grid gap-3 min-w-0">
                <div className="rounded-md border p-3 text-sm bg-muted/50 dark:bg-gray-800/60">
                  <div className="text-xs text-muted-foreground">Selected member</div>
                  <div className="font-medium">{selectedMember?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{selectedMember?.mobile ?? ""}</div>
                </div>
                <div className="grid gap-2">
                  <Label>Search plan</Label>
                  <Input
                    placeholder="Search by class type or plan name"
                    value={planSearch}
                    onChange={(e) => setPlanSearch(e.target.value)}
                  />
                </div>
                {planGroups.length ? (
                  <Tabs
                    value={planClassTypeTab || planGroups[0]?.[0] || ""}
                    onValueChange={setPlanClassTypeTab}
                    className="w-full min-w-0"
                  >
                    <div className="w-full min-w-0 overflow-x-auto overflow-y-hidden">
                      <TabsList className="inline-flex w-max flex-nowrap gap-1 p-1 h-auto justify-start">
                        {planGroups.map(([classTypeName]) => (
                          <TabsTrigger key={classTypeName} value={classTypeName} className="flex-shrink-0 text-xs">
                            {classTypeName}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>
                    {planGroups.map(([classTypeName, group]) => (
                      <TabsContent key={classTypeName} value={classTypeName} className="mt-2">
                        <div className="max-h-52 overflow-auto rounded-md border">
                          {group.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setAddPlanId(p.id)}
                              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-muted ${
                                addPlanId === p.id
                                  ? "bg-muted dark:bg-gray-700 ring-2 ring-primary ring-inset"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium">{p.name}</span>
                                <span className="text-sm">₹{p.price}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {p.sessionsTotal} sessions • {p.validityDays} days
                              </div>
                            </button>
                          ))}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">No plans found.</div>
                )}
              </div>
            )}

            {addStep === 3 && (
              <div className="grid gap-3">
                <div className="rounded-md border p-3 text-sm">
                  <div className="text-xs text-muted-foreground">Member</div>
                  <div className="font-medium">{selectedMember?.name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{selectedMember?.mobile ?? ""}</div>
                </div>
                <div className="rounded-md border p-3 text-sm space-y-1">
                  <div className="text-xs text-muted-foreground">Plan</div>
                  <div className="font-medium">{selectedPlan?.classTypeName} – {selectedPlan?.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedPlan?.sessionsTotal} sessions • {selectedPlan?.validityDays} days
                  </div>
                </div>
                <div className="rounded-md border p-3 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">GST (18%)</span>
                    <span>₹{gst.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between font-semibold border-t pt-2">
                    <span>Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground pt-2">
                    Payment mode: <span className="font-medium text-foreground">Cash</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  On submit, membership will be created and a transaction entry will be recorded with metadata <code>{"{ mode: 'Cash' }"}</code>.
                </p>
              </div>
            )}
          </div>
          {addError && <p className="text-sm text-destructive">{addError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={closeAdd} disabled={addSubmitting}>
              Cancel
            </Button>
            {addStep > 1 && (
              <Button
                variant="outline"
                onClick={() => setAddStep((s) => (s === 3 ? 2 : 1))}
                disabled={addSubmitting}
              >
                Back
              </Button>
            )}
            {addStep < 3 ? (
              <Button
                onClick={() => {
                  setAddError(null);
                  if (addStep === 1) {
                    if (!addMemberId) return setAddError("Select a member to continue");
                    setAddStep(2);
                    return;
                  }
                  if (addStep === 2) {
                    if (!addPlanId) return setAddError("Select a plan to continue");
                    setAddStep(3);
                    return;
                  }
                }}
                disabled={addSubmitting}
              >
                Continue
              </Button>
            ) : (
              <Button onClick={submitAdd} disabled={addSubmitting}>
                {addSubmitting ? "Creating…" : "Create membership"}
              </Button>
            )}
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
