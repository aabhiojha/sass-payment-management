"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { apiGet } from "@/lib/api";

type AuditLog = {
  id: number;
  actorId: number;
  actorEmail: string;
  action: string;
  resourceType: string;
  resourceId: number | null;
  oldValue: string | null;
  newValue: string | null;
  userAgent: string | null;
  createdAt: string;
};

type Page<T> = { content: T[]; page: { totalElements: number; totalPages: number; size: number; number: number } };

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
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
  return action.charAt(0) + action.slice(1).toLowerCase().replace(/_/g, " ");
}

function prettyResource(type: string) {
  return type.toLowerCase().replace(/_/g, " ");
}

function actionChipStyle(action: string): { bg: string; color: string } {
  if (action.includes("CREAT") || action.includes("ADD")) return { bg: "#dcfce7", color: "#166534" };
  if (action.includes("DELET") || action.includes("REMOV") || action.includes("CANCEL") || action.includes("ARCHIV")) return { bg: "#fee2e2", color: "#991b1b" };
  if (action.includes("SUSPEND") || action.includes("DISABL")) return { bg: "#fef9c3", color: "#854d0e" };
  if (action.includes("UPDAT") || action.includes("PATCH") || action.includes("EDIT")) return { bg: "#dbeafe", color: "#1e40af" };
  return { bg: "#f3f4f6", color: "#374151" };
}

const ALL_ACTIONS = ["CREATED", "UPDATED", "DELETED", "CANCELLED", "SUSPENDED", "ARCHIVED", "INVITED"];

export default function AuditLogPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState<string[]>([]);
  const [resourceFilter, setResourceFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const PAGE_SIZE = 25;

  const load = (p = page, actions = actionFilter, resource = resourceFilter) => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ size: String(PAGE_SIZE), page: String(p), sort: "createdAt,desc" });
    if (actions.length > 0) params.set("actions", actions.join(","));
    if (resource.trim()) params.set("resourceTypes", resource.trim().toUpperCase().replace(/ /g, "_"));
    apiGet<Page<AuditLog>>(`/api/v1/audit-logs/tenant?${params}`, token)
      .then((d) => { setLogs(d.content); setTotal(d.page.totalElements); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="px-6 py-8 md:px-10 max-w-5xl mx-auto space-y-6" style={{ animation: "fade-in-up 0.2s ease-out both" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} events recorded</p>
      </div>

      {/* Action filter chips */}
      <div className="flex flex-wrap gap-2">
        {ALL_ACTIONS.map((a) => {
          const active = actionFilter.includes(a);
          const style = actionChipStyle(a);
          return (
            <button
              key={a}
              onClick={() => {
                const next = active ? actionFilter.filter((x) => x !== a) : [...actionFilter, a];
                setActionFilter(next);
                setPage(0);
                load(0, next, resourceFilter);
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={active ? { backgroundColor: style.bg, color: style.color } : { border: "1px solid var(--border)", color: "#9ca3af" }}
            >
              {prettyAction(a)}
            </button>
          );
        })}
        {actionFilter.length > 0 && (
          <button
            onClick={() => { setActionFilter([]); setPage(0); load(0, [], resourceFilter); }}
            className="text-xs font-semibold px-3 py-1.5 rounded-full text-gray-400 hover:text-gray-600"
            style={{ border: "1px solid var(--border)" }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Log list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
          Loading…
        </div>
      ) : logs.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-sm text-gray-400 rounded-xl" style={{ border: "1px solid var(--border)" }}>
          No events found.
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          {logs.map((log, i) => {
            const chip = actionChipStyle(log.action);
            const isOpen = expanded === log.id;
            const hasDetails = log.oldValue || log.newValue;
            return (
              <div
                key={log.id}
                style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined, animation: "fade-in 0.15s ease-out both", animationDelay: `${i * 15}ms` }}
              >
                <button
                  className="w-full text-left flex items-start gap-4 px-5 py-3.5 hover:bg-[#f8faf8] transition-colors"
                  onClick={() => hasDetails && setExpanded(isOpen ? null : log.id)}
                >
                  {/* Action badge */}
                  <span
                    className="flex-shrink-0 mt-0.5 text-xs font-bold px-2.5 py-1 rounded-md whitespace-nowrap"
                    style={chip}
                  >
                    {prettyAction(log.action)}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{log.actorEmail}</span>
                      {" · "}
                      <span className="text-gray-500">{prettyResource(log.resourceType)}</span>
                      {log.resourceId && <span className="text-gray-400 ml-1 text-xs">#{log.resourceId}</span>}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(log.createdAt)}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400 whitespace-nowrap">{relativeTime(log.createdAt)}</span>
                    {hasDetails && (
                      <svg
                        width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                        className="text-gray-400 transition-transform"
                        style={{ transform: isOpen ? "rotate(180deg)" : undefined }}
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    )}
                  </div>
                </button>

                {/* Expanded diff */}
                {isOpen && hasDetails && (
                  <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {log.oldValue && (
                      <div className="rounded-lg p-3 text-xs font-mono break-all" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b" }}>
                        <p className="font-semibold mb-1 font-sans text-xs text-red-400 uppercase tracking-wide">Before</p>
                        <pre className="whitespace-pre-wrap">{(() => { try { return JSON.stringify(JSON.parse(log.oldValue!), null, 2); } catch { return log.oldValue; } })()}</pre>
                      </div>
                    )}
                    {log.newValue && (
                      <div className="rounded-lg p-3 text-xs font-mono break-all" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}>
                        <p className="font-semibold mb-1 font-sans text-xs text-green-400 uppercase tracking-wide">After</p>
                        <pre className="whitespace-pre-wrap">{(() => { try { return JSON.stringify(JSON.parse(log.newValue!), null, 2); } catch { return log.newValue; } })()}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page + 1} of {totalPages} · {total.toLocaleString()} events</span>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => { const p = page - 1; setPage(p); load(p); }} className="px-3 py-1.5 rounded-lg font-medium disabled:opacity-40" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}>Prev</button>
            <button disabled={page >= totalPages - 1} onClick={() => { const p = page + 1; setPage(p); load(p); }} className="px-3 py-1.5 rounded-lg font-medium disabled:opacity-40" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
