"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuthStore } from "@/store/authStore";
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import SlideOver, { SlideOverField, SlideOverHeader, SlideOverSection } from "@/components/SlideOver";
import { cadenceLabel, CADENCE_LABELS, cadenceBadgeStyle } from "@/lib/cadence";

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
      setWidths((prev) => prev.map((w, i) => (i === col ? Math.max(60, startW + (e.clientX - startX)) : w)));
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

type Plan = {
  id: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCadence: string;
  status: "ACTIVE" | "ARCHIVED";
  createdAt: string;
};

type ApiPlan = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billingCadence: string;
  status: string;
  createdAt: string;
};


function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function mapPlan(p: ApiPlan): Plan {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? "",
    price: Number(p.price),
    currency: p.currency,
    billingCadence: p.billingCadence,
    status: p.status as "ACTIVE" | "ARCHIVED",
    createdAt: formatDate(p.createdAt),
  };
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "ACTIVE";
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-md text-xs font-semibold"
      style={{ backgroundColor: active ? "#24A37D" : "#6b7280", color: "#fff" }}
    >
      {active ? "Active" : "Archived"}
    </span>
  );
}

function SortIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="inline ml-1.5 opacity-40">
      <path d="m7 15 5 5 5-5" /><path d="m7 9 5-5 5 5" />
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

const ColIcon = {
  text: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" className="inline mr-1.5 opacity-60 flex-shrink-0">
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7c0-.9319 0-1.3978.1522-1.7654a2 2 0 0 1 1.0824-1.0824C5.6022 4 6.0681 4 7 4h10c.9319 0 1.3978 0 1.7654.1522.49.203.8794.5924 1.0824 1.0824C20 5.6022 20 6.0681 20 7M9 20h6M12 4v16" />
    </svg>
  ),
  dollar: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" className="inline mr-1.5 opacity-60 flex-shrink-0">
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  status: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" className="inline mr-1.5 opacity-60 flex-shrink-0">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m9 12 2 2 4-4" />
    </svg>
  ),
};

const headers: { label: string; icon?: React.ReactNode; sortable?: boolean }[] = [
  { label: "Plan",        icon: ColIcon.text,   sortable: true  },
  { label: "Description", icon: ColIcon.text                    },
  { label: "Price",       icon: ColIcon.dollar, sortable: true  },
  { label: "Cadence",     icon: ColIcon.text                    },
  { label: "Status",      icon: ColIcon.status                  },
  { label: "Created",     icon: ColIcon.text,   sortable: true  },
  { label: ""                                                    },
];

type ModalMode = "create" | "edit";

type FormState = {
  name: string;
  description: string;
  price: string;
  currency: string;
  billingCadence: string;
};

const emptyForm: FormState = { name: "", description: "", price: "", currency: "USD", billingCadence: "MONTHLY" };

