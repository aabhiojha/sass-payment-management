"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { apiGet, apiPost } from "@/lib/api";

type Reminder = {
  id: number;
  customerName: string;
  productName: string;
  status: string;
  daysBeforeExpiry: number | null;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
};

type Page<T> = { content: T[]; page: { totalElements: number; totalPages: number; size: number; number: number } };

const STATUS_FILTERS = ["ALL", "SENT", "PENDING", "FAILED", "SKIPPED"] as const;

function statusStyle(s: string): { bg: string; color: string } {
  const map: Record<string, { bg: string; color: string }> = {
    SENT:    { bg: "#dcfce7", color: "#166534" },
    PENDING: { bg: "#dbeafe", color: "#1e40af" },
    FAILED:  { bg: "#fee2e2", color: "#991b1b" },
    SKIPPED: { bg: "#f3f4f6", color: "#374151" },
  };
  return map[s] ?? { bg: "#f3f4f6", color: "#374151" };
}

function Badge({ status }: { status: string }) {
  const s = statusStyle(status);
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold" style={s}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function MilestoneBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-xs text-gray-400">—</span>;
  const map: Record<number, { bg: string; color: string; label: string }> = {
    7:  { bg: "#386AF5", color: "#fff", label: "7-day" },
    3:  { bg: "#EF5F00", color: "#fff", label: "3-day" },
    1:  { bg: "#e8a020", color: "#000", label: "1-day" },
    0:  { bg: "#1f2937", color: "#fff", label: "Expiry" },
  };
  const s = map[days] ?? { bg: "#6b7280", color: "#fff", label: `${days}d` };
  return (
    <span className="inline-flex items-center justify-center w-12 py-0.5 rounded-md text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

export default function ReminderEnginePage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAdmin = user?.role === "TENANT_ADMIN";

  const [rows, setRows] = useState<Reminder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const [triggering, setTriggering] = useState(false);
  const [triggerResult, setTriggerResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const PAGE_SIZE = 25;
  const tid = user?.tenantId;

  const load = (f = filter, p = page) => {
    if (!token || !tid) return;
    setLoading(true);
    const params = new URLSearchParams({ size: String(PAGE_SIZE), page: String(p), sort: "createdAt,desc" });
    if (f !== "ALL") params.set("status", f);
    apiGet<Page<Reminder>>(`/api/v1/tenants/${tid}/reminders?${params}`, token)
      .then((d) => { setRows(d.content); setTotal(d.page.totalElements); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token, user]);

  const handleFilter = (f: string) => { setFilter(f); setPage(0); load(f, 0); };

  const triggerReminders = async () => {
    if (!token || !tid) return;
    setTriggering(true);
    setTriggerResult(null);
    try {
      await apiPost(`/api/v1/tenants/${tid}/reminders/trigger`, {}, token);
      setTriggerResult({ ok: true, msg: "Reminders triggered successfully. Check the list for new entries." });
      load();
    } catch (e) {
      setTriggerResult({ ok: false, msg: e instanceof Error ? e.message : "Failed to trigger reminders." });
    } finally {
      setTriggering(false);
    }
  };

  // Derived stats from current page (approximate)
  const sent    = rows.filter((r) => r.status === "SENT").length;
  const failed  = rows.filter((r) => r.status === "FAILED").length;
  const pending = rows.filter((r) => r.status === "PENDING").length;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="px-6 py-8 md:px-10 max-w-6xl mx-auto space-y-6" style={{ animation: "fade-in-up 0.2s ease-out both" }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reminder Engine</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} reminders logged</p>
        </div>

        {isAdmin && (
          <div className="flex flex-col items-start sm:items-end gap-2">
            <button
              onClick={triggerReminders}
              disabled={triggering}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {triggering ? (
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 3l14 9-14 9V3z" />
                </svg>
              )}
              {triggering ? "Running…" : "Run Now"}
            </button>
            {triggerResult && (
              <p className="text-xs" style={{ color: triggerResult.ok ? "#166534" : "#991b1b" }}>
                {triggerResult.msg}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Mini stat strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Sent",    value: sent,    color: "#24A37D" },
          { label: "Failed",  value: failed,  color: "#dc2626" },
          { label: "Pending", value: pending, color: "#6366f1" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <span className="text-xs font-medium text-gray-500">{s.label}</span>
            <span className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-1 p-1 rounded-lg w-fit" style={{ backgroundColor: "var(--border)" }}>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => handleFilter(f)}
            className="text-xs font-semibold px-3 py-1.5 rounded-md transition-all"
            style={
              filter === f
                ? { backgroundColor: "#fff", color: "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }
                : { color: "#6b7280" }
            }
          >
            {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            No reminders found.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
                {["Customer", "Product", "Milestone", "Status", "Sent At", ""].map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  className="hover:bg-[#f8faf8] transition-colors"
                  style={{ borderTop: "1px solid var(--border)", animation: "fade-in 0.15s ease-out both", animationDelay: `${i * 15}ms` }}
                >
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[160px] truncate">{row.customerName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-[160px] truncate">{row.productName}</td>
                  <td className="px-4 py-3"><MilestoneBadge days={row.daysBeforeExpiry} /></td>
                  <td className="px-4 py-3"><Badge status={row.status} /></td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {row.sentAt ? formatDateTime(row.sentAt) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {row.errorMessage && (
                      <span className="text-xs text-red-500 max-w-[200px] truncate block" title={row.errorMessage}>
                        {row.errorMessage}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => { const p = page - 1; setPage(p); load(filter, p); }} className="px-3 py-1.5 rounded-lg font-medium disabled:opacity-40" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}>Prev</button>
            <button disabled={page >= totalPages - 1} onClick={() => { const p = page + 1; setPage(p); load(filter, p); }} className="px-3 py-1.5 rounded-lg font-medium disabled:opacity-40" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
