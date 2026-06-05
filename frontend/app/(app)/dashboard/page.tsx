"use client";

import React, { useCallback, useRef, useState } from "react";

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

function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const handleClick = () => {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 transition-colors text-left group"
    >
      {copied ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary)" }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-xs font-medium" style={{ color: "var(--primary)" }}>Copied!</span>
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-gray-400 group-hover:text-[--primary] transition-colors">
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          <span className="group-hover:text-[--primary] transition-colors">{email}</span>
        </>
      )}
    </button>
  );
}

const expiringSoon = [
  { id: "SUB-8", customer: "Hannah Abbott", plan: "Legacy Pro Plan", status: "Expiring Soon", endDate: "6/13/2026", price: "$380.00" },
  { id: "SUB-3", customer: "Marcus Reid",   plan: "Starter Monthly",  status: "Expiring Soon", endDate: "6/11/2026", price: "$49.00"  },
];

const reminderLog = [
  { customer: "Alice Johnson", milestone: "7-day",  result: "SENT",   sentAt: "5/1/2026, 2:45 PM",  recipient: "alex.smith@example.com"  },
  { customer: "Alice Johnson", milestone: "3-day",  result: "SENT",   sentAt: "5/4/2026, 4:00 PM",  recipient: "alex.smith@example.com"  },
  { customer: "Alice Johnson", milestone: "1-day",  result: "SENT",   sentAt: "5/6/2026, 2:15 PM",  recipient: "alex.smith@example.com"  },
  { customer: "Alice Johnson", milestone: "expiry", result: "SENT",   sentAt: "5/7/2026, 4:45 PM",  recipient: "alex.smith@example.com"  },
  { customer: "Alice Johnson", milestone: "7-day",  result: "FAILED", sentAt: "5/5/2026, 8:05 PM",  recipient: "jordan.b@techcorp.io"    },
];

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    "Expiring Soon": { bg: "#f59e0b", color: "#ffffff" },
    Active:          { bg: "#24A37D", color: "#ffffff" },
    Paused:          { bg: "#9ca3af", color: "#ffffff" },
    Cancelled:       { bg: "#dc2626", color: "#ffffff" },
    Expired:         { bg: "#374151", color: "#ffffff" },
  };
  const s = map[status] ?? { bg: "#9ca3af", color: "#ffffff" };
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

function MilestoneBadge({ milestone }: { milestone: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    "7-day":  { bg: "#386AF5", color: "#ffffff" },
    "3-day":  { bg: "#EF5F00", color: "#ffffff" },
    "1-day":  { bg: "#E79F1F", color: "#ffffff" },
    "expiry": { bg: "#1f2937", color: "#ffffff" },
  };
  const s = map[milestone] ?? { bg: "#6b7280", color: "#ffffff" };
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
      {milestone === "expiry" ? "Expiry" : milestone}
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
    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
      {result}
    </span>
  );
}

