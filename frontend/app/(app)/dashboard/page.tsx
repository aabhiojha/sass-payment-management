"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { apiGet } from "@/lib/api";
import { titleCase } from "@/lib/format";

function useCountUp(target: number, duration = 450) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

type TenantSummary = {
  totalCustomers: number;
  totalProducts: number;
  activePlans: number;
  pausedPlans: number;
  cancelledPlans: number;
};

type RevenueTotals = {
  totals: { currency: string; totalAmount: number; planCount: number }[];
};

type ApiUpcoming = {
  customerProductId: number;
  customerName: string;
  productName: string;
  currency: string;
  amount: number;
  endsAt: string;
};

type ReminderStats = {
  from: string;
  to: string;
  sent: number;
  failed: number;
  skipped: number;
  total: number;
};

type AuditLog = {
  id: number;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: number | null;
  createdAt: string;
};

type OverduePlan = {
  customerProductId: number;
  customerName: string;
  productName: string;
  currency: string;
  amount: number;
  endsAt: string;
};

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function prettyAction(action: string) {
  const verb = action.includes(".") ? action.split(".").pop()! : action;
  return verb.charAt(0) + verb.slice(1).toLowerCase().replace(/_/g, " ");
}

function prettyResource(type: string) {
  return type.toLowerCase().replace(/_/g, " ");
}

function actionColor(action: string): string {
  if (action.includes("CREAT") || action.includes("ADD") || action.includes("ASSIGN")) return "#24A37D";
  if (action.includes("DELET") || action.includes("REMOV") || action.includes("CANCEL") || action.includes("ARCHIV")) return "#dc2626";
  if (action.includes("SUSPEND") || action.includes("PAUS") || action.includes("DISABL")) return "#f59e0b";
  if (action.includes("LOGIN") || action.includes("LOGOUT")) return "#6366f1";
  return "#6b7280";
}

function StatCard({
  label,
  value,
  sub,
  accent,
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  delay?: number;
}) {
  return (
    <div
      className="rounded-xl px-5 py-4 flex flex-col gap-1"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        animation: "fade-in-up 0.2s ease-out both",
        animationDelay: `${delay}ms`,
      }}
    >
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p
        className="text-2xl font-bold tabular-nums leading-tight"
        style={{ color: accent ?? "#111827" }}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-10 text-gray-400">
      <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      Loading…
    </div>
  );
}

