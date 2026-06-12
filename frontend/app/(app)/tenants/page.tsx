"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuthStore } from "@/store/authStore";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import SlideOver, { SlideOverField, SlideOverHeader, SlideOverSection } from "@/components/SlideOver";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 15;

function useColumnResize(initialWidths: number[]) {
  const [widths, setWidths] = useState(initialWidths);
  const dragging = useRef<{ col: number; startX: number; startW: number } | null>(null);

  const onMouseDown = useCallback(
    (col: number, e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = { col, startX: e.clientX, startW: widths[col] };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMove = (e: MouseEvent) => {
        if (!dragging.current) return;
        const { col, startX, startW } = dragging.current;
        setWidths((prev) =>
          prev.map((w, i) => (i === col ? Math.max(60, startW + (e.clientX - startX)) : w))
        );
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
    },
    [widths]
  );

  return { widths, onMouseDown };
}

type TenantStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

type Tenant = {
  id: number;
  name: string;
  email: string;
  timezone: string;
  status: TenantStatus;
  planName: string | null;
  planPrice: number | null;
  planCurrency: string | null;
  planCadence: string | null;
  createdAt: string;
};

type Plan = {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCadence: string;
};

type TenantPlatformPlanResponse = {
  id: number;
  tenantId: number;
  planId: number;
  planName: string;
  effectivePrice: number;
  currency: string;
  billingCadence: string;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
};

type ApiTenant = {
  id: number;
  name: string;
  slug: string;
  companyEmail: string;
  timezone: string;
  status: string;
  archivedAt: string | null;
  suspensionReason: string | null;
  archivalReason: string | null;
  createdAt: string;
  updatedAt: string;
  activePlan: TenantPlatformPlanResponse | null;
};

type ApiTenantPage = {
  content: ApiTenant[];
  page: {
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
  };
};

type ApiPlan = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billingCadence: string;
  status: string;
};

type TenantUser = {
  id: number;
  tenantId: number;
  email: string;
  fullName: string | null;
  role: string;
  status: string;
  createdAt: string;
};

type ApiUserPage = {
  content: TenantUser[];
};

type InvitationItem = {
  id: number;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

type ApiInvitationPage = {
  content: InvitationItem[];
};


const cadenceLabel: Record<string, string> = {
  WEEKLY: "/ wk",
  FORTNIGHT: "/ 2wk",
  MONTHLY: "/ mo",
  QUARTERLY: "/ qtr",
  ANNUALLY: "/ yr",
};

const timezones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function mapTenant(t: ApiTenant): Tenant {
  return {
    id: t.id,
    name: t.name,
    email: t.companyEmail,
    timezone: t.timezone,
    status: t.status as TenantStatus,
    planName: t.activePlan?.planName ?? null,
    planPrice: t.activePlan ? Number(t.activePlan.effectivePrice) : null,
    planCurrency: t.activePlan?.currency ?? null,
    planCadence: t.activePlan?.billingCadence ?? null,
    createdAt: formatDate(t.createdAt),
  };
}

function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const handleClick = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handleClick} className="inline-flex items-center gap-1.5 transition-colors text-left group">
      {copied ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary)" }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-xs font-medium" style={{ color: "var(--primary)" }}>Copied!</span>
        </>
      ) : (
        <span className="group-hover:text-primary transition-colors cursor-pointer">{value}</span>
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: TenantStatus }) {
  const cfg: Record<TenantStatus, { bg: string; label: string }> = {
    ACTIVE:    { bg: "#24A37D", label: "Active"    },
    SUSPENDED: { bg: "#ef4444", label: "Suspended" },
    ARCHIVED:  { bg: "#6b7280", label: "Archived"  },
  };
  const c = cfg[status];
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold" style={{ backgroundColor: c.bg, color: "#fff" }}>
      {c.label}
    </span>
  );
}

function SortIcon({ dir, active }: { dir: "asc" | "desc"; active: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline ml-1.5" style={{ opacity: active ? 1 : 0.4 }}>
      {dir === "asc" ? (
        <path d="m7 15 5 5 5-5" />
      ) : (
        <path d="m7 9 5-5 5 5" />
      )}
    </svg>
  );
}

function ResizeHandle({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div onMouseDown={onMouseDown} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-md-primary/20 transition-colors" />
  );
}

const colHeaders: { label: string; sortable?: boolean }[] = [
  { label: "Tenant",    sortable: true },
  { label: "Email"                     },
  { label: "Timezone"                  },
  { label: "Plan",      sortable: true },
  { label: "Status"                    },
  { label: "Created",   sortable: true },
  { label: ""                          },
];

const sortFieldMap: Record<string, keyof Tenant> = {
  Tenant: "name",
  Plan: "planName",
  Created: "createdAt",
};

