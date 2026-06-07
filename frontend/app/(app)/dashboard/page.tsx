"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
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
      const next = Math.max(60, startW + (e.clientX - startX));
      setWidths((prev) => prev.map((w, i) => (i === col ? next : w)));
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

type UpcomingRow = {
  id: number;
  customer: string;
  plan: string;
  currency: string;
  amount: number;
  endDate: string;
};

type ReminderRow = {
  id: number;
  customer: string;
  daysBeforeExpiry: number | null;
  result: string;
  sentAt: string;
  product: string;
};

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

type ApiReminder = {
  id: number;
  customerName: string;
  productName: string;
  status: string;
  daysBeforeExpiry: number | null;
  sentAt: string | null;
  createdAt: string;
};

type ApiReminderPage = { content: ApiReminder[] };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    "Expiring Soon": { bg: "#e8a020", color: "#000000" },
    Active:          { bg: "#24A37D", color: "#ffffff" },
    Paused:          { bg: "#9ca3af", color: "#ffffff" },
    Cancelled:       { bg: "#dc2626", color: "#ffffff" },
    Expired:         { bg: "#374151", color: "#ffffff" },
  };
  const s = map[status] ?? { bg: "#9ca3af", color: "#ffffff" };
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-sm text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

function DaysBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-xs text-gray-400">—</span>;
  const map: Record<number, { bg: string; color: string; label: string }> = {
    7:  { bg: "#386AF5", color: "#ffffff", label: "7-day" },
    3:  { bg: "#EF5F00", color: "#ffffff", label: "3-day" },
    1:  { bg: "#e8a020", color: "#000000", label: "1-day" },
    0:  { bg: "#1f2937", color: "#ffffff", label: "Expiry" },
  };
  const s = map[days] ?? { bg: "#6b7280", color: "#fff", label: `${days}d` };
  return (
    <span className="inline-flex items-center justify-center w-12 py-1 rounded-sm text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

function ResultBadge({ result }: { result: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    SENT:    { bg: "#24A37D", color: "#ffffff" },
    SKIPPED: { bg: "#9ca3af", color: "#ffffff" },
    FAILED:  { bg: "#dc2626", color: "#ffffff" },
  };
  const s = map[result] ?? { bg: "#9ca3af", color: "#ffffff" };
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-sm text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
      {result}
    </span>
  );
}

function SortIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline ml-1.5 opacity-40">
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  );
}

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div onMouseDown={onMouseDown} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-pink-200 transition-colors" />
  );
}

const expiringHeaders: { label: string; sortable?: boolean }[] = [
  { label: "Subscription"             },
  { label: "Customer",  sortable: true },
  { label: "Plan",      sortable: true },
  { label: "Status"                   },
  { label: "End Date",  sortable: true },
  { label: "Price"                    },
  { label: ""                         },
];

