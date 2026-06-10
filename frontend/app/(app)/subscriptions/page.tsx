"use client";

import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import {
  SubscriptionCreatedIcon, SubscriptionUpdatedIcon, SubscriptionActivatedIcon, SubscriptionPausedIcon,
  SubscriptionCancelledIcon, SubscriptionAutoCancelledIcon, SubscriptionDeletedIcon,
} from "@/components/Icons";
import SlideOver, { SlideOverField } from "@/components/SlideOver";
import { addCadence, cadenceLabel } from "@/lib/cadence";
import SearchSelect, { SearchOption } from "@/components/SearchSelect";
import Pagination from "@/components/Pagination";

const PAGE_SIZE = 15;

// ─── Types ───────────────────────────────────────────────────────────────────

type Subscription = {
  id: number;
  customerId: number;
  customerName: string;
  productId: number;
  productName: string;
  productPlanId: number | null;
  productPlanName: string | null;
  amount: number;
  currency: string;
  status: string;
  startsAt: string;
  endsAt: string | null;
  notes: string | null;
  createdAt: string;
};

type CustomerOption  = { id: number; name: string; email: string };
type ProductOption   = { id: number; name: string; currency: string; price: number; billingCadence: string };
type PlanOption      = { id: number; name: string; price: number; currency: string; billingCadence: string };

type SpringPage<T> = {
  content: T[];
  page: { totalElements: number; totalPages: number };
};

type HistoryEntry = {
  id: number;
  actorEmail: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  description: string | null;
  createdAt: string;
};