function RenewalTable({ rows, loading }: { rows: ApiUpcoming[]; loading: boolean }) {
  if (loading) return <Spinner />;
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400 rounded-lg" style={{ border: "1px solid var(--border)" }}>
        No upcoming renewals this week.
      </div>
    );
  }
  return (
    <div className="rounded-lg overflow-hidden overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
      <table className="w-full">
        <thead>
          <tr style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
            {["Customer", "Plan", "Renewal Date", "Amount"].map((h) => (
              <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.customerProductId}
              className="hover:bg-md-primary/5 transition-colors"
              style={{
                borderTop: i > 0 ? "1px solid var(--border)" : undefined,
                animation: "fade-in 0.15s ease-out both",
                animationDelay: `${60 + i * 20}ms`,
              }}
            >
              <td className="px-4 py-2.5 text-sm font-medium text-gray-900 max-w-[140px] truncate">{row.customerName}</td>
              <td className="px-4 py-2.5 text-sm text-gray-600 max-w-[120px] truncate">{titleCase(row.productName)}</td>
              <td className="px-4 py-2.5 text-sm text-gray-700 whitespace-nowrap">{formatShortDate(row.endsAt)}</td>
              <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 whitespace-nowrap">
                {row.currency} {Number(row.amount).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReminderStatusPanel({ stats, loading }: { stats: ReminderStats | null; loading: boolean }) {
  const successRate =
    stats && stats.total > 0
      ? (((stats.sent) / stats.total) * 100).toFixed(1)
      : null;
  const rateNum = successRate ? parseFloat(successRate) : 100;
  const rateColor = rateNum >= 95 ? "#24A37D" : rateNum >= 80 ? "#f59e0b" : "#dc2626";
  const pending = stats ? stats.total - stats.sent - stats.failed - stats.skipped : 0;

  const rows = [
    { label: "Sent",    value: stats?.sent    ?? 0, color: "#24A37D", icon: "✓" },
    { label: "Pending", value: Math.max(0, pending), color: "#6366f1", icon: "◷" },
    { label: "Failed",  value: stats?.failed  ?? 0, color: "#dc2626", icon: "⚠" },
    { label: "Skipped", value: stats?.skipped ?? 0, color: "#9ca3af", icon: "⊘" },
  ];

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Reminder Status</p>
        {stats && (
          <span className="text-xs text-gray-400">Last 30 days</span>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm" style={{ color: row.color }}>{row.icon}</span>
                  <span className="text-sm text-gray-600">{row.label}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums" style={{ color: row.color === "#9ca3af" ? "#6b7280" : row.color }}>
                  {row.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Success Rate</span>
              <span className="text-sm font-bold tabular-nums" style={{ color: rateColor }}>
                {successRate ?? "—"}%
              </span>
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: 5, backgroundColor: "#e5e7eb" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${successRate ?? 0}%`, backgroundColor: rateColor }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ActivityIcon({ action }: { action: string }) {
  const color = actionColor(action);
  if (action.includes("CREAT") || action.includes("ADD") || action.includes("ASSIGN")) {
    return (
      <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: "#dcfce7" }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </div>
    );
  }
  if (action.includes("DELET") || action.includes("CANCEL") || action.includes("ARCHIV")) {
    return (
      <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: "#fee2e2" }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: "#f3f4f6" }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
      </svg>
    </div>
  );
}

function RecentActivity({ logs, loading }: { logs: AuditLog[]; loading: boolean }) {
  if (loading) return <Spinner />;
  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400 rounded-lg" style={{ border: "1px solid var(--border)" }}>
        No recent activity.
      </div>
    );
  }
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="divide-y" style={{ "--tw-divide-opacity": 1 } as React.CSSProperties}>
        {logs.map((log, i) => (
          <div
            key={log.id}
            className="flex items-start gap-3 px-4 py-3 hover:bg-md-primary/5 transition-colors"
            style={{ animation: "fade-in 0.15s ease-out both", animationDelay: `${i * 15}ms`, borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
          >
            <ActivityIcon action={log.action} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-800">
                <span className="font-medium">{log.actorEmail}</span>{" "}
                <span className="text-gray-500">{prettyAction(log.action)} {prettyResource(log.resourceType)}</span>
                {log.resourceId && (
                  <span className="text-gray-400 text-xs ml-1">#{log.resourceId}</span>
                )}
              </p>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0 mt-0.5 tabular-nums">{relativeTime(log.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  const [summary, setSummary] = useState<TenantSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueTotals | null>(null);
  const [upcoming, setUpcoming] = useState<ApiUpcoming[]>([]);
  const [reminderStats, setReminderStats] = useState<ReminderStats | null>(null);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === "SUPER_ADMIN") {
      router.replace("/admin/dashboard");
    }
  }, [user, router]);

  useEffect(() => {
    if (!token || !user || user.role === "SUPER_ADMIN") return;
    const tid = user.tenantId;
    if (!tid) return;

    Promise.allSettled([
      apiGet<TenantSummary>(`/api/v1/tenants/${tid}/dashboard/summary`, token),
      apiGet<RevenueTotals>(`/api/v1/tenants/${tid}/dashboard/revenue`, token),
      apiGet<ApiUpcoming[]>(`/api/v1/tenants/${tid}/dashboard/upcoming-reminders`, token),
      apiGet<ReminderStats>(`/api/v1/tenants/${tid}/dashboard/reminders`, token),
      apiGet<AuditLog[]>(`/api/v1/tenants/${tid}/dashboard/recent-activity`, token),
      apiGet<OverduePlan[]>(`/api/v1/tenants/${tid}/dashboard/overdue`, token),
    ]).then(([sum, rev, upcomingRes, statsRes, logsRes, overdueRes]) => {
      if (sum.status === "fulfilled") setSummary(sum.value);
      if (rev.status === "fulfilled") setRevenue(rev.value);
      if (upcomingRes.status === "fulfilled") setUpcoming(upcomingRes.value);
      if (statsRes.status === "fulfilled") setReminderStats(statsRes.value);
      if (logsRes.status === "fulfilled") setActivity(logsRes.value);
      if (overdueRes.status === "fulfilled") setOverdueCount(overdueRes.value.length);
    }).finally(() => setLoading(false));
  }, [token, user]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const mrrAmount  = revenue?.totals?.[0] ? Number(revenue.totals[0].totalAmount) : 0;
  const mrrCurrency = revenue?.totals?.[0]?.currency ?? "USD";

  const customerVal = useCountUp(!loading && summary ? summary.totalCustomers : 0);
  const activeVal   = useCountUp(!loading && summary ? summary.activePlans : 0);
  const overdueVal  = useCountUp(!loading ? overdueCount : 0);
  const revenueVal  = useCountUp(!loading ? mrrAmount : 0);

  return (
    <div
      className="font-sans px-6 py-8 md:px-10 md:py-10 max-w-6xl mx-auto space-y-8"
      style={{ animation: "fade-in-up 0.2s ease-out both" }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{dateStr}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Customers"
          value={loading ? "—" : customerVal.toLocaleString()}
          sub={summary ? `${summary.totalProducts} products` : undefined}
          delay={0}
        />
        <StatCard
          label="Active Subscriptions"
          value={loading ? "—" : activeVal.toLocaleString()}
          sub={summary ? `${summary.pausedPlans} paused` : undefined}
          accent="#24A37D"
          delay={40}
        />
        <StatCard
          label="Overdue / Expired"
          value={loading ? "—" : overdueVal.toLocaleString()}
          sub={overdueCount > 0 ? "needs attention" : "all clear"}
          accent={overdueCount > 0 ? "#dc2626" : "#24A37D"}
          delay={80}
        />
        <StatCard
          label="Revenue This Month"
          value={loading ? "—" : `${mrrCurrency} ${revenueVal.toLocaleString()}`}
          sub={revenue?.totals?.[0] ? `${revenue.totals[0].planCount} active plans` : undefined}
          accent="#111827"
          delay={120}
        />
      </div>

      {/* Middle row: Upcoming Renewals + Reminder Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Renewals */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Upcoming Renewals</h2>
              <p className="text-xs text-gray-500 mt-0.5">Subscriptions renewing this week</p>
            </div>
            {!loading && upcoming.length > 0 && (
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "#fff3cd", color: "#92400e" }}
              >
                {upcoming.length} due
              </span>
            )}
          </div>
          <RenewalTable rows={upcoming} loading={loading} />
        </div>

        {/* Reminder Status */}
        <div className="lg:col-span-1">
          <div className="mb-3">
            <h2 className="text-base font-bold text-gray-900">Reminder Status</h2>
            <p className="text-xs text-gray-500 mt-0.5">Delivery overview</p>
          </div>
          <ReminderStatusPanel stats={reminderStats} loading={loading} />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">Recent Activity</h2>
          <p className="text-xs text-gray-500 mt-0.5">Latest actions in your account</p>
        </div>
        <RecentActivity logs={activity} loading={loading} />
      </div>
    </div>
  );
}