const ColIcon = {
  text: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" className="inline mr-1.5 opacity-60 flex-shrink-0">
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7c0-.9319 0-1.3978.1522-1.7654a2 2 0 0 1 1.0824-1.0824C5.6022 4 6.0681 4 7 4h10c.9319 0 1.3978 0 1.7654.1522.49.203.8794.5924 1.0824 1.0824C20 5.6022 20 6.0681 20 7M9 20h6M12 4v16" />
    </svg>
  ),
  status: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" className="inline mr-1.5 opacity-60 flex-shrink-0">
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 8h.01M2 5.2v4.4745c0 .4892 0 .7338.0553.964.049.204.1298.3991.2394.5781.1237.2018.2966.3748.6426.7207l7.6686 7.6686c1.188 1.188 1.7821 1.7821 2.467 2.0046a3 3 0 0 0 1.8541 0c.685-.2225 1.2791-.8166 2.4671-2.0046l2.2118-2.2118c1.188-1.188 1.7821-1.7821 2.0046-2.4671a3 3 0 0 0 0-1.8541c-.2225-.6849-.8166-1.279-2.0046-2.467l-7.6686-7.6686c-.3459-.346-.5189-.5189-.7207-.6426a2 2 0 0 0-.5781-.2394C10.4083 2 10.1637 2 9.6745 2H5.2c-1.1201 0-1.6802 0-2.108.218a2 2 0 0 0-.874.874C2 3.5198 2 4.08 2 5.2M8.5 8a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0" />
    </svg>
  ),
  date: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" className="inline mr-1.5 opacity-60 flex-shrink-0">
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10H3m13-8v4M8 2v4m-.2 16h8.4c1.6802 0 2.5202 0 3.162-.327a3 3 0 0 0 1.311-1.311C21 19.7202 21 18.8802 21 17.2V8.8c0-1.6802 0-2.5202-.327-3.162a3 3 0 0 0-1.311-1.311C18.7202 4 17.8802 4 16.2 4H7.8c-1.6802 0-2.5202 0-3.162.327a3 3 0 0 0-1.311 1.311C3 6.2798 3 7.1198 3 8.8v8.4c0 1.6802 0 2.5202.327 3.162a3 3 0 0 0 1.311 1.311C5.2798 22 6.1198 22 7.8 22" />
    </svg>
  ),
  price: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" className="inline mr-1.5 opacity-60 flex-shrink-0">
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m9.5 3-3 18m11-18-3 18m6-13h-17m16 8h-17" />
    </svg>
  ),
  email: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" className="inline mr-1.5 opacity-60 flex-shrink-0">
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m2 7 8.1649 5.7154c.6612.4629.9918.6943 1.3514.7839.3176.0792.6498.0792.9674 0 .3596-.0896.6902-.321 1.3514-.7839L22 7M6.8 20h10.4c1.6802 0 2.5202 0 3.162-.327a3 3 0 0 0 1.311-1.311C22 17.7202 22 16.8802 22 15.2V8.8c0-1.6802 0-2.5202-.327-3.162a3 3 0 0 0-1.311-1.311C19.7202 4 18.8802 4 17.2 4H6.8c-1.6802 0-2.5202 0-3.162.327a3 3 0 0 0-1.311 1.311C2 6.2798 2 7.1198 2 8.8v6.4c0 1.6802 0 2.5202.327 3.162a3 3 0 0 0 1.311 1.311C4.2798 20 5.1198 20 6.8 20" />
    </svg>
  ),
};

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
    <div
      onMouseDown={onMouseDown}
      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-pink-200 transition-colors"
    />
  );
}

const expiringHeaders: { label: string; icon?: React.ReactNode; sortable?: boolean }[] = [
  { label: "Subscription", icon: ColIcon.text },
  { label: "Customer",     icon: ColIcon.text,   sortable: true },
  { label: "Plan",         icon: ColIcon.text,   sortable: true },
  { label: "Status",       icon: ColIcon.status },
  { label: "End Date",     icon: ColIcon.date,   sortable: true },
  { label: "Price",        icon: ColIcon.price },
  { label: "" },
];