type AssignForm = {
  customerId:   string;
  customerName: string;
  productId:    string;
  planId:       string;
  customPrice:  string;
  startsAt:     string;
  endsAt:       string;
  notes:        string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function toDateInput(iso: string) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

function toInstant(dateStr: string): string {
  return new Date(dateStr).toISOString();
}

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

const ACTION_LABEL: Record<string, string> = {
  "SUBSCRIPTION.CREATED":        "Assigned",
  "SUBSCRIPTION.UPDATED":        "Updated",
  "SUBSCRIPTION.ACTIVATED":      "Activated",
  "SUBSCRIPTION.PAUSED":         "Paused",
  "SUBSCRIPTION.CANCELLED":      "Cancelled",
  "SUBSCRIPTION.AUTO_CANCELLED": "Auto-cancelled",
  "SUBSCRIPTION.DELETED":        "Deleted",
};

function parseStatus(json: string | null): string | null {
  if (!json) return null;
  try { return (JSON.parse(json) as { status?: string }).status ?? null; } catch { return null; }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  ACTIVE:    { bg: "#dcfce7", color: "#166534" },
  PAUSED:    { bg: "#fef9c3", color: "#854d0e" },
  CANCELLED: { bg: "#fee2e2", color: "#991b1b" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" style={s}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

const inputCls   = "w-full text-sm px-3 py-2 rounded-lg outline-none";
const inputStyle = { border: "1px solid var(--border)", backgroundColor: "#fff" };
const labelCls   = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

type AssignFormFieldsProps = {
  form:              AssignForm;
  onChange:          (k: keyof AssignForm, v: string) => void;
  onSearchCustomers: (q: string) => Promise<SearchOption[]>;
  products:          ProductOption[];
  plans:             PlanOption[];
  plansLoading:      boolean;
  onCreatePlan:      () => void;
  error:             string | null;
  endsAtAuto:        boolean;
};

function AssignFormFields({ form, onChange, onSearchCustomers, products, plans, plansLoading, onCreatePlan, error, endsAtAuto }: AssignFormFieldsProps) {
  const selectCls = `${inputCls} bg-white`;
  return (
    <div className="space-y-4">
      <div>
        <label className={labelCls}>Customer *</label>
        <SearchSelect
          value={form.customerId}
          displayValue={form.customerName}
          placeholder="Search customers…"
          onSearch={onSearchCustomers}
          onSelect={(opt) => {
            onChange("customerId", opt ? opt.id : "");
            onChange("customerName", opt ? opt.primary : "");
          }}
        />
      </div>
      <div>
        <label className={labelCls}>Product *</label>
        <select className={selectCls} style={inputStyle} value={form.productId} onChange={(e) => onChange("productId", e.target.value)}>
          <option value="">Select a product…</option>
          {products.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
        </select>
      </div>
      {form.productId && (
        <div>
          <label className={labelCls}>Plan <span className="normal-case font-normal text-gray-400">(optional)</span></label>
          {plansLoading ? (
            <p className="text-sm text-gray-400 py-2">Loading plans…</p>
          ) : (
            <div className="flex gap-2">
              <select className={selectCls} style={inputStyle} value={form.planId} onChange={(e) => onChange("planId", e.target.value)}>
                <option value="">No plan — use product default price</option>
                {plans.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name} — {p.currency} {Number(p.price).toFixed(2)} / {cadenceLabel(p.billingCadence)}
                  </option>
                ))}
              </select>
              <button type="button" onClick={onCreatePlan} className="flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold text-white whitespace-nowrap" style={{ backgroundColor: "var(--primary)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
          )}
        </div>
      )}
      <div>
        <label className={labelCls}>Custom price <span className="normal-case font-normal text-gray-400">(optional override)</span></label>
        <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle} value={form.customPrice} onChange={(e) => onChange("customPrice", e.target.value)} placeholder="Leave blank to use plan / product price" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Start date *</label>
          <input type="date" className={inputCls} style={inputStyle} value={form.startsAt} onChange={(e) => onChange("startsAt", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>End date <span className="normal-case font-normal text-gray-400">(optional)</span></label>
          <input type="date" className={inputCls} style={inputStyle} value={form.endsAt} onChange={(e) => onChange("endsAt", e.target.value)} />
          {endsAtAuto && form.endsAt && (
            <p className="text-xs text-gray-400 mt-1">Auto-set from billing cadence</p>
          )}
        </div>
      </div>
      <div>
        <label className={labelCls}>Notes</label>
        <textarea rows={3} className={inputCls} style={inputStyle} value={form.notes} onChange={(e) => onChange("notes", e.target.value)} placeholder="Internal notes…" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

const STAT_ICONS: Record<string, React.ReactNode> = {
  total: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
  active: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" />
    </svg>
  ),
  paused: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  ),
  cancelled: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" />
    </svg>
  ),
};

const STATUS_FILTERS = ["ALL", "ACTIVE", "PAUSED", "CANCELLED"] as const;
const EMPTY_ASSIGN: AssignForm = { customerId: "", customerName: "", productId: "", planId: "", customPrice: "", startsAt: todayInput(), endsAt: "", notes: "" };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const user  = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAdmin = user?.role === "TENANT_ADMIN";
  const tid = user?.tenantId;

  // List
  const [rows, setRows]           = useState<Subscription[]>([]);
  const [total, setTotal]         = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]           = useState(0);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("ALL");
  const [search, setSearch]       = useState("");

  // Stats
  const [activeCount,    setActiveCount]    = useState(0);
  const [pausedCount,    setPausedCount]    = useState(0);
  const [cancelledCount, setCancelledCount] = useState(0);

  // Detail panel
  const [selected, setSelected] = useState<Subscription | null>(null);
  const [editing,  setEditing]  = useState(false);
  const [editClosing, setEditClosing] = useState(false);
  const [editStartsAt, setEditStartsAt] = useState("");
  const [editEndsAt,   setEditEndsAt]   = useState("");
  const [editNotes,    setEditNotes]    = useState("");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Assign panel
  const [assigning,  setAssigning]  = useState(false);
  const [assignForm, setAssignForm] = useState<AssignForm>(EMPTY_ASSIGN);
  const [products,   setProducts]   = useState<ProductOption[]>([]);
  const [plans,      setPlans]      = useState<PlanOption[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [endsAtAuto, setEndsAtAuto] = useState(true);

  const [saving,    setSaving]    = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Plan creation dialog
  const [planCreateOpen, setPlanCreateOpen] = useState(false);
  const [planCreateClosing, setPlanCreateClosing] = useState(false);
  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanPrice, setNewPlanPrice] = useState("");
  const [newPlanCadence, setNewPlanCadence] = useState("MONTHLY");
  const [newPlanCurrency, setNewPlanCurrency] = useState("USD");

  // ── Load list ────────────────────────────────────────────────────────────

  const load = (f = filter, q = search, p = page) => {
    if (!token || !tid) return;
    setLoading(true);
    const params = new URLSearchParams({ size: String(PAGE_SIZE), page: String(p), sort: "createdAt,desc" });
    if (f !== "ALL") params.set("status", f);
    if (q.trim()) params.set("search", q.trim());
    apiGet<SpringPage<Subscription>>(`/api/v1/tenants/${tid}/customer-products?${params}`, token)
      .then((d) => { setRows(d.content); setTotal(d.page.totalElements); setTotalPages(d.page.totalPages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!token || !tid) return;
    const count = (s: string) =>
      apiGet<SpringPage<Subscription>>(`/api/v1/tenants/${tid}/customer-products?size=1&status=${s}`, token)
        .then((d) => d.page.totalElements).catch(() => 0);
    Promise.all([count("ACTIVE"), count("PAUSED"), count("CANCELLED")]).then(([a, p, c]) => {
      setActiveCount(a); setPausedCount(p); setCancelledCount(c);
    });
  }, [token, tid]);

  useEffect(() => { setPage(0); load(filter, search, 0); }, [token, user]);

  // ── Assign form helpers ──────────────────────────────────────────────────

  const searchCustomers = async (q: string): Promise<SearchOption[]> => {
    if (!token || !tid) return [];
    const params = new URLSearchParams({ size: "10", status: "ACTIVE" });
    if (q.trim()) params.set("search", q.trim());
    const d = await apiGet<SpringPage<CustomerOption>>(`/api/v1/tenants/${tid}/customers?${params}`, token);
    return d.content.map((c) => ({ id: String(c.id), primary: c.name, secondary: c.email }));
  };

  const openAssign = () => {
    setAssigning(true); setSelected(null); setEditing(false);
    setAssignForm({ ...EMPTY_ASSIGN, startsAt: todayInput() });
    setEndsAtAuto(true);
    setFormError(null);
    if (!token || !tid) return;
    apiGet<SpringPage<ProductOption>>(`/api/v1/tenants/${tid}/products?size=200&status=ACTIVE`, token)
      .then((d) => setProducts(d.content)).catch(() => {});
  };

  // Auto-fill "End date" from "Start date" + the selected plan's (or product's)
  // billing cadence, until the user manually edits the field.
  const computeEndsAt = (startsAt: string, productId: string, planId: string, plansList: PlanOption[]): string => {
    if (!startsAt) return "";
    const cadence = plansList.find((p) => String(p.id) === planId)?.billingCadence
      ?? products.find((p) => String(p.id) === productId)?.billingCadence;
    if (!cadence) return "";
    return addCadence(startsAt, cadence).toISOString().slice(0, 10);
  };

  const handleAssignChange = (k: keyof AssignForm, v: string) => {
    if (k === "endsAt") setEndsAtAuto(false);
    setAssignForm((prev) => {
      const next = { ...prev, [k]: v };
      if (k === "productId") {
        next.planId = "";
        setPlans([]);
        if (v) {
          setPlansLoading(true);
          apiGet<PlanOption[]>(`/api/v1/tenants/${tid}/products/${v}/plans`, token!)
            .then((d) => {
              setPlans(d);
              if (endsAtAuto) {
                setAssignForm((f) => ({ ...f, endsAt: computeEndsAt(f.startsAt, f.productId, f.planId, d) }));
              }
            })
            .catch(() => {}).finally(() => setPlansLoading(false));
        }
      }
      if (endsAtAuto && (k === "startsAt" || k === "productId" || k === "planId")) {
        next.endsAt = computeEndsAt(next.startsAt, next.productId, next.planId, k === "productId" ? [] : plans);
      }
      return next;
    });
  };

  const submitAssign = async () => {
    if (!token || !tid) return;
    if (!assignForm.customerId) { setFormError("Select a customer."); return; }
    if (!assignForm.productId)  { setFormError("Select a product."); return; }
    if (!assignForm.startsAt)   { setFormError("Start date is required."); return; }
    setSaving(true); setFormError(null);
    try {
      await apiPost(`/api/v1/tenants/${tid}/customers/${assignForm.customerId}/products`, {
        productId:   Number(assignForm.productId),
        planId:      assignForm.planId ? Number(assignForm.planId) : null,
        customPrice: assignForm.customPrice ? Number(assignForm.customPrice) : null,
        startsAt:    toInstant(assignForm.startsAt),
        endsAt:      assignForm.endsAt ? toInstant(assignForm.endsAt) : null,
        notes:       assignForm.notes.trim() || null,
      }, token);
      setAssigning(false);
      load();
    } catch (e) { setFormError(e instanceof Error ? e.message : "Failed to assign."); }
    finally { setSaving(false); }
  };

  const createPlan = async () => {
    if (!token || !tid || !assignForm.productId) return;
    if (!newPlanName.trim() || !newPlanPrice) { setFormError("Name and price are required."); return; }
    setSaving(true); setFormError(null);
    try {
      const created = await apiPost<PlanOption>(`/api/v1/tenants/${tid}/products/${assignForm.productId}/plans`, {
        name: newPlanName.trim(), price: Number(newPlanPrice),
        currency: newPlanCurrency, billingCadence: newPlanCadence,
      }, token);
      setPlanCreateClosing(true);
      setTimeout(() => { setPlanCreateOpen(false); setPlanCreateClosing(false); setFormError(null); }, 160);
      const updated = await apiGet<PlanOption[]>(`/api/v1/tenants/${tid}/products/${assignForm.productId}/plans`, token);
      setPlans(updated);
      setAssignForm((prev) => ({ ...prev, planId: String(created.id) }));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create plan.");
    } finally {
      setSaving(false);
    }
  };

  // ── History ──────────────────────────────────────────────────────────────

  const [history, setHistory]         = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadHistory = (sub: Subscription) => {
    if (!token || !isAdmin) return;
    setHistoryLoading(true);
    apiGet<SpringPage<HistoryEntry>>(
      `/api/v1/audit-logs/tenant?resourceTypes=CUSTOMER_PRODUCT&resourceId=${sub.id}&size=50&sort=createdAt,desc`,
      token
    )
      .then((d) => setHistory(d.content))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  };

  // ── Detail / edit helpers ────────────────────────────────────────────────

  const openDetail = (row: Subscription) => {
    setSelected(row); setEditing(false); setAssigning(false); setFormError(null);
    setMoreMenuOpen(false);
    setHistory([]); loadHistory(row);
  };

  useEffect(() => {
    if (!moreMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) setMoreMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [moreMenuOpen]);

  const startEdit = () => {
    if (!selected) return;
    setEditStartsAt(toDateInput(selected.startsAt));
    setEditEndsAt(selected.endsAt ? toDateInput(selected.endsAt) : "");
    setEditNotes(selected.notes ?? "");
    setFormError(null); setEditing(true);
  };

  const closeEdit = () => {
    setEditClosing(true);
    setTimeout(() => { setEditing(false); setEditClosing(false); setFormError(null); }, 160);
  };

  const saveEdit = async () => {
    if (!token || !tid || !selected) return;
    if (!editStartsAt) { setFormError("Start date is required."); return; }
    setSaving(true); setFormError(null);
    try {
      const updated = await apiPatch<Subscription>(
        `/api/v1/tenants/${tid}/customers/${selected.customerId}/products/${selected.id}`,
        { startsAt: toInstant(editStartsAt), endsAt: editEndsAt ? toInstant(editEndsAt) : null, notes: editNotes.trim() || null },
        token
      );
      setSelected(updated); setEditing(false); load();
    } catch (e) { setFormError(e instanceof Error ? e.message : "Failed to save."); }
    finally { setSaving(false); }
  };

  const updateStatus = async (status: string) => {
    if (!token || !tid || !selected) return;
    try {
      const updated = await apiPatch<Subscription>(
        `/api/v1/tenants/${tid}/customers/${selected.customerId}/products/${selected.id}/status`,
        { status }, token
      );
      setSelected(updated); load();
    } catch { /* ignore */ }
  };

  const deleteSubscription = async () => {
    if (!token || !tid || !selected) return;
    if (!confirm("Delete this subscription? This cannot be undone.")) return;
    try {
      await apiDelete(`/api/v1/tenants/${tid}/customers/${selected.customerId}/products/${selected.id}`, token);
      setSelected(null); load();
    } catch { /* ignore */ }
  };

  const closePanel = () => { setSelected(null); setEditing(false); setAssigning(false); setFormError(null); };

  const panelOpen = !!selected || assigning;

  const stats = [
    { label: "Total",     value: total,          icon: STAT_ICONS.total     },
    { label: "Active",    value: activeCount,    icon: STAT_ICONS.active    },
    { label: "Paused",    value: pausedCount,    icon: STAT_ICONS.paused    },
    { label: "Cancelled", value: cancelledCount, icon: STAT_ICONS.cancelled },
  ];

  return (
    <>
      <div className="px-6 py-8 md:px-10 max-w-7xl mx-auto space-y-6 min-h-full flex flex-col" style={{ animation: "fade-in-up 0.2s ease-out both" }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} total</p>
          </div>
          {isAdmin && (
            <button
              onClick={openAssign}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              Assign Subscription
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="relative overflow-hidden rounded-xl p-5"
              style={{
                backgroundColor: s.label === "Active" ? "#f3fbf6" : "var(--bg-card)",
                border: "1px solid var(--border)",
                borderTop: s.label === "Active" ? "3px solid #22c55e" : "1px solid var(--border)",
                animation: "fade-in-up 0.2s ease-out both",
                animationDelay: `${i * 30}ms`,
              }}
            >
              <div className="absolute -right-2 -bottom-2 opacity-10 text-gray-900">{s.icon}</div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{s.label}</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{loading ? "—" : s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Filter + Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: "var(--border)" }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(0); load(f, search, 0); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-md transition-all"
                style={filter === f
                  ? { backgroundColor: "#fff", color: "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }
                  : { color: "#6b7280" }}
              >
                {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-64">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search customer or product…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); load(filter, e.target.value, 0); }}
              className="w-full text-sm pl-9 pr-3 py-2 rounded-lg outline-none"
              style={{ border: "1px solid var(--border)", backgroundColor: "#eceeec" }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 rounded-xl" style={{ border: "1px dashed var(--border)" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-40">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            <p className="text-sm">No subscriptions found.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col" style={{ border: "1px solid var(--border)" }}>
            <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  {["Customer", "Product / Plan", "Amount", "Start date", "End date", "Status", ""].map((h) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${h === "Amount" ? "text-right" : "text-left"}`} style={{ backgroundColor: "var(--bg-card)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className="group cursor-pointer hover:bg-[#eef3ee] transition-colors"
                    style={{ borderTop: "1px solid var(--border)", backgroundColor: selected?.id === row.id ? "#eef3ee" : "#f8faf8", animation: "fade-in 0.15s ease-out both", animationDelay: `${i * 15}ms` }}
                    onClick={() => openDetail(row)}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{row.customerName}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{row.productName}</p>
                      {row.productPlanName && <p className="text-xs text-gray-500">{row.productPlanName}</p>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">
                      {row.currency} {Number(row.amount).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(row.startsAt)}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.endsAt ? formatDate(row.endsAt) : <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => openDetail(row)} className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
        </div>

        {!loading && (
          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={total}
            pageSize={PAGE_SIZE}
            onChange={(p) => { setPage(p); load(filter, search, p); }}
          />
        )}
      </div>

      {/* Slide-over */}
      <SlideOver open={panelOpen} onClose={closePanel} width="50vw">

        {/* ── Assign form ─────────────────────────────────────────────────── */}
        {assigning && (
          <>
            <div className="px-6 pt-6 pb-5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", backgroundColor: "#fff" }}>
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold text-gray-900">Assign Subscription</h2>
                <button onClick={closePanel} className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <AssignFormFields
                form={assignForm} onChange={handleAssignChange}
                onSearchCustomers={searchCustomers}
                products={products}
                plans={plans} plansLoading={plansLoading}
                endsAtAuto={endsAtAuto}
                onCreatePlan={() => { setNewPlanName(""); setNewPlanPrice(""); setNewPlanCadence("MONTHLY"); setNewPlanCurrency(assignForm.planId ? plans.find(p => String(p.id) === assignForm.planId)?.currency ?? "USD" : "USD"); setFormError(null); setPlanCreateOpen(true); }}
                error={formError}
              />
            </div>
            <div className="px-6 py-4 flex gap-3 flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
              <button onClick={closePanel} className="flex-1 py-2 text-sm font-medium rounded-lg text-gray-600" style={{ border: "1px solid var(--border)" }}>Cancel</button>
              <button onClick={submitAssign} disabled={saving} className="flex-1 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-60" style={{ backgroundColor: "var(--primary)" }}>
                {saving ? "Assigning…" : "Assign"}
              </button>
            </div>

              {/* Plan creation dialog */}
              {(planCreateOpen || planCreateClosing) && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center p-6"
                  style={{ backgroundColor: "rgba(0,0,0,0.08)", animation: `${planCreateClosing ? "fade-out 0.15s ease-out both" : "fade-in 0.15s ease-out both"}` }}
                  onClick={() => { setPlanCreateClosing(true); setTimeout(() => { setPlanCreateOpen(false); setPlanCreateClosing(false); setFormError(null); }, 160); }}
                >
                  <div
                    className="w-full rounded-2xl overflow-hidden"
                    style={{ maxWidth: "360px", backgroundColor: "#fff", border: "1px solid var(--border)", boxShadow: "0 8px 40px rgba(0,0,0,0.12)", animation: planCreateClosing ? "dialog-out 0.15s ease-in both" : "dialog-in 0.18s cubic-bezier(0.34,1.56,0.64,1) both" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                      <h3 className="text-base font-bold text-gray-900">Create plan</h3>
                      <button onClick={() => { setPlanCreateClosing(true); setTimeout(() => { setPlanCreateOpen(false); setPlanCreateClosing(false); setFormError(null); }, 160); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="px-5 py-4 space-y-4">
                      <div>
                        <label className={labelCls}>Plan name *</label>
                        <input className={inputCls} style={inputStyle} placeholder="e.g. Starter, Pro" value={newPlanName} onChange={(e) => setNewPlanName(e.target.value)} autoFocus />
                      </div>
                      <div>
                        <label className={labelCls}>Price *</label>
                        <div className="flex items-center gap-2">
                          <input className={`${inputCls} !w-20 text-center flex-shrink-0`} style={inputStyle} placeholder="USD" value={newPlanCurrency} onChange={(e) => setNewPlanCurrency(e.target.value.toUpperCase())} maxLength={3} />
                          <input type="number" min="0" step="0.01" className={`${inputCls} flex-1`} style={inputStyle} placeholder="0.00" value={newPlanPrice} onChange={(e) => setNewPlanPrice(e.target.value)} />
                        </div>
                      </div>
                      <div>
                        <label className={labelCls}>Billing cadence</label>
                        <div className="flex gap-2 flex-wrap mt-1">
                          {["WEEKLY", "FORTNIGHT", "MONTHLY", "QUARTERLY", "ANNUALLY"].map((c) => (
                            <button key={c} onClick={() => setNewPlanCadence(c)} className="text-xs px-3 py-1.5 rounded-md font-medium transition-all"
                              style={newPlanCadence === c ? { backgroundColor: "var(--primary)", color: "#fff" } : { border: "1px solid var(--border)", color: "#6b7280" }}>
                              {cadenceLabel(c)}
                            </button>
                          ))}
                        </div>
                      </div>
                      {formError && <p className="text-sm text-red-600">{formError}</p>}
                    </div>
                    <div className="px-5 py-4 flex gap-3" style={{ borderTop: "1px solid var(--border)" }}>
                      <button onClick={() => { setPlanCreateClosing(true); setTimeout(() => { setPlanCreateOpen(false); setPlanCreateClosing(false); setFormError(null); }, 160); }} className="flex-1 py-2 text-sm font-medium rounded-lg text-gray-600" style={{ border: "1px solid var(--border)" }}>Cancel</button>
                      <button onClick={createPlan} disabled={saving || !newPlanName.trim() || !newPlanPrice} className="flex-1 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-60" style={{ backgroundColor: "var(--primary)" }}>
                        {saving ? "Creating…" : "Create"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        {/* ── Detail / edit ────────────────────────────────────────────────── */}
        {selected && (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", backgroundColor: "#fff" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-gray-900">{selected.customerName}</h2>
                  <div className="mt-2"><StatusBadge status={selected.status} /></div>
                </div>
                <button onClick={closePanel} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div key={selected.id} className="flex-1 overflow-y-auto" style={{ animation: "slide-in-from-right 0.2s cubic-bezier(0.25,0.46,0.45,0.94) both" }}>
              <>
                  {/* Detail rows */}
                  <div className="px-6 py-2">
                    <SlideOverField label="Product">{selected.productName}</SlideOverField>
                    {selected.productPlanName && <SlideOverField label="Plan">{selected.productPlanName}</SlideOverField>}
                    <SlideOverField label="Amount">
                      <span className="font-semibold">{selected.currency} {Number(selected.amount).toFixed(2)}</span>
                    </SlideOverField>
                    <SlideOverField label="Starts">{formatDate(selected.startsAt)}</SlideOverField>
                    <SlideOverField label="Ends">
                      {selected.endsAt ? formatDate(selected.endsAt) : <span className="text-gray-400">No end date</span>}
                    </SlideOverField>
                    {selected.notes && <SlideOverField label="Notes"><span className="text-gray-500 italic">{selected.notes}</span></SlideOverField>}
                    <SlideOverField label="Created">{formatDateTime(selected.createdAt)}</SlideOverField>
                  </div>

                  {/* Actions */}
                  {isAdmin && (
                    <div className="px-6 pb-5 pt-2">
                      <div className="flex items-center gap-2">
                        {/* Primary action */}
                        <button onClick={startEdit} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: "var(--primary)" }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
                          Edit dates & notes
                        </button>

                        {/* Secondary: status transitions (non-destructive) */}
                        {selected.status === "ACTIVE" && (
                          <button onClick={() => updateStatus("PAUSED")} className="text-xs px-3 py-2 rounded-lg font-medium transition-colors hover:bg-yellow-50" style={{ color: "#854d0e", border: "1px solid #fde68a" }}>
                            Pause
                          </button>
                        )}
                        {selected.status === "PAUSED" && (
                          <button onClick={() => updateStatus("ACTIVE")} className="text-xs px-3 py-2 rounded-lg font-medium transition-colors hover:bg-green-50" style={{ color: "#166534", border: "1px solid #bbf7d0" }}>
                            Resume
                          </button>
                        )}

                        {/* Tertiary: destructive actions, grouped */}
                        <div className="relative ml-auto" ref={moreMenuRef}>
                          <button
                            onClick={() => setMoreMenuOpen((o) => !o)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            More
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                          </button>
                          {moreMenuOpen && (
                            <div
                              className="absolute right-0 top-full mt-1 w-52 rounded-lg overflow-hidden z-10"
                              style={{ backgroundColor: "#fff", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,0.1)", animation: "fade-in 0.12s ease-out both" }}
                            >
                              {(selected.status === "ACTIVE" || selected.status === "PAUSED") && (
                                <button
                                  onClick={() => { updateStatus("CANCELLED"); setMoreMenuOpen(false); }}
                                  className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg>
                                  Cancel subscription
                                </button>
                              )}
                              <button
                                onClick={() => { setMoreMenuOpen(false); deleteSubscription(); }}
                                className="w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                                style={{ borderTop: "1px solid var(--border)" }}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                                Delete subscription
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* History */}
                  {isAdmin && (
                    <div className="px-6 pb-6 pt-2">
                      <div style={{ borderTop: "1px solid var(--border)" }} className="pt-5">
                        <p className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">History</p>
                        {historyLoading ? (
                          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
                            <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                            Loading…
                          </div>
                        ) : history.length === 0 ? (
                          <p className="text-sm text-gray-400 italic">No history found.</p>
                        ) : (
                          <div className="space-y-2">
                            {history.map((h) => {
                              const SUB_ICON: Record<string, (p?: any) => React.ReactNode> = {
                                "SUBSCRIPTION.CREATED":      (p) => <SubscriptionCreatedIcon size={16} {...p} />,
                                "SUBSCRIPTION.UPDATED":      (p) => <SubscriptionUpdatedIcon size={16} {...p} />,
                                "SUBSCRIPTION.ACTIVATED":    (p) => <SubscriptionActivatedIcon size={16} {...p} />,
                                "SUBSCRIPTION.PAUSED":       (p) => <SubscriptionPausedIcon size={16} {...p} />,
                                "SUBSCRIPTION.CANCELLED":    (p) => <SubscriptionCancelledIcon size={16} {...p} />,
                                "SUBSCRIPTION.AUTO_CANCELLED": (p) => <SubscriptionAutoCancelledIcon size={16} {...p} />,
                                "SUBSCRIPTION.DELETED":      (p) => <SubscriptionDeletedIcon size={16} {...p} />,
                              };
                              const SubIcon = SUB_ICON[h.action];
                              return (
                                <div key={h.id} className="flex gap-2.5 px-1 py-1.5 rounded-lg hover:bg-[#f3f6f3] transition-colors">
                                  <span className="flex-shrink-0 mt-0.5" style={{ color: "var(--primary)" }}>
                                    {SubIcon ? <SubIcon /> : null}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-800 leading-snug">{h.description ?? ACTION_LABEL[h.action] ?? h.action}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {h.actorEmail} · {formatDateTime(h.createdAt)}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
            </div>

            {/* Edit dialog */}
            {(editing || editClosing) && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center p-6"
                style={{ backgroundColor: "rgba(0,0,0,0.08)", animation: editClosing ? "fade-out 0.15s ease-out both" : "fade-in 0.15s ease-out both" }}
                onClick={closeEdit}
              >
                <div
                  className="w-full rounded-2xl overflow-hidden"
                  style={{ maxWidth: "400px", backgroundColor: "#fff", border: "1px solid var(--border)", boxShadow: "0 8px 40px rgba(0,0,0,0.12)", animation: editClosing ? "dialog-out 0.15s ease-in both" : "dialog-in 0.18s cubic-bezier(0.34,1.56,0.64,1) both" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    <h3 className="text-base font-bold text-gray-900">Edit Subscription</h3>
                    <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Start date *</label>
                        <input type="date" className={inputCls} style={inputStyle} value={editStartsAt} onChange={(e) => setEditStartsAt(e.target.value)} />
                      </div>
                      <div>
                        <label className={labelCls}>End date <span className="normal-case font-normal text-gray-400">(optional)</span></label>
                        <input type="date" className={inputCls} style={inputStyle} value={editEndsAt} onChange={(e) => setEditEndsAt(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Notes</label>
                      <textarea rows={4} className={inputCls} style={inputStyle} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Internal notes…" />
                    </div>
                    {formError && <p className="text-sm text-red-600">{formError}</p>}
                  </div>
                  <div className="px-5 py-4 flex gap-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <button onClick={closeEdit} className="flex-1 py-2 text-sm font-medium rounded-lg text-gray-600" style={{ border: "1px solid var(--border)" }}>Cancel</button>
                    <button onClick={saveEdit} disabled={saving} className="flex-1 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-60" style={{ backgroundColor: "var(--primary)" }}>{saving ? "Saving…" : "Save"}</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </SlideOver>
    </>
  );
}
