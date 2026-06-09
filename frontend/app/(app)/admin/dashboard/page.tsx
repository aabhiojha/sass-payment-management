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

type PlanBar = {
  name: string;
  tenants: number;
  color: string;
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

const PLAN_COLORS = ["#DC4D96", "#7c3aed", "#2563eb", "#059669", "#f59e0b", "#6b7280"];

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
  { label: "ID"                    },
  { label: "Tenant",  sortable: true },
  { label: "Plan",    sortable: true },
  { label: "Status"                },
  { label: "Joined",  sortable: true },
  { label: ""                      },
];

function TenantsTable({ rows }: { rows: TenantRow[] }) {
  const cols = [80, 180, 160, 110, 130, 40];
  const { widths, onMouseDown } = useColumnResize(cols);
  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="overflow-x-auto">
        <table style={{ tableLayout: "fixed", width: "100%", minWidth: widths.reduce((a, b) => a + b, 0) }}>
          <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          <thead>
            <tr style={{ backgroundColor: "var(--bg-card)" }}>
              {headers.map((h, i) => (
                <th key={i} className="relative text-left px-4 py-3 text-sm font-semibold text-gray-700 select-none overflow-hidden">
                  <span className="truncate flex items-center pr-2">{h.label}{h.sortable && <SortIcon />}</span>
                  {i < headers.length - 1 && (
                    <div onMouseDown={(e) => onMouseDown(i, e)} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-pink-200 transition-colors" />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className="bg-[#f8faf8] hover:bg-[#eef3ee] transition-colors" style={{ borderTop: "1px solid var(--border)", animation: "fade-in 0.15s ease-out both", animationDelay: `${i * 15}ms` }}>
                <td className="px-4 py-3 text-sm font-medium text-gray-500 truncate">#{row.id}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 truncate">{row.name}</td>
                <td className="px-4 py-3 text-sm text-gray-700 truncate">{row.plan ?? <span className="italic text-gray-400">No plan</span>}</td>
                <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-sm text-gray-500 truncate">{row.joined}</td>
                <td className="px-4 py-3 text-sm text-gray-400 text-center">
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
  const [planBars, setPlanBars] = useState<PlanBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [expiryDismissed, setExpiryDismissed] = useState(false);

  useEffect(() => {
    if (user && user.role !== "SUPER_ADMIN") {
      router.replace("/dashboard");
    }
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

        const recent: TenantRow[] = tenantPage.content.slice(0, 5).map((t) => ({
          id: t.id,
          name: t.name,
          plan: t.activePlan?.planName ?? null,
          status: t.status,
          joined: new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        }));
        setRecentRows(recent);

        const planCountMap: Record<string, number> = {};
        tenantPage.content.forEach((t) => {
          if (t.activePlan?.planName) {
            planCountMap[t.activePlan.planName] = (planCountMap[t.activePlan.planName] ?? 0) + 1;
          }
        });

        const bars: PlanBar[] = plans
          .filter((p) => p.status === "ACTIVE")
          .map((p, i) => ({
            name: p.name,
            tenants: planCountMap[p.name] ?? 0,
            color: PLAN_COLORS[i % PLAN_COLORS.length],
          }))
          .filter((b) => b.tenants > 0)
          .sort((a, b) => b.tenants - a.tenants);
        setPlanBars(bars);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, user]);

  const today = new Date();
  const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const displayName = user?.fullName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "Admin";

  const totalTenants    = useCountUp(!loading && summary ? summary.tenants.active + summary.tenants.suspended + summary.tenants.archived : 0);
  const activeTenants   = useCountUp(!loading && summary ? summary.tenants.active : 0);
  const suspendedCount  = useCountUp(!loading && summary ? summary.tenants.suspended : 0);
  const newThisWeek     = useCountUp(!loading && summary ? summary.tenants.newThisWeek : 0);
  const totalUsers      = useCountUp(!loading && summary ? summary.users.totalUsers : 0);
  const activeUsers     = useCountUp(!loading && summary ? summary.users.activeUsers : 0);
  const remindersSent   = useCountUp(!loading && summary ? summary.remainders.sent : 0);
  const remindersPending = useCountUp(!loading && summary ? summary.remainders.pending : 0);

  const tenantTotal = planBars.reduce((s, p) => s + p.tenants, 0);

  if (!user || user.role !== "SUPER_ADMIN") return null;

  return (
    <div className="font-sans px-6 py-8 md:px-12 md:py-10 max-w-6xl mx-auto" style={{ animation: "fade-in-up 0.2s ease-out both" }}>
      <div className="mb-8 border-l-4 pl-5 py-1" style={{ borderColor: "var(--primary)" }}>
        <p className="text-sm mb-1" style={{ color: "var(--primary)" }}>{greeting}, {displayName}</p>
        <h1 className="text-3xl font-bold" style={{ color: "#212529" }}>Platform Overview</h1>
        <p className="text-sm text-gray-400 mt-1">{dateStr} — Super Admin</p>
      </div>

      {!loading && summary && summary.tenants.expiringThisWeek > 0 && !expiryDismissed && (
        <div className="mb-6 flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium" style={{ backgroundColor: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", animation: "fade-in 0.2s ease-out both" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span className="flex-1"><strong>{summary.tenants.expiringThisWeek}</strong> platform plan subscription{summary.tenants.expiringThisWeek !== 1 ? "s" : ""} expiring within the next 7 days.</span>
          <button onClick={() => setExpiryDismissed(true)} className="flex-shrink-0 rounded p-0.5 transition-colors hover:bg-orange-200" aria-label="Dismiss">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Tenants */}
        <div className="lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--primary)" }}>Tenants</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Total",        value: loading ? "—" : String(totalTenants),   sub: "all time"         },
              { label: "Active",       value: loading ? "—" : String(activeTenants),  sub: "currently active" },
              { label: "Suspended",    value: loading ? "—" : String(suspendedCount), sub: "needs attention"  },
              { label: "New This Week",value: loading ? "—" : String(newThisWeek),    sub: "recently joined"  },
            ].map((c, i) => (
              <div key={c.label} className="rounded-lg px-4 py-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", animation: "fade-in-up 0.2s ease-out both", animationDelay: `${i * 30}ms` }}>
                <p className="text-xs mb-0.5" style={{ color: "#6c757d" }}>{c.label}</p>
                <p className="text-xl font-bold tabular-nums" style={{ color: "#212529" }}>{c.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{c.sub}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-400">Latest 5 onboarded tenants</p>
            <Link href="/tenants" className="text-xs font-semibold transition-colors" style={{ color: "var(--primary)" }}>
              View all →
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Loading…
            </div>
          ) : recentRows.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-400">No tenants yet.</div>
          ) : (
            <TenantsTable rows={recentRows} />
          )}
        </div>

        {/* Reminders */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--primary)" }}>Reminders</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Sent",    value: loading ? "—" : String(remindersSent),                                                                        sub: "all time"          },
              { label: "Failed",  value: loading ? "—" : (!loading && summary ? String(summary.remainders.failed)  : "—"),                             sub: "delivery errors"   },
              { label: "Skipped", value: loading ? "—" : (!loading && summary ? String(summary.remainders.skipped) : "—"),                             sub: "no active sub"     },
              { label: "Pending", value: loading ? "—" : String(remindersPending),                                                                     sub: "awaiting delivery" },
            ].map((c, i) => (
              <div key={c.label} className="rounded-lg px-4 py-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", animation: "fade-in-up 0.2s ease-out both", animationDelay: `${i * 30}ms` }}>
                <p className="text-xs mb-0.5" style={{ color: "#6c757d" }}>{c.label}</p>
                <p className="text-xl font-bold tabular-nums" style={{ color: "#212529" }}>{c.value}</p>
                <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{c.sub}</p>
              </div>
            ))}
          </div>
          {!loading && summary && (
            <div className="mt-3 rounded-lg px-4 py-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <p className="text-xs mb-1" style={{ color: "#6c757d" }}>Failure rate</p>
              <p className="text-xl font-bold tabular-nums" style={{ color: summary.remainders.failureRate > 5 ? "#ef4444" : "#24A37D" }}>
                {summary.remainders.failureRate.toFixed(1)}%
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>of all deliveries</p>
            </div>
          )}
        </div>
      </div>

      {/* Users */}
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--primary)" }}>Users</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",       value: loading ? "—" : String(totalUsers),                                                                                                          sub: "across all tenants" },
            { label: "Active",      value: loading ? "—" : String(activeUsers),                                                                                                         sub: "currently active"   },
            { label: "Inactive",    value: loading ? "—" : (!loading && summary ? String(summary.users.totalUsers - summary.users.activeUsers) : "—"),                                  sub: "not yet active"     },
            { label: "Active Rate", value: loading ? "—" : (!loading && summary && summary.users.totalUsers > 0 ? `${Math.round((summary.users.activeUsers / summary.users.totalUsers) * 100)}%` : "—"), sub: "of all users"       },
          ].map((c, i) => (
            <div key={c.label} className="rounded-lg px-4 py-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", animation: "fade-in-up 0.2s ease-out both", animationDelay: `${i * 30}ms` }}>
              <p className="text-xs mb-0.5" style={{ color: "#6c757d" }}>{c.label}</p>
              <p className="text-xl font-bold tabular-nums" style={{ color: "#212529" }}>{c.value}</p>
              <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{c.sub}</p>
            </div>
          ))}
        </div>
      </div>


      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Create Tenant",  href: "/tenants",        icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="20" height="20"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21c0-1.8638 0-2.7956-.3045-3.5307a4 4 0 0 0-2.1648-2.1648C13.7956 15 12.8638 15 11 15H8c-1.8638 0-2.7957 0-3.5307.3045a4 4 0 0 0-2.1648 2.1648C2 18.2044 2 19.1362 2 21M13.5 7c0 2.2091-1.7909 4-4 4s-4-1.7909-4-4 1.7909-4 4-4 4 1.7909 4 4m12 0v6m-3-3h6" /></svg> },
            { label: "Create Plan",    href: "/platform-plans", icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="20" height="20"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> },
            { label: "All Tenants",    href: "/tenants",        icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="20" height="20"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M22 21v-2c0-1.8638-1.2748-3.4299-3-3.874M15.5 3.2908C16.9659 3.8842 18 5.3213 18 7s-1.0341 3.1159-2.5 3.7092M17 21c0-1.8638 0-2.7956-.3045-3.5307a4 4 0 0 0-2.1648-2.1648C13.7956 15 12.8638 15 11 15H8c-1.8638 0-2.7957 0-3.5307.3045a4 4 0 0 0-2.1648 2.1648C2 18.2044 2 19.1362 2 21M13.5 7c0 2.2091-1.7909 4-4 4s-4-1.7909-4-4 1.7909-4 4-4 4 1.7909 4 4" /></svg> },
            { label: "Audit Log",      href: "/audit-log",      icon: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="20" height="20"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m12.7076 18.3639-1.4143 1.4142c-1.9526 1.9527-5.1184 1.9527-7.071 0-1.9526-1.9526-1.9526-5.1184 0-7.071l1.4142-1.4142m12.7279 1.4142 1.4142-1.4142c1.9526-1.9527 1.9526-5.1185 0-7.0711s-5.1184-1.9526-7.071 0L11.2933 5.636m-2.7928 9.8639 7-7" /></svg> },
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