function PlanModal({
  mode,
  initial,
  onClose,
  onSubmit,
  saving,
}: {
  mode: ModalMode;
  initial?: FormState;
  onClose: () => void;
  onSubmit: (f: FormState) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial ?? emptyForm);
  const [portalMounted, setPortalMounted] = useState(false);
  useEffect(() => setPortalMounted(true), []);
  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.18)" }}>
      <div className="rounded-xl shadow-2xl w-full max-w-md mx-4 p-7" style={{ backgroundColor: "#f8faf8", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">{mode === "create" ? "Create Plan" : "Edit Plan"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Plan Name</label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Growth Monthly"
              className="w-full text-sm px-3 py-2 rounded-lg outline-none"
              style={{ border: "1px solid var(--border)", backgroundColor: "#fff" }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Short description shown to tenants"
              rows={2}
              className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-none"
              style={{ border: "1px solid var(--border)", backgroundColor: "#fff" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Price</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="0.00"
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{ border: "1px solid var(--border)", backgroundColor: "#fff" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{ border: "1px solid var(--border)", backgroundColor: "#fff" }}
              >
                {["USD", "EUR", "GBP", "NPR", "AUD", "CAD"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Billing Cadence</label>
            <select
              value={form.billingCadence}
              onChange={(e) => set("billingCadence", e.target.value)}
              className="w-full text-sm px-3 py-2 rounded-lg outline-none"
              style={{ border: "1px solid var(--border)", backgroundColor: "#fff" }}
            >
              {Object.entries(cadenceLabel).map(([v, label]) => (
                <option key={v} value={v}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-7">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors"
            style={{ border: "1px solid var(--border)", color: "#4b4b4b" }}
          >
            Cancel
          </button>
          <button
            onClick={() => { if (form.name && form.price) onSubmit(form); }}
            disabled={saving || !form.name || !form.price}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
            style={{ backgroundColor: "var(--primary)", opacity: saving ? 0.7 : 1 }}
          >
            {saving && (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            {mode === "create" ? "Create Plan" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );

  if (!portalMounted) return null;
  return createPortal(modal, document.body);
}

function PlansTable({ data, onSelect }: { data: Plan[]; onSelect: (p: Plan) => void }) {
  const cols = [120, 220, 100, 130, 110, 130];
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
                  <span className="truncate flex items-center pr-2">{h.icon}{h.label}{h.sortable && <SortIcon />}</span>
                  {i < headers.length - 1 && <ResizeHandle onMouseDown={(e) => onMouseDown(i, e)} />}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.id}
                onClick={() => onSelect(row)}
                className="group bg-[#f8faf8] hover:bg-[#eef3ee] transition-colors cursor-pointer"
                style={{ borderTop: "1px solid var(--border)", animation: "fade-in 0.15s ease-out both", animationDelay: `${i * 15}ms`, opacity: row.status === "ARCHIVED" ? 0.65 : 1 }}
              >
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 truncate overflow-hidden">{row.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500 truncate overflow-hidden">{row.description}</td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900 truncate overflow-hidden">
                  {row.currency} {row.price.toLocaleString()}
                </td>
                <td className="px-4 py-3 overflow-hidden">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded" style={cadenceBadgeStyle(row.billingCadence)}>
                    {cadenceLabel(row.billingCadence)}
                  </span>
                </td>
                <td className="px-4 py-3 overflow-hidden"><StatusBadge status={row.status} /></td>
                <td className="px-4 py-3 text-sm text-gray-500 truncate overflow-hidden">{row.createdAt}</td>
                <td className="px-4 py-3 text-sm text-gray-400 text-right pr-3">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-0 group-hover:opacity-40 transition-opacity inline">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function PlanBadge({ status }: { status: string }) {
  const active = status === "ACTIVE";
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold"
      style={{ backgroundColor: active ? "#dcfce7" : "#f3f4f6", color: active ? "#16a34a" : "#6b7280" }}>
      {active ? "Active" : "Archived"}
    </span>
  );
}

function PlanSidebar({
  plan,
  open,
  token,
  onClose,
  onSave,
  onArchive,
  saving,
}: {
  plan: Plan | null;
  open: boolean;
  token: string | null;
  onClose: () => void;
  onSave: (form: FormState) => void;
  onArchive: () => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [tenants, setTenants] = useState<{ id: number; name: string; status: string }[] | null>(null);

  useEffect(() => {
    if (open && plan && token) {
      setForm({
        name: plan.name,
        description: plan.description,
        price: String(plan.price),
        currency: plan.currency,
        billingCadence: plan.billingCadence,
      });
      setEditing(false);
      setTenants(null);
      apiGet<{ content: { id: number; name: string; status: string; activePlan: { planName: string } | null }[] }>("/api/v1/tenants?size=100", token)
        .then((res) => setTenants(res.content.filter((t) => t.activePlan?.planName === plan.name)))
        .catch(() => setTenants([]));
    }
  }, [open, plan, token]);

  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleCancel = () => {
    if (plan) {
      setForm({
        name: plan.name,
        description: plan.description,
        price: String(plan.price),
        currency: plan.currency,
        billingCadence: plan.billingCadence,
      });
    }
    setEditing(false);
  };

  const cadenceOptions = Object.entries(CADENCE_LABELS);

  return (
    <SlideOver open={open} onClose={onClose}>
      <SlideOverHeader
        title={editing ? "Edit Plan" : (plan?.name ?? "")}
        badge={!editing && plan ? <PlanBadge status={plan.status} /> : undefined}
        onBack={editing ? handleCancel : undefined}
        actions={!editing && plan ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors"
              style={{ border: "1px solid var(--border)", color: "#374151", backgroundColor: "#f9fafb" }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" />
              </svg>
              Edit
            </button>
            {plan.status === "ACTIVE" && (
              <button
                onClick={onArchive}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-colors"
                style={{ border: "1px solid #fecaca", color: "#dc2626", backgroundColor: "#fff5f5" }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="21 8 21 21 3 21 3 8" /><rect width="22" height="5" x="1" y="3" /><line x1="10" x2="14" y1="12" y2="12" />
                </svg>
                Archive
              </button>
            )}
          </div>
        ) : undefined}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto">
        {plan && !editing && (
          <>
            <SlideOverSection>
              <SlideOverField label="Description">
                {plan.description || <span className="text-gray-400 italic">No description</span>}
              </SlideOverField>
              <SlideOverField label="Price">
                {plan.currency} {plan.price.toLocaleString()}
              </SlideOverField>
              <SlideOverField label="Billing cadence">
                {cadenceLabel(plan.billingCadence)}
              </SlideOverField>
              <SlideOverField label="Status">
                <PlanBadge status={plan.status} />
              </SlideOverField>
            </SlideOverSection>

            <SlideOverSection title={tenants ? `Subscribed tenants (${tenants.length})` : "Subscribed tenants"}>
              {tenants === null ? (
                <p className="text-sm text-gray-400">Loading…</p>
              ) : tenants.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No tenants on this plan.</p>
              ) : (
                <div className="space-y-1">
                  {tenants.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-1.5 px-2 rounded-md" style={{ backgroundColor: "#f8faf8" }}>
                      <span className="text-sm font-medium text-gray-800">{t.name}</span>
                      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${t.status === "ACTIVE" ? "text-green-700 bg-green-100" : t.status === "SUSPENDED" ? "text-yellow-700 bg-yellow-100" : "text-gray-500 bg-gray-100"}`}>
                        {t.status.charAt(0) + t.status.slice(1).toLowerCase()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </SlideOverSection>

          </>
        )}
        {plan && editing && (
          <div className="px-6 py-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Plan Name</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Growth Monthly"
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{ border: "1px solid var(--border)", backgroundColor: "#fff" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Short description shown to tenants"
                rows={2}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none resize-none"
                style={{ border: "1px solid var(--border)", backgroundColor: "#fff" }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Price</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="0.00"
                  className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                  style={{ border: "1px solid var(--border)", backgroundColor: "#fff" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Currency</label>
                <select
                  value={form.currency}
                  onChange={(e) => set("currency", e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                  style={{ border: "1px solid var(--border)", backgroundColor: "#fff" }}
                >
                  {["USD", "EUR", "GBP", "NPR", "AUD", "CAD"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Billing Cadence</label>
              <select
                value={form.billingCadence}
                onChange={(e) => set("billingCadence", e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg outline-none"
                style={{ border: "1px solid var(--border)", backgroundColor: "#fff" }}
              >
                {cadenceOptions.map(([v, label]) => (
                  <option key={v} value={v}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg transition-colors"
                style={{ border: "1px solid var(--border)", color: "#4b4b4b" }}
              >
                Cancel
              </button>
              <button
                onClick={() => { if (form.name && form.price) onSave(form); }}
                disabled={saving || !form.name || !form.price}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg text-white transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                style={{ backgroundColor: "var(--primary)", opacity: saving ? 0.7 : 1 }}
              >
                {saving && (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                )}
                Save Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </SlideOver>
  );
}

export default function PlatformPlansPage() {
  const token = useAuthStore((s) => s.token);
  const [data, setData] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: ModalMode; plan?: Plan } | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiGet<ApiPlan[]>("/api/v1/platform-plans", token)
      .then((res) => setData(res.map(mapPlan)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const activePlans = data.filter((p) => p.status === "ACTIVE");
  const archivedPlans = data.filter((p) => p.status === "ARCHIVED");
  const filtered = filterStatus === "ALL" ? data : data.filter((p) => p.status === filterStatus);

  const handleCreate = async (form: FormState) => {
    if (!token) return;
    setSaving(true);
    try {
      const created = await apiPost<ApiPlan>("/api/v1/platform-plans", {
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        currency: form.currency,
        billingCadence: form.billingCadence,
      }, token);
      setData((prev) => [mapPlan(created), ...prev]);
      setModal(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create plan");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (form: FormState) => {
    if (!token || !selectedPlan) return;
    setSaving(true);
    try {
      const updated = await apiPatch<ApiPlan>(`/api/v1/platform-plans/${selectedPlan.id}`, {
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price),
        currency: form.currency,
        billingCadence: form.billingCadence,
      }, token);
      setData((prev) => prev.map((p) => (p.id === selectedPlan.id ? mapPlan(updated) : p)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update plan");
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (plan: Plan) => {
    if (!token) return;
    try {
      const archived = await apiPost<ApiPlan>(`/api/v1/platform-plans/${plan.id}/archive`, {}, token);
      setData((prev) => prev.map((p) => (p.id === plan.id ? mapPlan(archived) : p)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to archive plan");
    }
  };

  const statCards = [
    { label: "Total Plans",      value: data.length         },
    { label: "Active Plans",     value: activePlans.length  },
    { label: "Archived Plans",   value: archivedPlans.length},
  ];

  return (
    <div className="font-sans px-6 py-8 md:px-12 md:py-10 max-w-6xl mx-auto" style={{ animation: "fade-in-up 0.2s ease-out both" }}>
      <div className="mb-8 border-l-4 pl-5 py-1" style={{ borderColor: "var(--primary)" }}>
        <p className="text-sm mb-1" style={{ color: "var(--primary)" }}>Super Admin</p>
        <h1 className="text-3xl font-bold" style={{ color: "#212529" }}>Platform Plans</h1>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {statCards.map((card, i) => (
          <div key={card.label} className="rounded-lg p-5" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", animation: "fade-in-up 0.2s ease-out both", animationDelay: `${i * 30}ms` }}>
            <p className="text-sm mb-3" style={{ color: "#6c757d" }}>{card.label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: "#212529" }}>{loading ? "—" : card.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="flex items-center p-0.5 rounded-lg gap-0.5" style={{ backgroundColor: "var(--border)" }}>
          {(["ALL", "ACTIVE", "ARCHIVED"] as const).map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className="text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
              style={filterStatus === s
                ? { backgroundColor: "#fff", color: "var(--primary)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }
                : { color: "#6b7280" }}>
              {s === "ALL" ? "All" : s === "ACTIVE" ? "Active" : "Archived"}
            </button>
          ))}
        </div>
        <button
          onClick={() => setModal({ mode: "create" })}
          className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg text-white flex-shrink-0 transition-opacity hover:opacity-90"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Create Plan
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <svg className="animate-spin mr-3" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          Loading plans…
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
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <p className="text-sm">No plans found</p>
        </div>
      ) : (
        <PlansTable
          data={filtered}
          onSelect={setSelectedPlan}
        />
      )}

      {!loading && !error && (
        <p className="mt-4 text-sm text-gray-500">{filtered.length} plan{filtered.length !== 1 ? "s" : ""}</p>
      )}

      <PlanSidebar
        plan={selectedPlan}
        open={selectedPlan !== null}
        token={token}
        onClose={() => setSelectedPlan(null)}
        onSave={handleEdit}
        onArchive={() => { if (selectedPlan) { handleArchive(selectedPlan); setSelectedPlan(null); } }}
        saving={saving}
      />

      {modal?.mode === "create" && (
        <PlanModal
          mode="create"
          onClose={() => setModal(null)}
          onSubmit={handleCreate}
          saving={saving}
        />
      )}
    </div>
  );
}