function ExpiringTable() {
  const cols = [112, 160, 176, 144, 112, 96, 40];
  const { widths, onMouseDown } = useColumnResize(cols);

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="overflow-x-auto">
        <table style={{ tableLayout: "fixed", width: "100%", minWidth: widths.reduce((a, b) => a + b, 0) }}>
          <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          <thead>
            <tr style={{ backgroundColor: "var(--bg-card)" }}>
              {expiringHeaders.map((h, i) => (
                <th key={i} className="relative text-left px-4 py-3 text-sm font-semibold text-gray-700 select-none overflow-hidden">
                  <span className="truncate flex items-center pr-2">{h.icon}{h.label}{h.sortable && <SortIcon />}</span>
                  {i < expiringHeaders.length - 1 && <ResizeHandle onMouseDown={(e) => onMouseDown(i, e)} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {expiringSoon.map((row) => (
              <tr key={row.id} style={{ borderTop: "1px solid var(--border)", backgroundColor: "#fef7fa" }}>
                <td className="px-4 py-3 text-sm font-medium text-gray-700 truncate overflow-hidden">{row.id}</td>
                <td className="px-4 py-3 text-sm text-gray-900 truncate overflow-hidden">{row.customer}</td>
                <td className="px-4 py-3 text-sm text-gray-700 truncate overflow-hidden">{row.plan}</td>
                <td className="px-4 py-3 overflow-hidden"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-sm text-gray-700 truncate overflow-hidden">{row.endDate}</td>
                <td className="px-4 py-3 text-sm text-gray-700 truncate overflow-hidden">{row.price}</td>
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

const reminderHeaders: { label: string; icon?: React.ReactNode; sortable?: boolean }[] = [
  { label: "Customer",  icon: ColIcon.text,   sortable: true },
  { label: "Milestone", icon: ColIcon.status },
  { label: "Result",    icon: ColIcon.status },
  { label: "Sent At",   icon: ColIcon.date,   sortable: true },
  { label: "Recipient", icon: ColIcon.email },
];

function ReminderTable() {
  const cols = [144, 112, 96, 176, 220];
  const { widths, onMouseDown } = useColumnResize(cols);

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="overflow-x-auto">
        <table style={{ tableLayout: "fixed", width: "100%", minWidth: widths.reduce((a, b) => a + b, 0) }}>
          <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          <thead>
            <tr style={{ backgroundColor: "var(--bg-card)" }}>
              {reminderHeaders.map((h, i) => (
                <th key={i} className="relative text-left px-4 py-3 text-sm font-semibold text-gray-700 select-none overflow-hidden">
                  <span className="truncate flex items-center pr-2">{h.icon}{h.label}{h.sortable && <SortIcon />}</span>
                  {i < reminderHeaders.length - 1 && <ResizeHandle onMouseDown={(e) => onMouseDown(i, e)} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reminderLog.map((row, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--border)", backgroundColor: "#fef7fa" }}>
                <td className="px-4 py-3 text-sm text-gray-900 truncate overflow-hidden">{row.customer}</td>
                <td className="px-4 py-3 overflow-hidden"><MilestoneBadge milestone={row.milestone} /></td>
                <td className="px-4 py-3 overflow-hidden"><ResultBadge result={row.result} /></td>
                <td className="px-4 py-3 text-sm text-gray-700 truncate overflow-hidden">{row.sentAt}</td>
                <td className="px-4 py-3 text-sm text-gray-500 overflow-hidden"><CopyEmail email={row.recipient} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const MRRIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="18" height="18">
    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 11v4m12-6v4m-1-9c2.4487 0 3.7731.3748 4.4321.6654.0878.0388.1317.0581.2583.179.0759.0724.2145.285.2501.3837.0595.1646.0595.2546.0595.4346v10.7484c0 .9088 0 1.3632-.1363 1.5968-.1386.2375-.2723.348-.5318.4393-.255.0897-.7699-.0092-1.7997-.2071A13.45 13.45 0 0 0 17 18c-3 0-6 2-10 2-2.4487 0-3.7731-.3748-4.4321-.6654-.0878-.0388-.1317-.0581-.2583-.179-.076-.0724-.2145-.285-.2501-.3837C2 18.6073 2 18.5173 2 18.3373V7.5889c0-.9088 0-1.3632.1363-1.5968.1386-.2375.2723-.348.5318-.4393.255-.0898.77.0092 1.7997.207A13.44 13.44 0 0 0 7 6c3 0 6-2 10-2m-2.5 8c0 1.3807-1.1193 2.5-2.5 2.5S9.5 13.3807 9.5 12s1.1193-2.5 2.5-2.5 2.5 1.1193 2.5 2.5" />
  </svg>
);

function SearchInput({ placeholder, className = "" }: { placeholder: string; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
      <input type="text" placeholder={placeholder} readOnly
        className="text-sm pl-9 pr-4 py-2 rounded-lg outline-none w-full"
        style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-search)", color: "#1a1a1a" }}
      />
    </div>
  );
}

export default function DashboardPage() {
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="font-sans px-6 py-8 md:px-12 md:py-10 max-w-6xl mx-auto">

      {/* Greeting */}
      <div className="mb-8 border-l-4 pl-5 py-1" style={{ borderColor: "var(--primary)" }}>
        <p className="text-sm mb-1" style={{ color: "var(--primary)" }}>{greeting}, Levi</p>
        <h1 className="text-3xl font-bold" style={{ color: "#212529" }}>Today is {dateStr}.</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: "MRR",                   value: "$17,224.00", showIcon: true },
          { label: "Active Subscriptions",  value: "3"          },
          { label: "Expiring This Week",    value: "1"          },
          { label: "Reminders Sent Today",  value: "0"          },
        ].map((card) => (
          <div key={card.label} className="rounded-lg p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm" style={{ color: "#6c757d" }}>{card.label}</p>
              {card.showIcon && <span style={{ color: "#adb5bd" }}><MRRIcon /></span>}
            </div>
            <p className="text-2xl font-bold" style={{ color: "#212529" }}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Expiring Soon */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Expiring Soon</h2>
            <p className="text-sm text-gray-500 mt-0.5">Subscriptions ending in the next 14 days</p>
          </div>
          <SearchInput placeholder="Search subscriptions..." className="w-full md:w-56 flex-shrink-0" />
        </div>

        <div className="mb-4">
          <button className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg" style={{ border: "1px solid var(--border)", backgroundColor: "#fef7fa", color: "#4b4b4b" }}>
            Product/Plan
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        <ExpiringTable />
      </div>

      {/* Reminder Log */}
      <div>
        <div className="flex justify-end mb-3">
          <SearchInput placeholder="Search" className="w-full md:w-44" />
        </div>

        <ReminderTable />
      </div>
    </div>
  );
}
