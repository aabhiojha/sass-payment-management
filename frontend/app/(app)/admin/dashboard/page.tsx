"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { apiGet } from "@/lib/api";

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

function useColumnResize(initialWidths: number[]) {
  const [widths, setWidths] = useState(initialWidths);
  const dragging = useRef<{ col: number; startX: number; startW: number } | null>(null);
  const onMouseDown = useCallback((col: number, e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = { col, startX: e.clientX, startW: widths[col] };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const { col, startX, startW } = dragging.current;
      setWidths((p) => p.map((w, i) => (i === col ? Math.max(60, startW + (e.clientX - startX)) : w)));
    };
    const onUp = () => {
      dragging.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [widths]);
  return { widths, onMouseDown };
}

type TenantRow = {
  id: number;
  name: string;
  plan: string | null;
  status: string;
  joined: string;
};

type AdminSummary = {
  tenants: {
    active: number;
    suspended: number;
    archived: number;
    newThisWeek: number;
    expiringThisWeek: number;
  };
  users: {
    totalUsers: number;
    activeUsers: number;
  };
  remainders: {
    sent: number;
    failed: number;
    skipped: number;
    pending: number;
    overdue: number;
    failureRate: number;
  };
};

type ApiTenantPage = {
  content: {
    id: number;
    name: string;
    status: string;
    createdAt: string;
    activePlan: { planName: string; effectivePrice: number; currency: string; billingCadence: string } | null;
  }[];
};

type ApiPlan = { id: number; name: string; status: string };

const PLAN_COLORS = ["#6750A4", "#7D5260", "#2563eb", "#059669", "#f59e0b", "#79747E"];

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
      <p className="text-2xl font-bold tabular-nums leading-tight" style={{ color: accent ?? "#111827" }}>
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    ACTIVE:    { bg: "#24A37D", color: "#fff" },
    SUSPENDED: { bg: "#e8a020", color: "#000" },
    ARCHIVED:  { bg: "#6b7280", color: "#fff" },
  };
  const s = map[status] ?? { bg: "#9ca3af", color: "#fff" };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function SortIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline ml-1.5 opacity-40">
      <path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" />
    </svg>
  );
}

const headers: { label: string; sortable?: boolean }[] = [
  { label: "Tenant",  sortable: true },
  { label: "Plan",    sortable: true },
  { label: "Status" },
  { label: "Joined",  sortable: true },
  { label: "" },
];

