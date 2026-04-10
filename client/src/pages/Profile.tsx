import { useState, useEffect, useCallback } from "react";
import { useMember } from "@/context/MemberContext";
import { useTheme } from "@/context/ThemeContext";
import MobileLayout from "@/components/layout/MobileLayout";
import { HeroWithAccent } from "@/components/HeroWithAccent";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { addDays, format } from "date-fns";
import { LogOut, Settings, ChevronRight, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { getMembershipCtas, getMembershipHeadline, getMembershipUsability, getRenewUrl, isPauseCtaVisible } from "@/lib/membershipUi";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { MemberDialogContent } from "@/components/MemberDialogContent";

type MemberTxStatus = "CREATED" | "PENDING" | "SUCCESS" | "FAILED";

interface MemberTransactionRow {
  id: string;
  createdAt: string | null;
  amount: number;
  currency: string;
  status: MemberTxStatus;
  orderId: string;
  paymentId: string | null;
  receipt: string;
}

function formatPaiseInr(paise: number): string {
  if (paise % 100 === 0) {
    return `₹${(paise / 100).toLocaleString("en-IN")}`;
  }
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function transactionDisplayStatus(status: MemberTxStatus): { label: string; className: string } {
  if (status === "SUCCESS") return { label: "Paid", className: "text-emerald-600 dark:text-emerald-400" };
  if (status === "FAILED") return { label: "Failed", className: "text-red-600 dark:text-red-400" };
  return { label: "Pending", className: "text-gray-500 dark:text-[#9CA3AF]" };
}

function transactionRef(row: MemberTransactionRow): string | null {
  const p = row.paymentId?.trim();
  if (p) return p;
  const r = row.receipt?.trim();
  if (r) return r;
  return row.orderId?.trim() || null;
}

export default function Profile() {
  const { user, logout, selfExtendMembership, pauseMembership } = useMember();
  const { darkMode, setDarkMode } = useTheme();
  const [, setLocation] = useLocation();
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const [pausePending, setPausePending] = useState<{ category: string; membershipId: string } | null>(null);
  const [txLoading, setTxLoading] = useState(true);
  const [txError, setTxError] = useState<string | null>(null);
  const [txItems, setTxItems] = useState<MemberTransactionRow[]>([]);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    setTxError(null);
    const res = await apiFetch<{ items: MemberTransactionRow[] }>("/api/payments/transactions?limit=5");
    if (!res.ok) {
      setTxError(res.message || "Could not load transactions");
      setTxItems([]);
      setTxLoading(false);
      return;
    }
    setTxItems(Array.isArray(res.data?.items) ? res.data.items : []);
    setTxLoading(false);
  }, []);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  if (!user) {
    return <div className="flex items-center justify-center h-full">Loading... <Loader2 size={16} /></div>;
  }

  const hasMemberships = Object.keys(user.memberships).length > 0;
  const resumeDateLabel = format(addDays(new Date(), 14), "dd MMM yyyy");

  return (
    <MobileLayout>
      <div className="p-6">
        <HeroWithAccent className="mb-8">
          <h1 className="text-xl font-bold text-gray-900 dark:text-[#EDEDED] mb-2">{user.name}</h1>
          <p className="text-gray-500 dark:text-[#9CA3AF] text-sm font-medium">{user.phone}</p>
        </HeroWithAccent>

        {/* Memberships Section */}
        <div className="mb-8">
            <h2 className="text-xs font-bold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider mb-3 px-1">Memberships</h2>
            {hasMemberships ? (
                <div className="space-y-3">
                    {Object.entries(user.memberships).map(([name, details]) => (
                        <div key={name} className="bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/6 border-l-[3px] border-l-airborne-teal dark:border-l-teal-400 p-4 rounded shadow-sm dark:shadow-black/30 transition-shadow duration-200 hover:shadow-md dark:hover:shadow-black/30">
                          <div className="flex justify-between items-center">
                              <div>
                                  <h3 className="font-bold text-gray-900 dark:text-[#EDEDED] text-sm">{name}</h3>
                                  <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">{details.planName}</p>
                                  {getMembershipHeadline(details) && (
                                    <p
                                      className={
                                        getMembershipUsability(details).state === "paused"
                                          ? "text-xs font-semibold text-airborne-teal dark:text-teal-300 mt-2"
                                          : "text-xs font-semibold text-amber-700 dark:text-amber-300 mt-2"
                                      }
                                      data-testid={`text-membership-headline-${name}`}
                                    >
                                      {getMembershipHeadline(details)}
                                    </p>
                                  )}
                              </div>
                              <div className="text-right">
                                  <div className="text-airborne-teal font-bold text-lg">{details.sessionsRemaining}</div>
                                  <div className="text-[10px] text-gray-400 dark:text-[#6B7280]">sessions left</div>
                                  {details.expiryDate && (
                                    <p className="text-[10px] text-gray-500 dark:text-[#9CA3AF] mt-1" data-testid="membership-expiry">
                                      Expires {format(new Date(details.expiryDate), "dd MMM yyyy")}
                                    </p>
                                  )}
                              </div>
                          </div>

                          {(isPauseCtaVisible(details) || getMembershipCtas(details).showExtend || getMembershipCtas(details).showRenew) && (
                            <div className="flex gap-2 mt-3">
                              {isPauseCtaVisible(details) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-9 rounded flex-1"
                                  onClick={() => {
                                    setPausePending({ category: name, membershipId: details.id });
                                    setPauseConfirmOpen(true);
                                  }}
                                  data-testid={`button-pause-${name}`}
                                >
                                  Pause
                                </Button>
                              )}
                              {getMembershipCtas(details).showExtend && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-9 rounded flex-1"
                                  onClick={() => selfExtendMembership(name)}
                                  data-testid={`button-extend-${name}`}
                                >
                                  Get 1 Week Extension
                                </Button>
                              )}
                              {getMembershipCtas(details).showRenew && (
                                <Button
                                  size="sm"
                                  className="h-9 bg-gray-900 dark:bg-[#EDEDED] text-white dark:text-[#0B0B0C] rounded flex-1"
                                  onClick={() => setLocation(getRenewUrl(name))}
                                  data-testid={`button-renew-${name}`}
                                >
                                  Renew
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 dark:bg-[#111113] rounded p-4 text-center border border-dashed border-gray-200 dark:border-white/10">
                    <p className="text-gray-400 dark:text-[#6B7280] text-sm">No active memberships</p>
                </div>
            )}
        </div>

        {/* Transactions */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-gray-400 dark:text-[#6B7280] uppercase tracking-wider mb-3 px-1">Transactions</h2>
          {txLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-[#9CA3AF] py-2">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Loading transactions…
            </div>
          )}
          {!txLoading && txError && (
            <div className="space-y-2">
              <p className="text-sm text-red-600 dark:text-red-400">{txError}</p>
              <Button type="button" variant="outline" size="sm" className="rounded" onClick={() => void loadTransactions()}>
                Retry
              </Button>
            </div>
          )}
          {!txLoading && !txError && txItems.length === 0 && (
            <div className="bg-gray-50 dark:bg-[#111113] rounded p-4 text-center border border-dashed border-gray-200 dark:border-white/10">
              <p className="text-gray-400 dark:text-[#6B7280] text-sm">No transactions yet</p>
            </div>
          )}
          {!txLoading && !txError && txItems.length > 0 && (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {txItems.map((row) => {
                const st = transactionDisplayStatus(row.status);
                const refStr = transactionRef(row);
                const dateLabel = row.createdAt
                  ? format(new Date(row.createdAt), "dd MMM yyyy")
                  : "—";
                return (
                  <div
                    key={row.id}
                    className="bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/6 border-l-[3px] border-l-airborne-teal dark:border-l-teal-400 p-4 rounded shadow-sm dark:shadow-black/30"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500 dark:text-[#9CA3AF]">{dateLabel}</p>
                        {refStr && (
                          <p className="text-[11px] text-gray-400 dark:text-[#6B7280] mt-1 truncate" title={refStr}>
                            Ref: {refStr}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-gray-900 dark:text-[#EDEDED]">{formatPaiseInr(row.amount)}</p>
                        <p className={`text-xs font-medium mt-0.5 ${st.className}`}>{st.label}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Dialog open={pauseConfirmOpen} onOpenChange={setPauseConfirmOpen}>
          <MemberDialogContent onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Pause membership?</DialogTitle>
              <DialogDescription>
                <div className="space-y-3">
                  <p>The membership will be paused for 14 days.</p>
                  <p><span className="font-medium">Resume date:</span> {resumeDateLabel}</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>You will not be able to book any sessions for this membership during the pause window.</li>
                    <li>Any sessions already booked for this category within the two-week window will be automatically cancelled and returned to your balance.</li>
                    <li>This pause cannot be undone once confirmed.</li>
                  </ul>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setPauseConfirmOpen(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  if (!pausePending) return;
                  setPauseConfirmOpen(false);
                  await pauseMembership(pausePending.membershipId);
                  setPausePending(null);
                }}
              >
                Confirm Pause
              </Button>
            </DialogFooter>
          </MemberDialogContent>
        </Dialog>

        {/* Settings List */}
        <div className="space-y-3">
          <button onClick={() => setLocation("/profile/settings")} className="w-full flex items-center justify-between bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/6 border-l-2 border-l-airborne-teal dark:border-l-teal-400 p-4 rounded hover:bg-gray-50 dark:hover:bg-[#18181B] transition-colors transition-shadow duration-200 hover:shadow-md dark:hover:shadow-black/30 group">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 flex items-center justify-center">
                    <Settings size={16} />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-[#EDEDED]">Account Settings</span>
            </div>
            <ChevronRight size={16} className="text-gray-300 dark:text-[#6B7280] group-hover:text-gray-500 dark:group-hover:text-[#9CA3AF]" />
          </button>

          <div className="w-full flex items-center justify-between bg-white dark:bg-[#111113] border border-gray-100 dark:border-white/6 border-l-2 border-l-airborne-teal dark:border-l-teal-400 p-4 rounded transition-shadow duration-200 hover:shadow-md dark:hover:shadow-black/30">
            <span className="text-sm font-medium text-gray-700 dark:text-[#EDEDED]">Dark Mode</span>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
          
          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="w-full h-12 mt-6 flex items-center gap-2 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
          >
            <LogOut size={18} /> Logout
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
}
