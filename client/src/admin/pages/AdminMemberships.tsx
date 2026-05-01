import { useMemo, useState, useEffect, useCallback, useRef } from "react";
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
import { getStoredToken } from "@/lib/api";

type MemberOption = { id: string; name?: string | null; mobile?: string };
type PlanOption = {
  id: string;
  name: string;
  classTypeName: string;
  sessionsTotal: number;
  validityDays: number;
  price: number;
  gstInclusive?: boolean;
  isActive: boolean;
};
type CreatedMember = { id: string; memberType: "Adult" | "Kid"; name?: string | null; email?: string | null };

type MembershipItem = {
  id: string;
  memberId: string;
  membershipPlanId: string;
  sessionsRemaining: number;
  startDate?: string | null;
  expiryDate: string;
  carryForward: number;
  extensionRequestedAt?: string | null;
  extensionApprovedAt?: string | null;
  extensionApplied: boolean;
  memberName?: string;
  memberMobile?: string;
  planName?: string;
  classTypeName?: string;
};
type ClassTypeOption = { id: string; name: string };

const ADMIN_MEMBERSHIP_GST_PERCENT = 5;

function normalizeAdminMobile(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(-10);
  return digits;
}

export default function AdminMemberships() {
  const { ADD } = useAdminPermissions("memberships");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [memberMobileFilter, setMemberMobileFilter] = useState("");
  const [memberNameFilter, setMemberNameFilter] = useState("");
  const [classTypeFilter, setClassTypeFilter] = useState("");
  const [startDateFromFilter, setStartDateFromFilter] = useState("");
  const [startDateToFilter, setStartDateToFilter] = useState("");
  const [expiryDateFromFilter, setExpiryDateFromFilter] = useState("");
  const [expiryDateToFilter, setExpiryDateToFilter] = useState("");
  const [searchMemberMobile, setSearchMemberMobile] = useState("");
  const [searchMemberName, setSearchMemberName] = useState("");
  const [searchClassType, setSearchClassType] = useState("");
  const [searchStartDateFrom, setSearchStartDateFrom] = useState("");
  const [searchStartDateTo, setSearchStartDateTo] = useState("");
  const [searchExpiryDateFrom, setSearchExpiryDateFrom] = useState("");
  const [searchExpiryDateTo, setSearchExpiryDateTo] = useState("");
  const [data, setData] = useState<ListResponse<MembershipItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [classTypes, setClassTypes] = useState<ClassTypeOption[]>([]);

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
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [createMemberSubmitting, setCreateMemberSubmitting] = useState(false);
  const [createMemberError, setCreateMemberError] = useState<string | null>(null);
  const [createMemberSuccess, setCreateMemberSuccess] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [createMobile, setCreateMobile] = useState("");
  const [createGender, setCreateGender] = useState<"Male" | "Female">("Male");
  const [createUserRole, setCreateUserRole] = useState<"MEMBER" | "STAFF" | "ADMIN">("MEMBER");
  const [createMemberType, setCreateMemberType] = useState<"Adult" | "Kid">("Adult");
  const [createMemberName, setCreateMemberName] = useState("");
  const [createMemberEmail, setCreateMemberEmail] = useState("");
  const [createMemberDob, setCreateMemberDob] = useState("");
  const [createMemberGender, setCreateMemberGender] = useState("");
  const createAdvanceTimeoutRef = useRef<number | null>(null);

  const getAppliedParams = useCallback(
    (includePagination: boolean) => {
      const params = new URLSearchParams();
      if (includePagination) {
        params.set("page", String(page));
        params.set("limit", String(limit));
      }
      if (searchMemberMobile) params.set("memberMobile", searchMemberMobile);
      if (searchMemberName) params.set("memberName", searchMemberName);
      if (searchClassType) params.set("classTypeName", searchClassType);
      if (searchStartDateFrom) params.set("startDateFrom", searchStartDateFrom);
      if (searchStartDateTo) params.set("startDateTo", searchStartDateTo);
      if (searchExpiryDateFrom) params.set("expiryDateFrom", searchExpiryDateFrom);
      if (searchExpiryDateTo) params.set("expiryDateTo", searchExpiryDateTo);
      return params;
    },
    [
      page,
      limit,
      searchMemberMobile,
      searchMemberName,
      searchClassType,
      searchStartDateFrom,
      searchStartDateTo,
      searchExpiryDateFrom,
      searchExpiryDateTo,
    ]
  );

  const fetchMemberships = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = getAppliedParams(true);
    const res = await adminApiFetch<ListResponse<MembershipItem>>(`/api/admin/memberships?${params.toString()}`);
    if (res.ok) setData(res.data);
    else setError(res.message);
    setLoading(false);
  }, [getAppliedParams]);

  useEffect(() => {
    fetchMemberships();
  }, [fetchMemberships]);

  useEffect(() => {
    adminApiFetch<ListResponse<ClassTypeOption>>("/api/admin/class-types?limit=200").then((res) => {
      if (!res.ok) return;
      setClassTypes(res.data.items);
    });
  }, []);

  useEffect(() => {
    if (addOpen) {
      setAddStep(1);
      setMemberSearch("");
      setPlanSearch("");
      setMembers([]);
      setShowAddMemberForm(false);
      setCreateMemberError(null);
      setCreateMemberSuccess(null);
      adminApiFetch<ListResponse<PlanOption>>("/api/admin/plans?limit=200").then((r) => {
        if (!r.ok) return;
        const active = r.data.items.filter((p) => p.isActive === true);
        setPlans(active);
        setAddPlanId((prev) => (prev && !active.some((p) => p.id === prev) ? "" : prev));
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
    if (createAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(createAdvanceTimeoutRef.current);
      createAdvanceTimeoutRef.current = null;
    }
    setAddMemberId("");
    setAddPlanId("");
    setAddError(null);
    setShowAddMemberForm(false);
    setCreateMemberSubmitting(false);
    setCreateMemberError(null);
    setCreateMemberSuccess(null);
    setCreateName("");
    setCreateMobile("");
    setCreateGender("Male");
    setCreateUserRole("MEMBER");
    setCreateMemberType("Adult");
    setCreateMemberName("");
    setCreateMemberEmail("");
    setCreateMemberDob("");
    setCreateMemberGender("");
    setAddOpen(true);
  };

  const closeAdd = () => {
    if (createAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(createAdvanceTimeoutRef.current);
      createAdvanceTimeoutRef.current = null;
    }
    setAddOpen(false);
    setAddError(null);
  };

  useEffect(() => {
    return () => {
      if (createAdvanceTimeoutRef.current !== null) {
        window.clearTimeout(createAdvanceTimeoutRef.current);
      }
    };
  }, []);

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

  const submitCreateMember = async () => {
    const name = createName.trim();
    const mobile = normalizeAdminMobile(createMobile);
    if (!name) {
      setCreateMemberError("Name is required");
      return;
    }
    if (createGender !== "Male" && createGender !== "Female") {
      setCreateMemberError("Gender must be Male or Female");
      return;
    }
    if (mobile.length !== 10) {
      setCreateMemberError("Valid phone number required (exactly 10 digits)");
      return;
    }
    setCreateMemberSubmitting(true);
    setCreateMemberError(null);
    setCreateMemberSuccess(null);
    const response = await adminApiFetch<CreatedMember>("/api/admin/members", {
      method: "POST",
      body: JSON.stringify({
        name,
        mobile,
        gender: createGender,
        userRole: createUserRole,
        memberType: createMemberType,
        memberName: createMemberName.trim() || undefined,
        memberEmail: createMemberEmail.trim() || undefined,
        memberDob: createMemberDob.trim() || undefined,
        memberGender: createMemberGender.trim() || undefined,
      }),
    });
    setCreateMemberSubmitting(false);
    if (!response.ok) {
      setCreateMemberError(response.message);
      return;
    }
    const displayName =
      response.data.name ??
      (createMemberType === "Kid" ? createMemberName.trim() || name : name);
    const createdMember: MemberOption = {
      id: response.data.id,
      name: displayName,
      mobile,
    };
    setMembers((prev) => [createdMember, ...prev.filter((m) => m.id !== createdMember.id)]);
    setAddMemberId(createdMember.id);
    setCreateMemberSuccess(
      `Created and selected ${displayName}. Continuing to plan selection...`
    );
    setShowAddMemberForm(false);
    setCreateName("");
    setCreateMobile("");
    setCreateGender("Male");
    setCreateUserRole("MEMBER");
    setCreateMemberType("Adult");
    setCreateMemberName("");
    setCreateMemberEmail("");
    setCreateMemberDob("");
    setCreateMemberGender("");
    if (createAdvanceTimeoutRef.current !== null) {
      window.clearTimeout(createAdvanceTimeoutRef.current);
    }
    createAdvanceTimeoutRef.current = window.setTimeout(() => {
      setAddStep(2);
      createAdvanceTimeoutRef.current = null;
    }, 800);
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
  const gst =
    selectedPlan && selectedPlan.gstInclusive === true
      ? 0
      : subtotal * (ADMIN_MEMBERSHIP_GST_PERCENT / 100);
  const total = subtotal + gst;

  const onSearch = () => {
    setSearchMemberMobile(memberMobileFilter.trim());
    setSearchMemberName(memberNameFilter.trim());
    setSearchClassType(classTypeFilter.trim());
    setSearchStartDateFrom(startDateFromFilter.trim());
    setSearchStartDateTo(startDateToFilter.trim());
    setSearchExpiryDateFrom(expiryDateFromFilter.trim());
    setSearchExpiryDateTo(expiryDateToFilter.trim());
    setPage(1);
  };

  const onDownloadCsv = async () => {
    setDownloadLoading(true);
    try {
      const token = getStoredToken();
      const params = getAppliedParams(false);
      const res = await fetch(`/api/admin/memberships/export.csv?${params.toString()}`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const msg = await res.text();
        setError(msg || "CSV export failed");
        return;
      }
      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition") || "";
      const filenameMatch = contentDisposition.match(/filename=\"([^\"]+)\"/);
      const filename = filenameMatch?.[1] || "admin-memberships.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "CSV export failed");
    } finally {
      setDownloadLoading(false);
    }
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
        <div className="flex items-center gap-2">
          <Button onClick={onDownloadCsv} disabled={downloadLoading}>
            {downloadLoading ? "Downloading..." : "Download CSV"}
          </Button>
          {ADD && <Button onClick={openAdd}>Create membership</Button>}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <Input
          placeholder="Member mobile"
          value={memberMobileFilter}
          onChange={(e) => setMemberMobileFilter(e.target.value)}
          className="max-w-[180px]"
        />
        <Input
          placeholder="Member name"
          value={memberNameFilter}
          onChange={(e) => setMemberNameFilter(e.target.value)}
          className="max-w-[200px]"
        />
        <select
          className="flex h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm"
          value={classTypeFilter}
          onChange={(e) => setClassTypeFilter(e.target.value)}
        >
          <option value="">All class types</option>
          {classTypes.map((ct) => (
            <option key={ct.id} value={ct.name}>
              {ct.name}
            </option>
          ))}
        </select>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Start Date</Label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground min-w-9">From</Label>
              <Input
                type="date"
                placeholder="From"
                aria-label="Start Date From"
                value={startDateFromFilter}
                onChange={(e) => setStartDateFromFilter(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground min-w-5">To</Label>
              <Input
                type="date"
                placeholder="To"
                aria-label="Start Date To"
                value={startDateToFilter}
                onChange={(e) => setStartDateToFilter(e.target.value)}
                className="w-[160px]"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Expiry Date</Label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground min-w-9">From</Label>
              <Input
                type="date"
                placeholder="From"
                aria-label="Expiry Date From"
                value={expiryDateFromFilter}
                onChange={(e) => setExpiryDateFromFilter(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground min-w-5">To</Label>
              <Input
                type="date"
                placeholder="To"
                aria-label="Expiry Date To"
                value={expiryDateToFilter}
                onChange={(e) => setExpiryDateToFilter(e.target.value)}
                className="w-[160px]"
              />
            </div>
          </div>
        </div>
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
                  <div className="flex items-center justify-between gap-2">
                    <Label>Select member</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowAddMemberForm((prev) => !prev);
                        setCreateMemberError(null);
                      }}
                    >
                      {showAddMemberForm ? "Close" : "Add New Member"}
                    </Button>
                  </div>
                  {createMemberSuccess && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 rounded-md border border-emerald-300/50 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1">
                      {createMemberSuccess}
                    </p>
                  )}
                  {showAddMemberForm && (
                    <div className="rounded-md border p-3 bg-muted/40 grid gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="create-member-name">Name</Label>
                        <Input
                          id="create-member-name"
                          value={createName}
                          onChange={(e) => setCreateName(e.target.value)}
                          placeholder="Full name"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="create-member-mobile">Mobile (10 digits)</Label>
                        <Input
                          id="create-member-mobile"
                          type="tel"
                          value={createMobile}
                          onChange={(e) => setCreateMobile(e.target.value)}
                          placeholder="e.g. 9876543210 or 919876543210"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Gender</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          value={createGender}
                          onChange={(e) => setCreateGender(e.target.value as "Male" | "Female")}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="grid gap-2">
                        <Label>User role</Label>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          value={createUserRole}
                          onChange={(e) =>
                            setCreateUserRole(
                              e.target.value as "MEMBER" | "STAFF" | "ADMIN"
                            )
                          }
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
                          value={createMemberType}
                          onChange={(e) =>
                            setCreateMemberType(e.target.value as "Adult" | "Kid")
                          }
                        >
                          <option value="Adult">Adult</option>
                          <option value="Kid">Kid</option>
                        </select>
                      </div>
                      {createMemberType === "Kid" && (
                        <>
                          <div className="grid gap-2">
                            <Label htmlFor="create-kid-name">Kid&apos;s name</Label>
                            <Input
                              id="create-kid-name"
                              value={createMemberName}
                              onChange={(e) => setCreateMemberName(e.target.value)}
                              placeholder="Child's name"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="create-kid-dob">Kid&apos;s date of birth</Label>
                            <Input
                              id="create-kid-dob"
                              type="date"
                              value={createMemberDob}
                              onChange={(e) => setCreateMemberDob(e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="create-kid-gender">Kid&apos;s gender</Label>
                            <Input
                              id="create-kid-gender"
                              value={createMemberGender}
                              onChange={(e) => setCreateMemberGender(e.target.value)}
                              placeholder="Optional"
                            />
                          </div>
                        </>
                      )}
                      <div className="grid gap-2">
                        <Label htmlFor="create-member-email">Email (optional)</Label>
                        <Input
                          id="create-member-email"
                          type="email"
                          value={createMemberEmail}
                          onChange={(e) => setCreateMemberEmail(e.target.value)}
                          placeholder="Member email"
                        />
                      </div>
                      {createMemberError && (
                        <p className="text-xs text-destructive">{createMemberError}</p>
                      )}
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAddMemberForm(false);
                            setCreateMemberError(null);
                          }}
                          disabled={createMemberSubmitting}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={submitCreateMember}
                          disabled={createMemberSubmitting}
                        >
                          {createMemberSubmitting ? "Creating..." : "Create Member"}
                        </Button>
                      </div>
                    </div>
                  )}
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
                    <span className="text-muted-foreground">GST ({ADMIN_MEMBERSHIP_GST_PERCENT}%)</span>
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
              <TableHead>Member Name</TableHead>
              <TableHead>Member Mobile</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Class type</TableHead>
              <TableHead className="text-right">Sessions left</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead>Extension</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : data?.items.length ? (
              data.items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.memberName ?? "—"}</TableCell>
                  <TableCell>{m.memberMobile ?? "—"}</TableCell>
                  <TableCell>{m.planName ?? "—"}</TableCell>
                  <TableCell>{m.classTypeName ?? "—"}</TableCell>
                  <TableCell className="text-right">{m.sessionsRemaining}</TableCell>
                  <TableCell>{m.startDate ? formatDate(m.startDate) : "—"}</TableCell>
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
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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