function TenantsTable({
  data,
  onSuspend,
  onActivate,
  onSelect,
  sortField,
  sortDir,
  onSort,
}: {
  data: Tenant[];
  onSuspend: (t: Tenant) => void;
  onActivate: (t: Tenant) => void;
  onSelect: (t: Tenant) => void;
  sortField: string | null;
  sortDir: "asc" | "desc";
  onSort: (field: string) => void;
}) {
  const cols = [160, 200, 170, 190, 110, 130, 52];
  const { widths, onMouseDown } = useColumnResize(cols);

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table style={{ tableLayout: "fixed", width: "100%", minWidth: widths.reduce((a, b) => a + b, 0) }}>
          <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
          <thead className="sticky top-0 z-10">
            <tr>
              {colHeaders.map((h, i) => {
                const active = sortField === h.label;
                return (
                  <th
                    key={i}
                    className="relative text-left px-4 py-3 text-sm font-semibold text-gray-700 select-none overflow-hidden"
                    style={{ ...(h.sortable ? { cursor: "pointer" } : {}), backgroundColor: "var(--bg-card)" }}
                    onClick={h.sortable ? () => onSort(h.label) : undefined}
                  >
                    <span className="truncate flex items-center pr-2">
                      {h.label}
                      {h.sortable && <SortIcon dir={active ? sortDir : "asc"} active={active} />}
                    </span>
                    {i < colHeaders.length - 1 && <ResizeHandle onMouseDown={(e) => onMouseDown(i, e)} />}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
              {data.map((row, i) => (
              <tr
                key={row.id}
                className="group bg-md-surface hover:bg-md-primary/5 transition-colors"
                style={{
                  borderTop: "1px solid var(--border)",
                  animation: "fade-in 0.15s ease-out both",
                  animationDelay: `${i * 15}ms`,
                  opacity: row.status === "ARCHIVED" ? 0.6 : row.status === "SUSPENDED" ? 0.75 : 1,
                  cursor: "pointer",
                }}
                onClick={() => onSelect(row)}
              >
                <td className="px-4 py-3 overflow-hidden">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{row.name}</p>
                    <p className="text-xs text-gray-400 truncate">#{row.id}</p>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 truncate overflow-hidden">{row.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600 truncate overflow-hidden">{row.timezone}</td>
                <td className="px-4 py-3 overflow-hidden">
                  {row.planName ? (
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{row.planName}</p>
                      <p className="text-xs text-gray-400">
                        {row.planCurrency} {row.planPrice?.toLocaleString()}{cadenceLabel[row.planCadence ?? ""] ?? ""}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No plan</span>
                  )}
                </td>
                <td className="px-4 py-3 overflow-hidden">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 truncate overflow-hidden">{row.createdAt}</td>
                <td className="px-4 py-3 text-right pr-3">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {row.status === "ACTIVE" ? (
                      <button onClick={() => onSuspend(row)} className="hover:text-red-500 transition-colors text-gray-400" title="Suspend">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="10" x2="10" y1="15" y2="9" /><line x1="14" x2="14" y1="15" y2="9" />
                        </svg>
                      </button>
                    ) : row.status === "SUSPENDED" ? (
                      <button onClick={() => onActivate(row)} className="hover:text-green-600 transition-colors text-gray-400" title="Reactivate">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                        </svg>
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
    </div>
  );
}

type CreateForm = {
  name: string;
  email: string;
  timezone: string;
  selectedPlanId: number | null;
  customPrice: string;
};

const emptyForm: CreateForm = {
  name: "",
  email: "",
  timezone: "UTC",
  selectedPlanId: null,
  customPrice: "",
};

function PlanCard({ plan, selected, onSelect }: { plan: Plan; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-xl p-4 transition-all"
      style={{
        border: selected ? "2px solid var(--primary)" : "1.5px solid var(--border)",
        backgroundColor: selected ? "var(--nav-active)" : "#fff",
        boxShadow: selected ? "0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent)" : "none",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{plan.name}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{plan.description}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="text-sm font-bold" style={{ color: "var(--primary)" }}>
            {plan.currency} {plan.price.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">{cadenceLabel[plan.billingCadence] ?? plan.billingCadence}</p>
        </div>
      </div>
      {selected && (
        <div className="mt-2.5 flex items-center gap-1.5" style={{ color: "var(--primary)" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5L20 7" />
          </svg>
          <span className="text-xs font-semibold">Selected</span>
        </div>
      )}
    </button>
  );
}

function NoPlanCard({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full text-left rounded-xl p-4 transition-all"
      style={{
        border: selected ? "2px solid #6b7280" : "1.5px dashed var(--border)",
        backgroundColor: selected ? "#f9fafb" : "#fafafa",
      }}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M8 12h8" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-600">No plan yet</p>
          <p className="text-xs text-gray-400">Assign a plan later from tenant settings</p>
        </div>
      </div>
      {selected && (
        <div className="mt-2 flex items-center gap-1.5 text-gray-500">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 5 5L20 7" />
          </svg>
          <span className="text-xs font-semibold">Selected</span>
        </div>
      )}
    </button>
  );
}

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
      style={{
        backgroundColor: active || done ? "var(--primary)" : "var(--border)",
        color: active || done ? "#fff" : "#9ca3af",
      }}
    >
      {done ? (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 5 5L20 7" />
        </svg>
      ) : label}
    </div>
  );
}

function CreateTenantModal({
  plans,
  onClose,
  onSubmit,
  saving,
}: {
  plans: Plan[];
  onClose: () => void;
  onSubmit: (form: CreateForm) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [step, setStep] = useState<1 | 2>(1);
  const [showCustomPrice, setShowCustomPrice] = useState(false);

  const set = <K extends keyof CreateForm>(k: K, v: CreateForm[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => { setShowCustomPrice(false); setForm((p) => ({ ...p, customPrice: "" })); }, [form.selectedPlanId]);

  const [portalMounted, setPortalMounted] = useState(false);
  useEffect(() => setPortalMounted(true), []);

  const canProceed = form.name.trim() && form.email.trim() && form.timezone;
  const selectedPlan = plans.find((p) => p.id === form.selectedPlanId) ?? null;

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
      <div
        className="rounded-2xl shadow-2xl w-full mx-auto flex flex-col"
        style={{
          backgroundColor: "var(--bg-app)",
          border: "1px solid var(--border)",
          maxWidth: step === 2 ? "680px" : "480px",
          maxHeight: "92dvh",
          animation: "fade-in-up 0.2s ease-out both",
        }}
      >
        <div className="flex items-center justify-between px-7 pt-6 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create New Tenant</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <StepDot active={step === 1} done={step > 1} label="1" />
              <div className="w-8 h-px" style={{ backgroundColor: step > 1 ? "var(--primary)" : "var(--border)" }} />
              <StepDot active={step === 2} done={false} label="2" />
              <span className="text-xs text-gray-400 ml-1">{step === 1 ? "Tenant details" : "Assign a plan"}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-7 py-5">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Company Name <span style={{ color: "var(--primary)" }}>*</span>
                </label>
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Acme Corporation"
                  className="w-full text-sm px-3 py-2.5 rounded-lg outline-none"
                  style={{ borderBottom: "2px solid var(--color-md-outline)", backgroundColor: "var(--bg-search)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Admin Email <span style={{ color: "var(--primary)" }}>*</span>
                </label>
                <div className="relative">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="admin@company.com"
                    className="w-full text-sm pl-9 pr-4 py-2.5 rounded-lg outline-none"
                    style={{ borderBottom: "2px solid var(--color-md-outline)", backgroundColor: "var(--bg-search)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                  Timezone <span style={{ color: "var(--primary)" }}>*</span>
                </label>
                <div className="relative">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                    <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20A14.5 14.5 0 0 0 12 2" /><path d="M2 12h20" />
                  </svg>
                  <select
                    value={form.timezone}
                    onChange={(e) => set("timezone", e.target.value)}
                    className="w-full text-sm pl-9 pr-4 py-2.5 rounded-lg outline-none appearance-none"
                    style={{ borderBottom: "2px solid var(--color-md-outline)", backgroundColor: "var(--bg-search)" }}
                  >
                    {timezones.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-500 mb-4">
                Choose the platform plan for{" "}
                <span className="font-semibold text-gray-700">{form.name}</span>.{" "}
                You can change this later.
              </p>

              {plans.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No active plans available. Create one first.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {plans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      selected={form.selectedPlanId === plan.id}
                      onSelect={() => set("selectedPlanId", form.selectedPlanId === plan.id ? null : plan.id)}
                    />
                  ))}
                  <NoPlanCard
                    selected={form.selectedPlanId === null}
                    onSelect={() => set("selectedPlanId", null)}
                  />
                </div>
              )}

              {selectedPlan && (
                <div className="mt-4 rounded-xl p-4" style={{ backgroundColor: "var(--bg-card)" }}>
                  <button
                    type="button"
                    onClick={() => setShowCustomPrice(!showCustomPrice)}
                    className="w-full flex items-center justify-between text-sm font-medium text-gray-700"
                  >
                    <span>Set custom price?</span>
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: showCustomPrice ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {showCustomPrice && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                            {selectedPlan.currency}
                          </span>
                          <input
                            type="number"
                            value={form.customPrice}
                            onChange={(e) => set("customPrice", e.target.value)}
                            placeholder={String(selectedPlan.price)}
                            className="w-full text-sm pl-11 pr-3 py-2 rounded-lg outline-none"
                            style={{ border: "1px solid var(--border)", backgroundColor: "#fafafa" }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          Default: {selectedPlan.currency} {selectedPlan.price.toLocaleString()}{cadenceLabel[selectedPlan.billingCadence]}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-7 py-5" style={{ borderTop: "1px solid var(--border)" }}>
          {step === 1 ? (
            <>
              <button onClick={onClose} className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors" style={{ border: "1px solid var(--border)", color: "#4b4b4b" }}>
                Cancel
              </button>
              <button
                onClick={() => setStep(2)}
                disabled={!canProceed}
                className="flex-1 py-2.5 text-sm font-medium rounded-full text-white active:scale-95 transition-opacity"
                style={{ backgroundColor: "var(--primary)", opacity: canProceed ? 1 : 0.45 }}
              >
                Continue
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline ml-1.5 -mt-0.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                style={{ border: "1px solid var(--border)", color: "#4b4b4b" }}
                disabled={saving}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                onClick={() => onSubmit(form)}
                disabled={saving}
                className="flex-1 py-2.5 text-sm font-medium rounded-full text-white active:scale-95 transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                style={{ backgroundColor: "var(--primary)", opacity: saving ? 0.7 : 1 }}
              >
                {saving && (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                )}
                {form.selectedPlanId ? "Create & Assign Plan" : "Create Tenant"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (!portalMounted) return null;
  return createPortal(modal, document.body);
}

function EditPlanModal({
  plans,
  currentPlanId,
  tenantName,
  onClose,
  onSubmit,
  saving,
}: {
  plans: Plan[];
  currentPlanId: number | null;
  tenantName: string;
  onClose: () => void;
  onSubmit: (planId: number | null, customPrice: string) => void;
  saving: boolean;
}) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(currentPlanId);
  const [customPrice, setCustomPrice] = useState("");
  const [showCustomPrice, setShowCustomPrice] = useState(false);
  const [closing, setClosing] = useState(false);
  useEffect(() => { setShowCustomPrice(false); setCustomPrice(""); }, [selectedPlanId]);

  const close = () => { setClosing(true); setTimeout(onClose, 150); };
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center p-5"
      style={{ backgroundColor: "rgba(0,0,0,0.32)", backdropFilter: "blur(2px)", animation: closing ? "fade-out 0.15s ease-out both" : "fade-in 0.15s ease-out both" }}
      onClick={close}
    >
      <div
        className="w-full rounded-2xl overflow-hidden flex flex-col"
        style={{ maxWidth: "440px", maxHeight: "85dvh", backgroundColor: "var(--bg-app)", boxShadow: "0 8px 40px rgba(28,27,31,0.14)", animation: closing ? "dialog-out 0.15s ease-in both" : "dialog-in 0.18s cubic-bezier(0.34,1.56,0.64,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h3 className="text-base font-bold text-gray-900">Edit Plan</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              For <span className="font-semibold text-gray-700">{tenantName}</span>
            </p>
          </div>
          <button onClick={close} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {plans.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No active plans available.</p>
          ) : (
            <>
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  selected={selectedPlanId === plan.id}
                  onSelect={() => setSelectedPlanId(selectedPlanId === plan.id ? null : plan.id)}
                />
              ))}
              <NoPlanCard selected={selectedPlanId === null} onSelect={() => setSelectedPlanId(null)} />
            </>
          )}
          {selectedPlan && (
            <div className="rounded-xl p-4" style={{ backgroundColor: "#fafafa", border: "1px solid var(--border)" }}>
              <button
                type="button"
                onClick={() => setShowCustomPrice(!showCustomPrice)}
                className="w-full flex items-center justify-between text-sm font-medium text-gray-700"
              >
                <span>Set custom price?</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: showCustomPrice ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {showCustomPrice && (
                <div className="mt-3 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">{selectedPlan.currency}</span>
                  <input
                    type="number"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    placeholder={`Default: ${selectedPlan.price}`}
                    className="w-full text-sm pl-11 pr-3 py-2 rounded-lg outline-none"
                    style={{ borderBottom: "2px solid var(--color-md-outline)", backgroundColor: "var(--bg-search)" }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4 flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={close} disabled={saving} className="flex-1 py-2 text-sm font-semibold rounded-lg transition-colors" style={{ border: "1px solid var(--border)", color: "#4b4b4b" }}>
            Cancel
          </button>
          <button
            onClick={() => onSubmit(selectedPlanId, customPrice)}
            disabled={saving}
            className="flex-1 py-2 text-sm font-medium rounded-full text-white active:scale-95 flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--primary)", opacity: saving ? 0.7 : 1 }}
          >
            {saving && <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>}
            Save Plan
          </button>
        </div>
      </div>
    </div>
  );
}

function InviteUserModal({
  onClose,
  onSubmit,
  inviting,
  error,
}: {
  onClose: () => void;
  onSubmit: (email: string, role: "admin" | "user") => void;
  inviting: boolean;
  error: string | null;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [closing, setClosing] = useState(false);

  const close = () => { setClosing(true); setTimeout(onClose, 150); };

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center p-5"
      style={{ backgroundColor: "rgba(0,0,0,0.32)", backdropFilter: "blur(2px)", animation: closing ? "fade-out 0.15s ease-out both" : "fade-in 0.15s ease-out both" }}
      onClick={close}
    >
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{ maxWidth: "380px", backgroundColor: "var(--bg-app)", boxShadow: "0 8px 40px rgba(28,27,31,0.14)", animation: closing ? "dialog-out 0.15s ease-in both" : "dialog-in 0.18s cubic-bezier(0.34,1.56,0.64,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h3 className="text-base font-bold text-gray-900">Invite User</h3>
            <p className="text-xs text-gray-500 mt-0.5">Send an invitation link via email</p>
          </div>
          <button onClick={close} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Role</label>
            <div className="flex gap-1.5 p-1 rounded-lg" style={{ backgroundColor: "var(--border)" }}>
              {(["user", "admin"] as const).map((r) => (
                <button key={r} type="button" onClick={() => setRole(r)}
                  className="flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors"
                  style={role === r
                    ? { backgroundColor: "var(--nav-active)", color: "var(--nav-active-text)" }
                    : { color: "#6b7280" }}>
                  {r === "admin" ? "Admin" : "User"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email address</label>
            <div className="relative">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={`${role === "admin" ? "admin" : "user"}@company.com`}
                autoFocus
                className="w-full text-sm pl-9 pr-4 py-2.5 rounded-lg outline-none"
                style={{ border: "1px solid var(--border)", backgroundColor: "#fafafa" }}
                onKeyDown={(e) => e.key === "Enter" && email.trim() && onSubmit(email, role)}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={close} disabled={inviting} className="flex-1 py-2 text-sm font-semibold rounded-lg" style={{ border: "1px solid var(--border)", color: "#4b4b4b" }}>
            Cancel
          </button>
          <button
            onClick={() => onSubmit(email, role)}
            disabled={inviting || !email.trim()}
            className="flex-1 py-2 text-sm font-medium rounded-full text-white active:scale-95 flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--primary)", opacity: inviting || !email.trim() ? 0.6 : 1 }}
          >
            {inviting && <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>}
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}

function TenantSidebar({
  tenantId,
  open,
  token,
  plans,
  onClose,
  onDataChange,
  width,
}: {
  tenantId: number;
  open: boolean;
  token: string;
  plans: Plan[];
  onClose: () => void;
  onDataChange: () => void;
  width?: string;
}) {
  const [detail, setDetail] = useState<ApiTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", email: "", timezone: "UTC" });
  const [suspendReason, setSuspendReason] = useState("");
  const [showSuspendForm, setShowSuspendForm] = useState(false);
  const [archiveReason, setArchiveReason] = useState("");
  const [showArchiveForm, setShowArchiveForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [users, setUsers] = useState<TenantUser[]>([]);

  const [inviting, setInviting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const reloadInvitations = useCallback(() => {
    apiGet<ApiInvitationPage>(`/api/v1/tenants/${tenantId}/invitations?size=20&sort=createdAt,desc`, token)
      .then((page) => setInvitations(page.content))
      .catch(() => {});
  }, [tenantId, token]);

  const reload = useCallback(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    Promise.all([
      apiGet<ApiTenant>(`/api/v1/tenants/${tenantId}`, token),
      apiGet<ApiInvitationPage>(`/api/v1/tenants/${tenantId}/invitations?size=20&sort=createdAt,desc`, token),
      apiGet<ApiUserPage>(`/api/v1/tenants/${tenantId}/users?size=50`, token),
    ])
      .then(([t, invPage, userPage]) => {
        setDetail(t);
        setEditForm({ name: t.name, email: t.companyEmail, timezone: t.timezone });
        setInvitations(invPage.content);
        setUsers(userPage.content);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [tenantId, open, token]);

  useEffect(() => {
    if (!open) return;
    setEditing(false);
    setShowPlanModal(false);
    setShowSuspendForm(false);
    setShowArchiveForm(false);
    setSuspendReason("");
    setArchiveReason("");
    setShowInviteModal(false);
    setInviteError(null);
    setInviteSuccess(null);
    reload();
  }, [reload]);

  const handleAssign = async (planId: number | null, customPrice: string) => {
    if (!planId || !token || !detail) return;
    setAssigning(true);
    try {
      await apiPost<TenantPlatformPlanResponse>(
        `/api/v1/tenants/${tenantId}/platform-plan`,
        { planId, customPrice: customPrice ? parseFloat(customPrice) : null, startDate: null, endDate: null },
        token
      );
      setShowPlanModal(false);
      await reload();
      onDataChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to assign plan");
    } finally {
      setAssigning(false);
    }
  };

  const handleSaveEdit = async () => {
    setActionLoading(true);
    try {
      await apiPatch(`/api/v1/tenants/${tenantId}`, {
        name: editForm.name,
        companyEmail: editForm.email,
        timezone: editForm.timezone,
      }, token);
      await reload();
      setEditing(false);
      onDataChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update tenant");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelEdit = () => {
    if (detail) {
      setEditForm({ name: detail.name, email: detail.companyEmail, timezone: detail.timezone });
    }
    setEditing(false);
  };

  const handleSuspend = async () => {
    setActionLoading(true);
    try {
      await apiPost(`/api/v1/tenants/${tenantId}/suspend`, { reason: suspendReason || null }, token);
      await reload();
      setShowSuspendForm(false);
      setSuspendReason("");
      onDataChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to suspend tenant");
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async () => {
    setActionLoading(true);
    try {
      await apiPost(`/api/v1/tenants/${tenantId}/reactivate`, {}, token);
      await reload();
      onDataChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to reactivate tenant");
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    setActionLoading(true);
    try {
      await apiPost(`/api/v1/tenants/${tenantId}/archive`, { reason: archiveReason || null }, token);
      onDataChange();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to archive tenant");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendInvite = async (email: string, role: "admin" | "user") => {
    setInviting(true);
    setInviteError(null);
    setInviteSuccess(null);
    const endpoint = role === "admin" ? "invite-admin" : "invite-user";
    try {
      await apiPost(`/api/v1/tenants/${tenantId}/${endpoint}`, { email: email.trim() }, token);
      setInviteSuccess(`Invite sent to ${email.trim()}`);
      setShowInviteModal(false);
      reloadInvitations();
    } catch (e) {
      setInviteError(e instanceof Error ? e.message : "Failed to send invite.");
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: number) => {
    try {
      await apiPost(`/api/v1/tenants/${tenantId}/invitations/${invitationId}/revoke`, {}, token);
      reloadInvitations();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to revoke invitation.");
    }
  };

  const handleResendInvitation = async (invitationId: number) => {
    try {
      await apiPost(`/api/v1/tenants/${tenantId}/invitations/${invitationId}/resend`, {}, token);
      reloadInvitations();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to resend invitation.");
    }
  };

  const status = detail?.status as TenantStatus | undefined;

  const timezoneOptions = timezones;

  return (
    <SlideOver open={open} onClose={onClose} width={width}>
      <SlideOverHeader
        title={loading ? "Loading…" : editing ? "Edit Tenant" : (detail?.name ?? "Tenant")}
        badge={detail && !editing ? <StatusBadge status={detail.status as TenantStatus} /> : undefined}
        onBack={editing ? handleCancelEdit : onClose}
        onClose={onClose}
        actions={!loading && detail && !editing ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              title="Edit tenant"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
              </svg>
            </button>
            {status === "ACTIVE" && (
              <button
                onClick={() => setShowSuspendForm((v) => !v)}
                title="Suspend tenant"
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: showSuspendForm ? "#dc2626" : "#9ca3af" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="10" x2="10" y1="15" y2="9" /><line x1="14" x2="14" y1="15" y2="9" />
                </svg>
              </button>
            )}
            {status === "SUSPENDED" && (
              <>
                <button
                  onClick={handleActivate}
                  disabled={actionLoading}
                  title="Reactivate tenant"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
                  </svg>
                </button>
                <button
                  onClick={() => setShowArchiveForm((v) => !v)}
                  title="Archive tenant"
                  className="p-1.5 rounded-lg transition-colors"
                  style={{ color: showArchiveForm ? "#6b7280" : "#9ca3af" }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="21 8 21 21 3 21 3 8" /><rect width="22" height="5" x="1" y="3" /><line x1="10" x2="14" y1="12" y2="12" />
                  </svg>
                </button>
              </>
            )}
          </div>
        ) : undefined}
      />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-400">
            <svg className="animate-spin mr-2" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            Loading…
          </div>
        ) : error ? (
          <SlideOverSection>
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
          </SlideOverSection>
        ) : detail ? (
          <div key={editing ? "edit" : "detail"} style={{ animation: "slide-in-from-right 0.2s cubic-bezier(0.25,0.46,0.45,0.94) both" }}>
            {!editing && (
              <SlideOverSection>
                <SlideOverField label="Email">{detail.companyEmail}</SlideOverField>
                <SlideOverField label="Timezone">{detail.timezone}</SlideOverField>
                <SlideOverField label="ID / Slug">#{detail.id} · {detail.slug}</SlideOverField>
                <SlideOverField label="Created at">{formatDate(detail.createdAt)}</SlideOverField>
              </SlideOverSection>
            )}

            {editing && (
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Company Name</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                    style={{ borderBottom: "2px solid var(--color-md-outline)", backgroundColor: "var(--bg-search)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
                  <input
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                    style={{ borderBottom: "2px solid var(--color-md-outline)", backgroundColor: "var(--bg-search)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Timezone</label>
                  <select
                    value={editForm.timezone}
                    onChange={(e) => setEditForm((p) => ({ ...p, timezone: e.target.value }))}
                    className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                    style={{ borderBottom: "2px solid var(--color-md-outline)", backgroundColor: "var(--bg-search)" }}
                  >
                    {timezoneOptions.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleCancelEdit}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors"
                    style={{ border: "1px solid var(--border)", color: "#4b4b4b" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={actionLoading || !editForm.name || !editForm.email}
                    className="flex-1 py-2.5 text-sm font-medium rounded-full text-white active:scale-95 transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ backgroundColor: "var(--primary)", opacity: actionLoading ? 0.7 : 1 }}
                  >
                    {actionLoading && (
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    )}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {!editing && (
              <SlideOverSection title="Current Plan">
                {detail.activePlan ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{detail.activePlan.planName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {detail.activePlan.currency} {detail.activePlan.effectivePrice?.toLocaleString()}
                          {cadenceLabel[detail.activePlan.billingCadence] ?? ""}
                        </p>
                      </div>
                      <button
                        onClick={() => setShowPlanModal(true)}
                        className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
                        style={{ color: "var(--primary)", border: "1px solid var(--primary)" }}
                      >
                        Edit
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">
                      {new Date(detail.activePlan.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {" → "}
                      {new Date(detail.activePlan.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-gray-400 italic mb-3">No plan assigned</p>
                    <button
                      onClick={() => setShowPlanModal(true)}
                      className="text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ color: "var(--primary)", border: "1px solid var(--primary)" }}
                    >
                      Assign Plan
                    </button>
                  </div>
                )}
              </SlideOverSection>
            )}


            {showSuspendForm && (
              <div className="px-6 py-5 space-y-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="text-sm font-semibold text-gray-700">Suspend {detail.name}?</p>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Reason for suspension (optional)"
                  rows={2}
                  className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-none"
                  style={{ borderBottom: "2px solid var(--color-md-outline)", backgroundColor: "var(--bg-search)" }}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowSuspendForm(false); setSuspendReason(""); }}
                    disabled={actionLoading}
                    className="flex-1 py-2 text-sm font-semibold rounded-lg transition-colors"
                    style={{ border: "1px solid var(--border)", color: "#4b4b4b" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSuspend}
                    disabled={actionLoading}
                    className="flex-1 py-2 text-sm font-medium rounded-full text-white active:scale-95 transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ backgroundColor: "#dc2626", opacity: actionLoading ? 0.7 : 1 }}
                  >
                    {actionLoading && (
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    )}
                    Confirm Suspend
                  </button>
                </div>
              </div>
            )}

            {showArchiveForm && (
              <div className="px-6 py-5 space-y-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="text-sm font-semibold text-gray-700">Archive {detail.name}?</p>
                <p className="text-xs text-gray-400">This is a permanent state. The tenant cannot be reactivated.</p>
                <textarea
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  placeholder="Reason for archival (optional)"
                  rows={2}
                  className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-none"
                  style={{ borderBottom: "2px solid var(--color-md-outline)", backgroundColor: "var(--bg-search)" }}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => { setShowArchiveForm(false); setArchiveReason(""); }}
                    disabled={actionLoading}
                    className="flex-1 py-2 text-sm font-semibold rounded-lg transition-colors"
                    style={{ border: "1px solid var(--border)", color: "#4b4b4b" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleArchive}
                    disabled={actionLoading}
                    className="flex-1 py-2 text-sm font-medium rounded-full text-white active:scale-95 transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ backgroundColor: "#6b7280", opacity: actionLoading ? 0.7 : 1 }}
                  >
                    {actionLoading && (
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                    )}
                    Confirm Archive
                  </button>
                </div>
              </div>
            )}

            {!editing && (
              <SlideOverSection title="Users">
                {users.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No users yet.</p>
                ) : (
                  <div className="space-y-2">
                    {users.map((u) => {
                      const roleColor: Record<string, string> = {
                        TENANT_ADMIN: "var(--primary)",
                        TENANT_USER:  "#6b7280",
                        SUPER_ADMIN:  "#7c3aed",
                      };
                      const statusColor: Record<string, string> = {
                        ACTIVE:    "#24A37D",
                        INACTIVE:  "#9ca3af",
                        SUSPENDED: "#ef4444",
                      };
                      return (
                        <div key={u.id} className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ backgroundColor: "var(--bg-card)" }}>
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white" style={{ backgroundColor: roleColor[u.role] ?? "#6b7280" }}>
                            {(u.fullName ?? u.email).charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 truncate">{u.fullName ?? <span className="italic text-gray-400">No name</span>}</p>
                            <p className="text-xs text-gray-400 truncate">{u.email}</p>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                            <span className="text-xs font-medium" style={{ color: roleColor[u.role] ?? "#6b7280" }}>
                              {u.role.replace("TENANT_", "")}
                            </span>
                            <span className="text-xs" style={{ color: statusColor[u.status] ?? "#9ca3af" }}>
                              {u.status.toLowerCase()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SlideOverSection>
            )}

            {!editing && (
              <SlideOverSection title="Invitations">
                {inviteSuccess && (
                  <div className="mb-3 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    {inviteSuccess}
                  </div>
                )}
                {inviteError && (
                  <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {inviteError}
                  </div>
                )}

                {status === "ACTIVE" && (
                  <button
                    onClick={() => { setInviteSuccess(null); setInviteError(null); setShowInviteModal(true); }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors mb-4"
                    style={{ color: "var(--primary)", border: "1px solid var(--primary)" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    Invite User
                  </button>
                )}

                {invitations.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No invitations yet.</p>
                ) : (
                  <div className="space-y-2">
                    {invitations.map((inv) => {
                      const isPending = inv.status === "PENDING";
                      const statusColor: Record<string, string> = {
                        PENDING: "#e8a020", ACCEPTED: "#24A37D", REVOKED: "#6b7280", EXPIRED: "#ef4444",
                      };
                      return (
                        <div key={inv.id} className="rounded-lg px-3 py-2.5" style={{ backgroundColor: "var(--bg-card)" }}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{inv.email}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {inv.role.replace("_", " ")} ·{" "}
                                <span style={{ color: statusColor[inv.status] ?? "#6b7280" }}>{inv.status}</span>
                              </p>
                            </div>
                            {isPending && (
                              <div className="flex gap-1.5 flex-shrink-0">
                                <button
                                  onClick={() => handleResendInvitation(inv.id)}
                                  title="Resend"
                                  className="text-xs px-2 py-1 rounded font-medium transition-colors"
                                  style={{ color: "var(--primary)", border: "1px solid var(--primary)" }}
                                >
                                  Resend
                                </button>
                                <button
                                  onClick={() => handleRevokeInvitation(inv.id)}
                                  title="Revoke"
                                  className="text-xs px-2 py-1 rounded font-medium transition-colors"
                                  style={{ color: "#dc2626", border: "1px solid #fecaca" }}
                                >
                                  Revoke
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SlideOverSection>
            )}
          </div>
        ) : null}
      </div>

      {showPlanModal && detail && (
        <EditPlanModal
          plans={plans}
          currentPlanId={detail.activePlan?.planId ?? null}
          tenantName={detail.name}
          onClose={() => setShowPlanModal(false)}
          onSubmit={handleAssign}
          saving={assigning}
        />
      )}

      {showInviteModal && (
        <InviteUserModal
          onClose={() => { setShowInviteModal(false); setInviteError(null); }}
          onSubmit={handleSendInvite}
          inviting={inviting}
          error={inviteError}
        />
      )}
    </SlideOver>
  );
}

export default function TenantsPage() {
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "SUSPENDED">("ALL");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sidebarTenantId, setSidebarTenantId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const handleSort = useCallback((field: string) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return field;
      }
      setSortDir("asc");
      return field;
    });
  }, []);

  const loadTenants = useCallback((p = 0, status = filterStatus) => {
    if (!token) return;
    setLoading(true);
    const params = new URLSearchParams({ size: String(PAGE_SIZE), page: String(p), sort: "createdAt,desc" });
    if (status !== "ALL") params.set("status", status);
    apiGet<ApiTenantPage>(`/api/v1/tenants?${params}`, token)
      .then((res) => {
        setData(res.content.map(mapTenant));
        setTotal(res.page.totalElements);
        setTotalPages(res.page.totalPages);
        setPage(p);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, filterStatus]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      apiGet<ApiTenantPage>(`/api/v1/tenants?size=${PAGE_SIZE}&page=0&sort=createdAt,desc`, token),
      apiGet<ApiPlan[]>("/api/v1/platform-plans?activeOnly=true", token),
    ])
      .then(([tenantPage, planList]) => {
        setData(tenantPage.content.map(mapTenant));
        setTotal(tenantPage.page.totalElements);
        setTotalPages(tenantPage.page.totalPages);
        setPlans(
          planList.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description ?? "",
            price: Number(p.price),
            currency: p.currency,
            billingCadence: p.billingCadence,
          }))
        );
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const active = data.filter((t) => t.status === "ACTIVE");
  const suspended = data.filter((t) => t.status === "SUSPENDED");
  const onPlans = data.filter((t) => t.planName !== null);
  const filtered =
    filterStatus === "ALL" ? data.filter((t) => t.status !== "ARCHIVED") : data.filter((t) => t.status === filterStatus);

  const sorted = sortField ? [...filtered].sort((a, b) => {
    const field = sortFieldMap[sortField];
    if (!field) return 0;
    const av = a[field];
    const bv = b[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = typeof av === "string" ? av.localeCompare(bv as string) : (av as number) - (bv as number);
    return sortDir === "asc" ? cmp : -cmp;
  }) : filtered;

  const handleSelectTenant = useCallback((t: Tenant) => {
    setSidebarTenantId(t.id);
  }, []);

  const handlePlanAssigned = useCallback(() => {
    loadTenants(page, filterStatus);
  }, [loadTenants, page, filterStatus]);

  const handleCreate = async (form: CreateForm) => {
    if (!token) return;
    setSaving(true);
    try {
      const created = await apiPost<ApiTenant>("/api/v1/tenants", {
        name: form.name,
        companyEmail: form.email,
        timezone: form.timezone,
        planId: form.selectedPlanId ?? null,
        customPlanPrice: form.customPrice ? parseFloat(form.customPrice) : null,
      }, token);
      setShowCreate(false);
      loadTenants(0, filterStatus);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create tenant");
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async (t: Tenant) => {
    if (!token) return;
    try {
      const updated = await apiPost<ApiTenant>(`/api/v1/tenants/${t.id}/suspend`, { reason: "" }, token);
      setData((prev) => prev.map((x) => (x.id === t.id ? mapTenant(updated) : x)));
      if (sidebarTenantId === t.id) setSidebarTenantId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to suspend tenant");
    }
  };

  const handleActivate = async (t: Tenant) => {
    if (!token) return;
    try {
      const updated = await apiPost<ApiTenant>(`/api/v1/tenants/${t.id}/reactivate`, {}, token);
      setData((prev) => prev.map((x) => (x.id === t.id ? mapTenant(updated) : x)));
      if (sidebarTenantId === t.id) setSidebarTenantId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to reactivate tenant");
    }
  };

  const statCards = [
    { label: "Total Tenants", value: total            },
    { label: "Active",        value: active.length    },
    { label: "Suspended",     value: suspended.length },
    { label: "On a Plan",     value: onPlans.length   },
  ];

  return (
    <div className="font-sans px-6 py-8 md:px-12 md:py-10 max-w-6xl mx-auto min-h-full flex flex-col" style={{ animation: "fade-in-up 0.2s ease-out both" }}>
      <div className="mb-8 border-l-4 pl-5 py-1" style={{ borderColor: "var(--primary)" }}>
        <p className="text-sm mb-1" style={{ color: "var(--primary)" }}>Super Admin</p>
        <h1 className="text-3xl font-bold" style={{ color: "#212529" }}>Tenants</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statCards.map((card, i) => (
          <div key={card.label} className="rounded-lg p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", animation: "fade-in-up 0.2s ease-out both", animationDelay: `${i * 30}ms` }}>
            <p className="text-sm mb-3" style={{ color: "#6c757d" }}>{card.label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: "#212529" }}>{loading ? "—" : card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center p-0.5 rounded-lg gap-0.5" style={{ backgroundColor: "var(--border)" }}>
          {(["ALL", "ACTIVE", "SUSPENDED"] as const).map((s) => (
            <button key={s} onClick={() => { setFilterStatus(s); loadTenants(0, s); }} className="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
              style={filterStatus === s
                ? { backgroundColor: "var(--nav-active)", color: "var(--nav-active-text)" }
                : { color: "#6b7280" }}>
              {s === "ALL" ? "All" : s === "ACTIVE" ? "Active" : "Suspended"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg text-white transition-opacity hover:opacity-90 flex-shrink-0 self-start md:self-auto"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Create Tenant
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <svg className="animate-spin mr-3" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading tenants…
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-lg" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-40">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm12 0v6m-3-3h6" />
          </svg>
          <p className="text-sm">No tenants found</p>
        </div>
      ) : (
        <TenantsTable data={sorted} onSuspend={handleSuspend} onActivate={handleActivate} onSelect={handleSelectTenant} sortField={sortField} sortDir={sortDir} onSort={handleSort} />
      )}
      </div>

      {!loading && !error && (
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={total}
            pageSize={PAGE_SIZE}
            onChange={(p) => loadTenants(p, filterStatus)}
          />
        </div>
      )}

      {showCreate && (
        <CreateTenantModal
          plans={plans}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          saving={saving}
        />
      )}

      <TenantSidebar
        tenantId={sidebarTenantId ?? 0}
        open={!!token && sidebarTenantId !== null}
        token={token ?? ""}
        plans={plans}
        onClose={() => setSidebarTenantId(null)}
        onDataChange={handlePlanAssigned}
        width="50vw"
      />
    </div>
  );
}
