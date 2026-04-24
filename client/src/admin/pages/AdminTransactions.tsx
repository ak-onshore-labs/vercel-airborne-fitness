import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { getStoredToken } from "@/lib/api";
import { useAdminPermissions } from "../useAdminPermissions";
import { sectionToHash } from "../constants";

type AdminTransactionItem = {
  id: string;
  date: string;
  memberName: string;
  memberMobile: string;
  plan: string;
  classType: string;
  paymentMode: string;
  subtotal: string;
  gst: string;
  totalAmount: string;
  reference: string;
  source: string;
};

function formatDate(value: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatInr(value: string): string {
  if (!value || value === "—") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function withFallback(v: string): string {
  return v && v.trim() ? v : "—";
}

export default function AdminTransactions() {
  const { VIEW } = useAdminPermissions("transactions");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [q, setQ] = useState("");
  const [paymentMode, setPaymentMode] = useState("");

  const [searchDateFrom, setSearchDateFrom] = useState("");
  const [searchDateTo, setSearchDateTo] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [searchPaymentMode, setSearchPaymentMode] = useState("");

  const [data, setData] = useState<ListResponse<AdminTransactionItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);

  const getParams = useCallback(
    (includePagination: boolean) => {
      const params = new URLSearchParams();
      if (includePagination) {
        params.set("page", String(page));
        params.set("limit", String(limit));
      }
      if (searchDateFrom) params.set("dateFrom", searchDateFrom);
      if (searchDateTo) params.set("dateTo", searchDateTo);
      if (searchQ) params.set("q", searchQ);
      if (searchPaymentMode) params.set("paymentMode", searchPaymentMode);
      return params;
    },
    [page, limit, searchDateFrom, searchDateTo, searchQ, searchPaymentMode]
  );

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = getParams(true);
    const res = await adminApiFetch<ListResponse<AdminTransactionItem>>(
      `/api/admin/transactions?${params.toString()}`
    );
    if (res.ok) setData(res.data);
    else setError(res.message);
    setLoading(false);
  }, [getParams]);

  useEffect(() => {
    if (!VIEW) {
      window.location.hash = sectionToHash("dashboard");
      return;
    }
    fetchTransactions();
  }, [fetchTransactions, VIEW]);

  if (!VIEW) return null;

  const onSearch = () => {
    setSearchDateFrom(dateFrom.trim());
    setSearchDateTo(dateTo.trim());
    setSearchQ(q.trim());
    setSearchPaymentMode(paymentMode.trim());
    setPage(1);
  };

  const onDownloadCsv = async () => {
    setDownloadLoading(true);
    try {
      const token = getStoredToken();
      const params = getParams(false);
      const res = await fetch(`/api/admin/transactions/export.csv?${params.toString()}`, {
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
      const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
      const filename = filenameMatch?.[1] || "admin-transactions.csv";
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

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Transactions</h1>
        <Button onClick={onDownloadCsv} disabled={downloadLoading}>
          {downloadLoading ? "Downloading..." : "Download CSV"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="max-w-[160px]"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="max-w-[160px]"
        />
        <Input
          placeholder="Search name/mobile/reference"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-[240px]"
        />
        <select
          className="flex h-9 w-[170px] rounded-md border border-input bg-background px-3 py-1 text-sm"
          value={paymentMode}
          onChange={(e) => setPaymentMode(e.target.value)}
        >
          <option value="">All payment modes</option>
          <option value="Cash">Cash</option>
          <option value="Razorpay">Razorpay</option>
          <option value="—">—</option>
        </select>
        <Button onClick={onSearch}>Search</Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Member Name</TableHead>
              <TableHead>Member Mobile</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Class Type</TableHead>
              <TableHead>Payment Mode</TableHead>
              <TableHead className="text-right">Subtotal</TableHead>
              <TableHead className="text-right">GST</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : data?.items.length ? (
              data.items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDate(row.date)}</TableCell>
                  <TableCell>{withFallback(row.memberName)}</TableCell>
                  <TableCell>{withFallback(row.memberMobile)}</TableCell>
                  <TableCell>{withFallback(row.plan)}</TableCell>
                  <TableCell>{withFallback(row.classType)}</TableCell>
                  <TableCell>{withFallback(row.paymentMode)}</TableCell>
                  <TableCell className="text-right">{formatInr(row.subtotal)}</TableCell>
                  <TableCell className="text-right">{formatInr(row.gst)}</TableCell>
                  <TableCell className="text-right">{formatInr(row.totalAmount)}</TableCell>
                  <TableCell className="max-w-[170px] truncate" title={row.reference}>
                    {withFallback(row.reference)}
                  </TableCell>
                  <TableCell>{withFallback(row.source)}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                  No successful transactions found
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