function TenantsTable({ rows, loading }: { rows: TenantRow[]; loading: boolean }) {
  const cols = [200, 180, 110, 130, 40];
  const { widths, onMouseDown } = useColumnResize(cols);

  if (loading) return <Spinner />;
  if (rows.length === 0) return (
    <div className="flex items-center justify-center py-10 text-sm text-gray-400 rounded-lg" style={{ border: "1px solid var(--border)" }}>
      No tenants yet.
    </div>
  );

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="overflow-x-auto">
        <table style={{ tableLayout: "fixed", width: "100%", minWidth: widths.reduce((a, b) => a + b, 0) }}>
          <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          <thead>
            <tr style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
              {headers.map((h, i) => (
                <th key={i} className="relative text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide select-none overflow-hidden">
                  <span className="truncate flex items-center pr-2">{h.label}{h.sortable && <SortIcon />}</span>
                  {i < headers.length - 1 && (
                    <div onMouseDown={(e) => onMouseDown(i, e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-md-primary/20 transition-colors" />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className="hover:bg-md-primary/5 transition-colors" style={{ borderTop: "1px solid var(--border)", animation: "fade-in 0.15s ease-out both", animationDelay: `${i * 15}ms` }}>
                <td className="px-4 py-2.5 text-sm font-semibold text-gray-900 truncate">{row.name}</td>
                <td className="px-4 py-2.5 text-sm text-gray-700 truncate">{row.plan ?? <span className="italic text-gray-400">No plan</span>}</td>
                <td className="px-4 py-2.5"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-2.5 text-sm text-gray-500 truncate">{row.joined}</td>
                <td className="px-4 py-2.5 text-sm text-gray-400 text-center">
                  <button className="hover:text-gray-700">···</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [recentRows, setRecentRows] = useState<TenantRow[]>([]);
  const [planBars, setPlanBars] = useState<{ name: string; tenants: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiryDismissed, setExpiryDismissed] = useState(false);

  useEffect(() => {
    if (user && user.role !== "SUPER_ADMIN") router.replace("/dashboard");
  }, [user, router]);

  useEffect(() => {
    if (!token || !user || user.role !== "SUPER_ADMIN") return;

    Promise.all([
      apiGet<AdminSummary>("/api/v1/admin/dashboard/summary", token),
      apiGet<ApiTenantPage>("/api/v1/tenants?size=100&sort=createdAt,desc", token),
      apiGet<ApiPlan[]>("/api/v1/platform-plans", token),
    ])
      .then(([sum, tenantPage, plans]) => {
        setSummary(sum);

        setRecentRows(tenantPage.content.slice(0, 5).map((t) => ({
          id: t.id,
          name: t.name,
          plan: t.activePlan?.planName ?? null,
          status: t.status,
          joined: new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        })));

        const planCountMap: Record<string, number> = {};
        tenantPage.content.forEach((t) => {
          if (t.activePlan?.planName) planCountMap[t.activePlan.planName] = (planCountMap[t.activePlan.planName] ?? 0) + 1;
        });
        setPlanBars(
          plans
            .filter((p) => p.status === "ACTIVE")
            .map((p, i) => ({ name: p.name, tenants: planCountMap[p.name] ?? 0, color: PLAN_COLORS[i % PLAN_COLORS.length] }))
            .filter((b) => b.tenants > 0)
            .sort((a, b) => b.tenants - a.tenants)
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, user]);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const displayName = user?.fullName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "Admin";

  const totalTenants   = useCountUp(!loading && summary ? summary.tenants.active + summary.tenants.suspended + summary.tenants.archived : 0);
  const activeTenants  = useCountUp(!loading && summary ? summary.tenants.active : 0);
  const suspendedCount = useCountUp(!loading && summary ? summary.tenants.suspended : 0);
  const newThisWeek    = useCountUp(!loading && summary ? summary.tenants.newThisWeek : 0);
  const totalUsers     = useCountUp(!loading && summary ? summary.users.totalUsers : 0);
  const activeUsers    = useCountUp(!loading && summary ? summary.users.activeUsers : 0);
  const remindersSent  = useCountUp(!loading && summary ? summary.remainders.sent : 0);
  const remindersFailed = useCountUp(!loading && summary ? summary.remainders.failed : 0);

  const tenantTotal = planBars.reduce((s, p) => s + p.tenants, 0);

  if (!user || user.role !== "SUPER_ADMIN") return null;

  return (
    <div className="font-sans px-6 py-8 md:px-10 md:py-10 max-w-6xl mx-auto space-y-8" style={{ animation: "fade-in-up 0.2s ease-out both" }}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">{greeting}, {displayName} · {dateStr}</p>
        </div>
      </div>

      {/* Expiry warning */}
      {!loading && summary && summary.tenants.expiringThisWeek > 0 && !expiryDismissed && (
        <div className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium" style={{ backgroundColor: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", animation: "fade-in 0.2s ease-out both" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="flex-1">
            <strong>{summary.tenants.expiringThisWeek}</strong> platform plan subscription{summary.tenants.expiringThisWeek !== 1 ? "s" : ""} expiring within the next 7 days.
          </span>
          <button onClick={() => setExpiryDismissed(true)} className="flex-shrink-0 rounded p-0.5 transition-colors hover:bg-orange-200" aria-label="Dismiss">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Tenants stat cards */}
      <div>
        <div className="mb-3">
          <h2 className="text-base font-bold text-gray-900">Tenants</h2>
          <p className="text-xs text-gray-500 mt-0.5">Platform-wide tenant overview</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total"         value={loading ? "—" : String(totalTenants)}   sub="all time"          delay={0}   />
          <StatCard label="Active"        value={loading ? "—" : String(activeTenants)}  sub="currently active"  delay={40}  accent="#24A37D" />
          <StatCard label="Suspended"     value={loading ? "—" : String(suspendedCount)} sub="needs attention"   delay={80}  accent={!loading && summary && summary.tenants.suspended > 0 ? "#e8a020" : undefined} />
          <StatCard label="New This Week" value={loading ? "—" : String(newThisWeek)}    sub="recently joined"   delay={120} />
        </div>
      </div>

      {/* Tenants table + Reminders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Recent Tenants</h2>
              <p className="text-xs text-gray-500 mt-0.5">Latest 5 onboarded tenants</p>
            </div>
            <Link href="/tenants" className="text-xs font-semibold transition-colors" style={{ color: "var(--primary)" }}>
              View all →
            </Link>
          </div>
          <TenantsTable rows={recentRows} loading={loading} />
        </div>

        {/* Reminders */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Reminder Status</h2>
            <p className="text-xs text-gray-500 mt-0.5">Delivery overview</p>
          </div>
          <div className="rounded-xl p-5 flex flex-col gap-4" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {loading ? <Spinner /> : (
              <>
                <div className="space-y-3">
                  {[
                    { label: "Sent",    value: remindersSent,                                  color: "#24A37D", icon: "✓" },
                    { label: "Pending", value: summary?.remainders.pending ?? 0,               color: "#6366f1", icon: "◷" },
                    { label: "Failed",  value: remindersFailed,                                color: "#dc2626", icon: "⚠" },
                    { label: "Skipped", value: summary?.remainders.skipped ?? 0,               color: "#9ca3af", icon: "⊘" },
                  ].map((row) => (
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
                {summary && (
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-500">Failure Rate</span>
                      <span className="text-sm font-bold tabular-nums" style={{ color: summary.remainders.failureRate > 5 ? "#ef4444" : "#24A37D" }}>
                        {summary.remainders.failureRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full rounded-full overflow-hidden" style={{ height: 5, backgroundColor: "#e5e7eb" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(summary.remainders.failureRate, 100)}%`, backgroundColor: summary.remainders.failureRate > 5 ? "#ef4444" : "#24A37D" }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Users */}
      <div>
        <div className="mb-3">
          <h2 className="text-base font-bold text-gray-900">Users</h2>
          <p className="text-xs text-gray-500 mt-0.5">Across all tenants</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total"       value={loading ? "—" : String(totalUsers)}   sub="across all tenants" delay={0}   />
          <StatCard label="Active"      value={loading ? "—" : String(activeUsers)}  sub="currently active"   delay={40}  accent="#24A37D" />
          <StatCard label="Inactive"    value={loading ? "—" : (!loading && summary ? String(summary.users.totalUsers - summary.users.activeUsers) : "—")} sub="not yet active" delay={80} />
          <StatCard
            label="Active Rate"
            value={loading ? "—" : (!loading && summary && summary.users.totalUsers > 0 ? `${Math.round((summary.users.activeUsers / summary.users.totalUsers) * 100)}%` : "—")}
            sub="of all users"
            delay={120}
          />
        </div>
      </div>

      {/* Plan distribution */}
      {!loading && planBars.length > 0 && (
        <div>
          <div className="mb-3">
            <h2 className="text-base font-bold text-gray-900">Plan Distribution</h2>
            <p className="text-xs text-gray-500 mt-0.5">Active tenants by platform plan</p>
          </div>
          <div className="rounded-xl p-5 flex flex-col gap-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {planBars.map((b) => (
              <div key={b.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-700">{b.name}</span>
                  <span className="text-sm font-semibold tabular-nums text-gray-900">{b.tenants}</span>
                </div>
                <div className="w-full rounded-full overflow-hidden" style={{ height: 6, backgroundColor: "#e5e7eb" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: tenantTotal > 0 ? `${(b.tenants / tenantTotal) * 100}%` : "0%", backgroundColor: b.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <div className="mb-3">
          <h2 className="text-base font-bold text-gray-900">Quick Actions</h2>
          <p className="text-xs text-gray-500 mt-0.5">Common admin tasks</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Create Tenant", href: "/tenants",        icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="20" height="20"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21c0-1.8638 0-2.7956-.3045-3.5307a4 4 0 0 0-2.1648-2.1648C13.7956 15 12.8638 15 11 15H8c-1.8638 0-2.7957 0-3.5307.3045a4 4 0 0 0-2.1648 2.1648C2 18.2044 2 19.1362 2 21M13.5 7c0 2.2091-1.7909 4-4 4s-4-1.7909-4-4 1.7909-4 4-4 4 1.7909 4 4m12 0v6m-3-3h6" /></svg> },
            { label: "Create Plan",   href: "/platform-plans", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="20" height="20"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> },
            { label: "All Tenants",   href: "/tenants",        icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="20" height="20"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M22 21v-2c0-1.8638-1.2748-3.4299-3-3.874M15.5 3.2908C16.9659 3.8842 18 5.3213 18 7s-1.0341 3.1159-2.5 3.7092M17 21c0-1.8638 0-2.7956-.3045-3.5307a4 4 0 0 0-2.1648-2.1648C13.7956 15 12.8638 15 11 15H8c-1.8638 0-2.7957 0-3.5307.3045a4 4 0 0 0-2.1648 2.1648C2 18.2044 2 19.1362 2 21M13.5 7c0 2.2091-1.7909 4-4 4s-4-1.7909-4-4 1.7909-4 4-4 4 1.7909 4 4" /></svg> },
            { label: "Audit Log",     href: "/audit-log",      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="20" height="20"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m12.7076 18.3639-1.4143 1.4142c-1.9526 1.9527-5.1184 1.9527-7.071 0-1.9526-1.9526-1.9526-5.1184 0-7.071l1.4142-1.4142m12.7279 1.4142 1.4142-1.4142c1.9526-1.9527 1.9526-5.1185 0-7.0711s-5.1184-1.9526-7.071 0L11.2933 5.636m-2.7928 9.8639 7-7" /></svg> },
          ].map((a) => (
            <Link key={a.label} href={a.href}
              className="flex flex-col items-center gap-2.5 p-4 rounded-xl text-center text-sm font-semibold transition-all hover:opacity-80"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", color: "#4b4b4b" }}
            >
              <span style={{ color: "var(--primary)" }}>{a.icon}</span>
              {a.label}
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