function ExpiringTable({ rows }: { rows: UpcomingRow[] }) {
  const cols = [112, 160, 176, 144, 112, 96, 40];
  const { widths, onMouseDown } = useColumnResize(cols);

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400 rounded-lg" style={{ border: "1px solid var(--border)" }}>
        No upcoming expirations.
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="overflow-x-auto">
        <table style={{ tableLayout: "fixed", width: "100%", minWidth: widths.reduce((a, b) => a + b, 0) }}>
          <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          <thead>
            <tr style={{ backgroundColor: "var(--bg-card)" }}>
              {expiringHeaders.map((h, i) => (
                <th key={i} className="relative text-left px-4 py-3 text-sm font-semibold text-gray-700 select-none overflow-hidden">
                  <span className="truncate flex items-center pr-2">{h.label}{h.sortable && <SortIcon />}</span>
                  {i < expiringHeaders.length - 1 && <ResizeHandle onMouseDown={(e) => onMouseDown(i, e)} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className="bg-[#fef7fa] hover:bg-[#fdf2f8] transition-colors" style={{ borderTop: "1px solid var(--border)", animation: "fade-in 0.15s ease-out both", animationDelay: `${80 + i * 25}ms` }}>
                <td className="px-4 py-3 text-sm font-medium text-gray-700 truncate overflow-hidden">#{row.id}</td>
                <td className="px-4 py-3 text-sm text-gray-900 truncate overflow-hidden">{row.customer}</td>
                <td className="px-4 py-3 text-sm text-gray-700 truncate overflow-hidden">{row.plan}</td>
                <td className="px-4 py-3 overflow-hidden"><StatusBadge status="Expiring Soon" /></td>
                <td className="px-4 py-3 text-sm text-gray-700 truncate overflow-hidden">{row.endDate}</td>
                <td className="px-4 py-3 text-sm text-gray-700 truncate overflow-hidden">{row.currency} {Number(row.amount).toLocaleString()}</td>
                <td className="px-4 py-3 text-sm text-gray-400 text-center">
                  <button className="hover:text-gray-600">···</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const reminderHeaders: { label: string; sortable?: boolean }[] = [
  { label: "Customer",  sortable: true },
  { label: "Milestone"                },
  { label: "Result"                   },
  { label: "Sent At",   sortable: true },
  { label: "Plan"                     },
];

function ReminderTable({ rows }: { rows: ReminderRow[] }) {
  const cols = [144, 112, 96, 176, 220];
  const { widths, onMouseDown } = useColumnResize(cols);

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-gray-400 rounded-lg" style={{ border: "1px solid var(--border)" }}>
        No reminder history.
      </div>
    );
  }

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="overflow-x-auto">
        <table style={{ tableLayout: "fixed", width: "100%", minWidth: widths.reduce((a, b) => a + b, 0) }}>
          <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          <thead>
            <tr style={{ backgroundColor: "var(--bg-card)" }}>
              {reminderHeaders.map((h, i) => (
                <th key={i} className="relative text-left px-4 py-3 text-sm font-semibold text-gray-700 select-none overflow-hidden">
                  <span className="truncate flex items-center pr-2">{h.label}{h.sortable && <SortIcon />}</span>
                  {i < reminderHeaders.length - 1 && <ResizeHandle onMouseDown={(e) => onMouseDown(i, e)} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} className="bg-[#fef7fa] hover:bg-[#fdf2f8] transition-colors" style={{ borderTop: "1px solid var(--border)", animation: "fade-in 0.15s ease-out both", animationDelay: `${80 + i * 20}ms` }}>
                <td className="px-4 py-3 text-sm text-gray-900 truncate overflow-hidden">{row.customer}</td>
                <td className="px-4 py-3 overflow-hidden"><DaysBadge days={row.daysBeforeExpiry} /></td>
                <td className="px-4 py-3 overflow-hidden"><ResultBadge result={row.result} /></td>
                <td className="px-4 py-3 text-sm text-gray-700 truncate overflow-hidden">{row.sentAt}</td>
                <td className="px-4 py-3 text-sm text-gray-500 truncate overflow-hidden">{row.product}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SearchInput({ placeholder, className = "" }: { placeholder: string; className?: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className={`relative ${className}`} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input type="text" placeholder={placeholder} readOnly
        className="text-sm pl-9 pr-4 py-2 rounded-lg outline-none w-full transition-colors"
        style={{ border: "1px solid var(--border)", backgroundColor: hovered ? "#e4dee1" : "var(--bg-search)", color: "#1a1a1a" }}
      />
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const router = useRouter();

  const [summary, setSummary] = useState<TenantSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueTotals | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingRow[]>([]);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
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

    Promise.all([
      apiGet<TenantSummary>(`/api/v1/tenants/${tid}/dashboard/summary`, token),
      apiGet<RevenueTotals>(`/api/v1/tenants/${tid}/dashboard/revenue`, token),
      apiGet<ApiUpcoming[]>(`/api/v1/tenants/${tid}/dashboard/upcoming-reminders`, token),
      apiGet<ApiReminderPage>(`/api/v1/tenants/${tid}/reminders?size=20&sort=createdAt,desc`, token),
    ])
      .then(([sum, rev, upcomingList, reminderPage]) => {
        setSummary(sum);
        setRevenue(rev);
        setUpcoming(
          upcomingList.map((u) => ({
            id: u.customerProductId,
            customer: u.customerName,
            plan: u.productName,
            currency: u.currency,
            amount: Number(u.amount),
            endDate: formatDate(u.endsAt),
          }))
        );
        setReminders(
          reminderPage.content.map((r) => ({
            id: r.id,
            customer: r.customerName,
            daysBeforeExpiry: r.daysBeforeExpiry,
            result: r.status,
            sentAt: r.sentAt ? formatDateTime(r.sentAt) : formatDateTime(r.createdAt),
            product: r.productName,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, user]);

  const today = new Date();
  const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const displayName = user?.fullName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

  const mrrAmount = revenue?.totals?.[0] ? Number(revenue.totals[0].totalAmount) : 0;
  const mrrCurrency = revenue?.totals?.[0]?.currency ?? "USD";

  const mrrVal   = useCountUp(!loading ? mrrAmount : 0);
  const subVal   = useCountUp(!loading && summary ? summary.activePlans : 0);
  const expVal   = useCountUp(!loading ? upcoming.length : 0);
  const remVal   = useCountUp(!loading ? reminders.filter((r) => r.result === "SENT").length : 0);

  return (
    <div className="font-sans px-6 py-8 md:px-12 md:py-10 max-w-6xl mx-auto" style={{ animation: "fade-in-up 0.2s ease-out both" }}>
      <div className="mb-8 border-l-4 pl-5 py-1" style={{ borderColor: "var(--primary)" }}>
        <p className="text-sm mb-1" style={{ color: "var(--primary)" }}>{greeting}, {displayName}</p>
        <h1 className="text-3xl font-bold" style={{ color: "#212529" }}>Today is {dateStr}.</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {([
          { label: "MRR",                  display: loading ? "—" : `${mrrCurrency} ${mrrVal.toLocaleString()}` },
          { label: "Active Subscriptions", display: loading ? "—" : String(subVal)  },
          { label: "Expiring This Week",   display: loading ? "—" : String(expVal)  },
          { label: "Reminders Sent",       display: loading ? "—" : String(remVal)  },
        ] as const).map((card, i) => (
          <div key={card.label} className="rounded-lg p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", animation: "fade-in-up 0.2s ease-out both", animationDelay: `${i * 35}ms` }}>
            <p className="text-sm mb-3" style={{ color: "#6c757d" }}>{card.label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: "#212529" }}>{card.display}</p>
          </div>
        ))}
      </div>

      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Expiring Soon</h2>
            <p className="text-sm text-gray-500 mt-0.5">Subscriptions ending in the next 7 days</p>
          </div>
          <SearchInput placeholder="Search subscriptions..." className="w-full md:w-56 flex-shrink-0" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <svg className="animate-spin mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Loading…
          </div>
        ) : (
          <ExpiringTable rows={upcoming} />
        )}
      </div>

      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold text-gray-900">Reminder History</h2>
          <SearchInput placeholder="Search" className="w-full md:w-44" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-gray-400">
            <svg className="animate-spin mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Loading…
          </div>
        ) : (
          <ReminderTable rows={reminders} />
        )}
      </div>
    </div>
  );
}
