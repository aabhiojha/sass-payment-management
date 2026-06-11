"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import SlideOver, { SlideOverField } from "@/components/SlideOver";
import Pagination from "@/components/Pagination";
import { addCadence } from "@/lib/cadence";
import { titleCase } from "@/lib/format";

const PAGE_SIZE = 15;

// ─── Types ───────────────────────────────────────────────────────────────────

type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
};

type Subscription = {
  id: number;
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
};

type Product = {
  id: number;
  name: string;
  price: number;
  currency: string;
  status: string;
  billingCadence: string;
};

type Plan = {
  id: number;
  productId: number;
  name: string;
  price: number;
  currency: string;
  billingCadence: string;
};

const SUBSCRIPTION_STATUSES = ["ACTIVE", "PAUSED", "CANCELLED"] as const;

type Reminder = {
  id: number;
  customerProductId: number;
  status: string;
  daysBeforeExpiry: number;
  sentAt: string | null;
  createdAt: string;
};

type SpringPage<T> = {
  content: T[];
  page: { totalElements: number; totalPages: number; size: number; number: number };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  return new Date(value).toISOString();
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

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
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const { col: c, startX, startW } = dragging.current;
      setWidths((prev) => prev.map((w, i) => (i === c ? Math.max(60, startW + (ev.clientX - startX)) : w)));
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(email).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
      className="flex items-center gap-1.5 transition-colors text-left group"
    >
      {copied ? (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary)" }}><polyline points="20 6 9 17 4 12" /></svg>
          <span className="text-xs font-medium" style={{ color: "var(--primary)" }}>Copied!</span>
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-gray-400"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
          <span className="group-hover:underline">{email}</span>
        </>
      )}
    </button>
  );
}

const CUSTOMER_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  ACTIVE:  { bg: "#24A37D", color: "#fff" },
  DELETED: { bg: "#dc2626", color: "#fff" },
};

function StatusBadge({ status }: { status: string }) {
  const s = CUSTOMER_STATUS_COLORS[status] ?? { bg: "#9ca3af", color: "#fff" };
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: s.bg, color: s.color }}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
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
  return <div onMouseDown={onMouseDown} className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-md-primary/20 transition-colors" />;
}

const ColIcon = {
  text: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" className="inline mr-1.5 opacity-60 flex-shrink-0"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7c0-.9319 0-1.3978.1522-1.7654a2 2 0 0 1 1.0824-1.0824C5.6022 4 6.0681 4 7 4h10c.9319 0 1.3978 0 1.7654.1522.49.203.8794.5924 1.0824 1.0824C20 5.6022 20 6.0681 20 7M9 20h6M12 4v16" /></svg>,
  status: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" className="inline mr-1.5 opacity-60 flex-shrink-0"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m9 12 2 2 4-4" /></svg>,
  date: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" className="inline mr-1.5 opacity-60 flex-shrink-0"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10H3m13-8v4M8 2v4m-.2 16h8.4c1.6802 0 2.5202 0 3.162-.327a3 3 0 0 0 1.311-1.311C21 19.7202 21 18.8802 21 17.2V8.8c0-1.6802 0-2.5202-.327-3.162a3 3 0 0 0-1.311-1.311C18.7202 4 17.8802 4 16.2 4H7.8c-1.6802 0-2.5202 0-3.162.327a3 3 0 0 0-1.311 1.311C3 6.2798 3 7.1198 3 8.8v8.4c0 1.6802 0 2.5202.327 3.162a3 3 0 0 0 1.311 1.311C5.2798 22 6.1198 22 7.8 22" /></svg>,
  email: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" width="13" height="13" className="inline mr-1.5 opacity-60 flex-shrink-0"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m2 7 8.1649 5.7154c.6612.4629.9918.6943 1.3514.7839.3176.0792.6498.0792.9674 0 .3596-.0896.6902-.321 1.3514-.7839L22 7M6.8 20h10.4c1.6802 0 2.5202 0 3.162-.327a3 3 0 0 0 1.311-1.311C22 17.7202 22 16.8802 22 15.2V8.8c0-1.6802 0-2.5202-.327-3.162a3 3 0 0 0-1.311-1.311C19.7202 4 18.8802 4 17.2 4H6.8c-1.6802 0-2.5202 0-3.162.327a3 3 0 0 0-1.311 1.311C2 6.2798 2 7.1198 2 8.8v6.4c0 1.6802 0 2.5202.327 3.162a3 3 0 0 0 1.311 1.311C4.2798 20 5.1198 20 6.8 20" /></svg>,
};

const TABLE_HEADERS: { label: string; icon?: React.ReactNode; sortable?: boolean }[] = [
  { label: "Name",   icon: ColIcon.text,   sortable: true },
  { label: "Email",  icon: ColIcon.email                  },
  { label: "Phone",  icon: ColIcon.text                   },
  { label: "Status", icon: ColIcon.status                 },
  { label: "Joined", icon: ColIcon.date,   sortable: true },
  { label: ""                                              },
];

const STATUS_FILTERS = ["ALL", "ACTIVE", "DELETED"] as const;

const inputCls   = "w-full text-sm px-4 h-11 rounded-t-[12px] rounded-b-none outline-none transition-colors duration-200";
const inputStyle = { borderBottom: "2px solid var(--color-md-outline)", backgroundColor: "var(--bg-search)" };
const labelCls   = "block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1";

type FormFieldsProps = {
  name: string; onName: (v: string) => void;
  email: string; onEmail: (v: string) => void;
  phone: string; onPhone: (v: string) => void;
  address: string; onAddress: (v: string) => void;
  notes: string; onNotes: (v: string) => void;
  error: string | null;
};

function FormFields({ name, onName, email, onEmail, phone, onPhone, address, onAddress, notes, onNotes, error }: FormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className={labelCls}>Name *</label><input className={inputCls} style={inputStyle} value={name} onChange={(e) => onName(e.target.value)} placeholder="Full name" /></div>
        <div><label className={labelCls}>Email *</label><input type="email" className={inputCls} style={inputStyle} value={email} onChange={(e) => onEmail(e.target.value)} placeholder="email@example.com" /></div>
      </div>
      <div><label className={labelCls}>Phone</label><input className={inputCls} style={inputStyle} value={phone} onChange={(e) => onPhone(e.target.value)} placeholder="+977 980000000" /></div>
      <div><label className={labelCls}>Address</label><textarea rows={2} className={inputCls} style={inputStyle} value={address} onChange={(e) => onAddress(e.target.value)} placeholder="Street, city, country" /></div>
      <div><label className={labelCls}>Notes</label><textarea rows={3} className={inputCls} style={inputStyle} value={notes} onChange={(e) => onNotes(e.target.value)} placeholder="Internal notes…" /></div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

type SubscriptionFormData = {
  productId: number | null;
  planId: number | null;
  customPrice: string;
  startsAt: string;
  endsAt: string;
  notes: string;
};

function SubscriptionModal({
  mode,
  products,
  plans,
  onProductChange,
  form,
  setForm,
  onClose,
  onSubmit,
  saving,
  error,
}: {
  mode: "create" | "edit";
  products: Product[];
  plans: Plan[];
  onProductChange: (productId: number) => void;
  form: SubscriptionFormData;
  setForm: React.Dispatch<React.SetStateAction<SubscriptionFormData>>;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
  error: string | null;
}) {
  const [closing, setClosing] = useState(false);
  const close = () => { setClosing(true); setTimeout(onClose, 150); };

  // Auto-fill "Ends At" from "Starts At" + the selected plan's (or product's) billing
  // cadence, until the user manually edits the field.
  const [endsAtAuto, setEndsAtAuto] = useState(mode === "create");

  useEffect(() => {
    if (mode !== "create" || !endsAtAuto || !form.startsAt) return;
    const cadence = plans.find((p) => p.id === form.planId)?.billingCadence
      ?? products.find((p) => p.id === form.productId)?.billingCadence;
    if (!cadence) return;
    const next = addCadence(form.startsAt, cadence);
    const pad = (n: number) => String(n).padStart(2, "0");
    const value = `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}T${pad(next.getHours())}:${pad(next.getMinutes())}`;
    setForm((f) => (f.endsAt === value ? f : { ...f, endsAt: value }));
  }, [mode, endsAtAuto, form.startsAt, form.productId, form.planId, products, plans, setForm]);

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center p-5"
      style={{ backgroundColor: "rgba(0,0,0,0.08)", animation: closing ? "fade-out 0.15s ease-out both" : "fade-in 0.15s ease-out both" }}
      onClick={close}
    >
      <div
        className="w-full rounded-2xl overflow-hidden flex flex-col"
        style={{ maxWidth: "440px", maxHeight: "85dvh", backgroundColor: "var(--bg-app)", boxShadow: "0 8px 40px rgba(28,27,31,0.14)", animation: closing ? "dialog-out 0.15s ease-in both" : "dialog-in 0.18s cubic-bezier(0.34,1.56,0.64,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <h3 className="text-base font-bold text-gray-900">{mode === "create" ? "Add Subscription" : "Edit Subscription"}</h3>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {mode === "create" && (
            <>
              <div>
                <label className={labelCls}>Product *</label>
                <select
                  className={inputCls}
                  style={inputStyle}
                  value={form.productId ?? ""}
                  onChange={(e) => onProductChange(Number(e.target.value))}
                >
                  <option value="">Select a product…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{titleCase(p.name)} ({p.currency} {Number(p.price).toFixed(2)})</option>
                  ))}
                </select>
              </div>

              {plans.length > 0 && (
                <div>
                  <label className={labelCls}>Plan</label>
                  <select
                    className={inputCls}
                    style={inputStyle}
                    value={form.planId ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value ? Number(e.target.value) : null }))}
                  >
                    <option value="">No plan (use product price)</option>
                    {plans.map((pl) => (
                      <option key={pl.id} value={pl.id}>{titleCase(pl.name)} ({pl.currency} {Number(pl.price).toFixed(2)})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={labelCls}>Custom Price (optional)</label>
                <input
                  type="number" step="0.01" min="0"
                  className={inputCls} style={inputStyle}
                  value={form.customPrice}
                  onChange={(e) => setForm((f) => ({ ...f, customPrice: e.target.value }))}
                  placeholder="Leave blank to use product/plan price"
                />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Starts At</label>
              <input
                type="datetime-local"
                className={inputCls} style={inputStyle}
                value={form.startsAt}
                onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
              />
            </div>
            <div>
              <label className={labelCls}>Ends At</label>
              <input
                type="datetime-local"
                className={inputCls} style={inputStyle}
                value={form.endsAt}
                onChange={(e) => { setEndsAtAuto(false); setForm((f) => ({ ...f, endsAt: e.target.value })); }}
              />
              {mode === "create" && endsAtAuto && form.endsAt && (
                <p className="text-xs text-gray-400 mt-1">Auto-set from billing cadence</p>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              rows={3} className={inputCls} style={inputStyle}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Internal notes…"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 flex gap-3 flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <button onClick={close} className="flex-1 py-2 text-sm font-medium rounded-full text-gray-600 hover:bg-md-primary/5 active:scale-95 transition-all duration-300 ease-emphasized" style={{ border: "1px solid var(--border)" }}>Cancel</button>
          <button
            onClick={onSubmit}
            disabled={saving || (mode === "create" && !form.productId)}
            className="flex-1 py-2 text-sm font-medium rounded-full text-white active:scale-95 disabled:opacity-60"
            style={{ backgroundColor: "var(--primary)" }}
          >
            {saving ? "Saving…" : mode === "create" ? "Add Subscription" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const user  = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAdmin = user?.role === "TENANT_ADMIN";
  const tid = user?.tenantId;

  // List
  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [total, setTotal]           = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage]             = useState(0);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("ALL");
  const [search, setSearch]         = useState("");

  // Stat counts
  const [activeCount,  setActiveCount]  = useState(0);
  const [deletedCount, setDeletedCount] = useState(0);

  // Panel
  const [selected,      setSelected]      = useState<Customer | null>(null);
  const [editing,       setEditing]       = useState(false);
  const [creating,      setCreating]      = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subsLoading,   setSubsLoading]   = useState(false);

  // Expanded subscription reminders
  const [expandedSubId, setExpandedSubId] = useState<number | null>(null);
  const [reminders,     setReminders]     = useState<Reminder[]>([]);
  const [remLoading,    setRemLoading]    = useState(false);

  // Subscription modal
  const [showSubModal, setShowSubModal] = useState(false);
  const [subMode,      setSubMode]      = useState<"create" | "edit">("create");
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [subProducts,  setSubProducts]  = useState<Product[]>([]);
  const [subPlans,     setSubPlans]     = useState<Plan[]>([]);
  const [subForm,      setSubForm]      = useState<SubscriptionFormData>({
    productId: null, planId: null, customPrice: "", startsAt: "", endsAt: "", notes: "",
  });
  const [subSaving,    setSubSaving]    = useState(false);
  const [subError,     setSubError]     = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<number | null>(null);

  // Form
  const [editName,    setEditName]    = useState("");
  const [editEmail,   setEditEmail]   = useState("");
  const [editPhone,   setEditPhone]   = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editNotes,   setEditNotes]   = useState("");
  const [saving,      setSaving]      = useState(false);
  const [formError,   setFormError]   = useState<string | null>(null);

  const load = (f = filter, q = search, p = page) => {
    if (!token || !tid) return;
    setLoading(true);
    const params = new URLSearchParams({ size: String(PAGE_SIZE), page: String(p), sort: "createdAt,desc" });
    if (f !== "ALL") params.set("status", f);
    if (q.trim()) params.set("search", q.trim());
    apiGet<SpringPage<Customer>>(`/api/v1/tenants/${tid}/customers?${params}`, token)
      .then((d) => { setCustomers(d.content); setTotal(d.page.totalElements); setTotalPages(d.page.totalPages); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  // Accurate per-status totals
  useEffect(() => {
    if (!token || !tid) return;
    const count = (s: string) =>
      apiGet<SpringPage<Customer>>(`/api/v1/tenants/${tid}/customers?size=1&status=${s}`, token)
        .then((d) => d.page.totalElements).catch(() => 0);
    Promise.all([count("ACTIVE"), count("DELETED")]).then(([a, d]) => {
      setActiveCount(a); setDeletedCount(d);
    });
  }, [token, tid]);

  useEffect(() => { setPage(0); load(filter, search, 0); }, [token, user]);

  const loadSubscriptions = (customerId: number) => {
    if (!token || !tid) return;
    setSubsLoading(true);
    apiGet<SpringPage<Subscription>>(`/api/v1/tenants/${tid}/customers/${customerId}/products?size=50`, token)
      .then((d) => setSubscriptions(d.content))
      .catch(() => setSubscriptions([]))
      .finally(() => setSubsLoading(false));
  };

  const toggleExpand = (subId: number) => {
    if (expandedSubId === subId) {
      setExpandedSubId(null);
      return;
    }
    setExpandedSubId(subId);
    if (!token || !tid) return;
    setRemLoading(true);
    apiGet<Reminder[]>(`/api/v1/tenants/${tid}/reminders/by-customer-product/${subId}`, token)
      .then((d) => setReminders(d))
      .catch(() => setReminders([]))
      .finally(() => setRemLoading(false));
  };

  const loadSubPlans = (productId: number, token_: string, tid_: number) => {
    apiGet<Plan[]>(`/api/v1/tenants/${tid_}/products/${productId}/plans`, token_)
      .then(setSubPlans)
      .catch(() => setSubPlans([]));
  };

  const handleSubProductChange = (productId: number) => {
    setSubForm((f) => ({ ...f, productId, planId: null }));
    if (token && tid) loadSubPlans(productId, token, tid);
  };

  const openAddSubscription = () => {
    if (!token || !tid) return;
    setSubMode("create");
    setEditingSubId(null);
    setSubForm({ productId: null, planId: null, customPrice: "", startsAt: "", endsAt: "", notes: "" });
    setSubPlans([]);
    setSubError(null);
    apiGet<SpringPage<Product>>(`/api/v1/tenants/${tid}/products?status=ACTIVE&size=100`, token)
      .then((d) => setSubProducts(d.content))
      .catch(() => setSubProducts([]));
    setShowSubModal(true);
  };

  const openEditSubscription = (sub: Subscription) => {
    setSubMode("edit");
    setEditingSubId(sub.id);
    setSubForm({
      productId: sub.productId,
      planId: sub.productPlanId,
      customPrice: "",
      startsAt: toDatetimeLocal(sub.startsAt),
      endsAt: toDatetimeLocal(sub.endsAt),
      notes: sub.notes ?? "",
    });
    setSubError(null);
    setShowSubModal(true);
  };

  const closeSubModal = () => { setShowSubModal(false); setSubError(null); };

  const saveSubscription = async () => {
    if (!token || !tid || !selected) return;
    setSubSaving(true); setSubError(null);
    try {
      if (subMode === "create") {
        if (!subForm.productId) { setSubError("Please select a product."); setSubSaving(false); return; }
        await apiPost(`/api/v1/tenants/${tid}/customers/${selected.id}/products`, {
          productId: subForm.productId,
          planId: subForm.planId,
          customPrice: subForm.customPrice ? Number(subForm.customPrice) : null,
          startsAt: fromDatetimeLocal(subForm.startsAt),
          endsAt: fromDatetimeLocal(subForm.endsAt),
          notes: subForm.notes.trim() || null,
        }, token);
      } else if (editingSubId) {
        await apiPatch(`/api/v1/tenants/${tid}/customers/${selected.id}/products/${editingSubId}`, {
          startsAt: fromDatetimeLocal(subForm.startsAt),
          endsAt: fromDatetimeLocal(subForm.endsAt),
          notes: subForm.notes.trim() || null,
        }, token);
      }
      closeSubModal();
      loadSubscriptions(selected.id);
    } catch (e) {
      setSubError(e instanceof Error ? e.message : "Failed to save subscription.");
    } finally {
      setSubSaving(false);
    }
  };

  const changeSubStatus = async (sub: Subscription, status: string) => {
    if (!token || !tid || !selected || status === sub.status) return;
    setStatusUpdating(sub.id);
    try {
      await apiPatch(`/api/v1/tenants/${tid}/customers/${selected.id}/products/${sub.id}/status`, { status }, token);
      setSubscriptions((prev) => prev.map((s) => (s.id === sub.id ? { ...s, status } : s)));
    } catch { /* ignore */ }
    finally { setStatusUpdating(null); }
  };

  const deleteSubscription = async (sub: Subscription) => {
    if (!token || !tid || !selected) return;
    if (!confirm(`Remove ${titleCase(sub.productName)} subscription? This cannot be undone.`)) return;
    try {
      await apiDelete(`/api/v1/tenants/${tid}/customers/${selected.id}/products/${sub.id}`, token);
      loadSubscriptions(selected.id);
    } catch { /* ignore */ }
  };

  const openCustomer = (c: Customer) => {
    setSelected(c); setEditing(false); setCreating(false); setFormError(null);
    loadSubscriptions(c.id);
  };

  const startEdit = () => {
    if (!selected) return;
    setEditName(selected.name); setEditEmail(selected.email);
    setEditPhone(selected.phone ?? ""); setEditAddress(selected.address ?? "");
    setEditNotes(selected.notes ?? ""); setFormError(null); setEditing(true);
  };

  const openCreate = () => {
    setCreating(true); setSelected(null); setEditing(false);
    setEditName(""); setEditEmail(""); setEditPhone(""); setEditAddress(""); setEditNotes("");
    setFormError(null);
  };

  const closePanel = () => { setSelected(null); setEditing(false); setCreating(false); setFormError(null); };

  const saveEdit = async () => {
    if (!token || !tid || !selected) return;
    if (!editName.trim() || !editEmail.trim()) { setFormError("Name and email are required."); return; }
    setSaving(true); setFormError(null);
    try {
      const updated = await apiPatch<Customer>(`/api/v1/tenants/${tid}/customers/${selected.id}`, {
        name: editName.trim(), email: editEmail.trim(),
        phone: editPhone.trim() || null, address: editAddress.trim() || null, notes: editNotes.trim() || null,
      }, token);
      setSelected(updated); setEditing(false); load();
    } catch (e) { setFormError(e instanceof Error ? e.message : "Failed to save."); }
    finally { setSaving(false); }
  };

  const createCustomer = async () => {
    if (!token || !tid) return;
    if (!editName.trim() || !editEmail.trim()) { setFormError("Name and email are required."); return; }
    setSaving(true); setFormError(null);
    try {
      await apiPost<Customer>(`/api/v1/tenants/${tid}/customers`, {
        name: editName.trim(), email: editEmail.trim(),
        phone: editPhone.trim() || null, address: editAddress.trim() || null, notes: editNotes.trim() || null,
      }, token);
      closePanel(); load();
    } catch (e) { setFormError(e instanceof Error ? e.message : "Failed to create."); }
    finally { setSaving(false); }
  };

  const deleteCustomer = async () => {
    if (!token || !tid || !selected) return;
    if (!confirm(`Delete ${selected.name}? This cannot be undone.`)) return;
    try {
      await apiDelete(`/api/v1/tenants/${tid}/customers/${selected.id}`, token);
      closePanel(); load();
    } catch { /* ignore */ }
  };

  const { widths, onMouseDown } = useColumnResize([180, 240, 130, 110, 120, 44]);

  const totalVal   = useCountUp(total);
  const activeVal  = useCountUp(activeCount);
  const deletedVal = useCountUp(deletedCount);

  const stats = [
    { label: "Total",   value: totalVal   },
    { label: "Active",  value: activeVal  },
    { label: "Deleted", value: deletedVal },
  ];


  return (
    <>
      <div className="px-6 py-8 md:px-10 max-w-7xl mx-auto space-y-6 min-h-full flex flex-col" style={{ animation: "fade-in-up 0.2s ease-out both" }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} customers</p>
          </div>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white active:scale-95"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              Add Customer
            </button>
          )}
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
                  ? { backgroundColor: "var(--nav-active)", color: "var(--nav-active-text)" }
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
              placeholder="Search customers…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); load(filter, e.target.value, 0); }}
              className="w-full text-sm pl-9 pr-4 py-2 rounded-full outline-none transition-colors duration-200"
              style={{ border: "1px solid transparent", backgroundColor: "var(--bg-search)" }}
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
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 rounded-xl" style={{ border: "1px dashed var(--border)" }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-40">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
            </svg>
            <p className="text-sm">No customers found.</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden flex-1 min-h-0 flex flex-col" style={{ border: "1px solid var(--border)" }}>
            <div className="overflow-auto flex-1 min-h-0">
              <table style={{ tableLayout: "fixed", width: "100%", minWidth: widths.reduce((a, b) => a + b, 0) }}>
                <colgroup>{widths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                <thead className="sticky top-0 z-10">
                  <tr>
                    {TABLE_HEADERS.map((h, i) => (
                      <th key={i} className="relative text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide select-none overflow-hidden" style={{ backgroundColor: "var(--bg-card)" }}>
                        <span className="truncate flex items-center pr-2">{h.icon}{h.label}{h.sortable && <SortIcon />}</span>
                        {i < TABLE_HEADERS.length - 1 && <ResizeHandle onMouseDown={(e) => onMouseDown(i, e)} />}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c, i) => (
                    <tr
                      key={c.id}
                      className="group cursor-pointer hover:bg-md-primary/5 transition-colors"
                      style={{ borderTop: "1px solid var(--border)", backgroundColor: selected?.id === c.id ? "var(--nav-active)" : "var(--bg-app)", animation: "fade-in 0.15s ease-out both", animationDelay: `${i * 15}ms` }}
                      onClick={() => openCustomer(c)}
                    >
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 truncate overflow-hidden">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 overflow-hidden"><CopyEmail email={c.email} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate overflow-hidden">{c.phone ?? <span className="text-gray-400">—</span>}</td>
                      <td className="px-4 py-3 overflow-hidden"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600 truncate overflow-hidden">{formatDate(c.createdAt)}</td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openCustomer(c)} className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded">
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
      <SlideOver open={!!selected || creating} onClose={closePanel} width="50vw">

        {creating ? (
          <>
            <div className="px-6 pt-6 pb-5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-app)" }}>
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold text-gray-900">New Customer</h2>
                <button onClick={closePanel} className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <FormFields name={editName} onName={setEditName} email={editEmail} onEmail={setEditEmail} phone={editPhone} onPhone={setEditPhone} address={editAddress} onAddress={setEditAddress} notes={editNotes} onNotes={setEditNotes} error={formError} />
            </div>
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: "1px solid var(--border)" }}>
              <button onClick={closePanel} className="flex-1 py-2 text-sm font-medium rounded-full text-gray-600 hover:bg-md-primary/5 active:scale-95 transition-all duration-300 ease-emphasized" style={{ border: "1px solid var(--border)" }}>Cancel</button>
              <button onClick={createCustomer} disabled={saving} className="flex-1 py-2 text-sm font-medium rounded-full text-white active:scale-95 disabled:opacity-60" style={{ backgroundColor: "var(--primary)" }}>
                {saving ? "Creating…" : "Create Customer"}
              </button>
            </div>
          </>

        ) : selected ? (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-app)" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {editing && (
                    <button onClick={() => setEditing(false)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-2 transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                      Back
                    </button>
                  )}
                  <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                  {!editing && <div className="mt-2"><StatusBadge status={selected.status} /></div>}
                </div>
                <button onClick={closePanel} className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div key={editing ? "edit" : "detail"} className="flex-1 overflow-y-auto" style={{ animation: "slide-in-from-right 0.2s cubic-bezier(0.25,0.46,0.45,0.94) both" }}>
              {editing ? (
                <div className="px-6 py-5">
                  <FormFields name={editName} onName={setEditName} email={editEmail} onEmail={setEditEmail} phone={editPhone} onPhone={setEditPhone} address={editAddress} onAddress={setEditAddress} notes={editNotes} onNotes={setEditNotes} error={formError} />
                  <div className="flex gap-3 pt-4 mt-4" style={{ borderTop: "1px solid var(--border)" }}>
                    <button onClick={() => setEditing(false)} className="flex-1 py-2 text-sm font-medium rounded-full text-gray-600 hover:bg-md-primary/5 active:scale-95 transition-all duration-300 ease-emphasized" style={{ border: "1px solid var(--border)" }}>Cancel</button>
                    <button onClick={saveEdit} disabled={saving} className="flex-1 py-2 text-sm font-medium rounded-full text-white active:scale-95 disabled:opacity-60" style={{ backgroundColor: "var(--primary)" }}>{saving ? "Saving…" : "Save"}</button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Detail rows */}
                  <div className="px-6 py-2">
                    <SlideOverField label="Email"><CopyEmail email={selected.email} /></SlideOverField>
                    {selected.phone   && <SlideOverField label="Phone">{selected.phone}</SlideOverField>}
                    {selected.address && <SlideOverField label="Address">{selected.address}</SlideOverField>}
                    {selected.notes   && <SlideOverField label="Notes"><span className="text-gray-500 italic">{selected.notes}</span></SlideOverField>}
                    <SlideOverField label="Joined">{formatDateTime(selected.createdAt)}</SlideOverField>
                  </div>

                  {/* Action buttons */}
                  {isAdmin && (
                    <div className="px-6 pb-5 pt-2 flex gap-3">
                      <button onClick={startEdit} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-white active:scale-95" style={{ backgroundColor: "var(--primary)" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
                        Edit customer
                      </button>
                      <button onClick={deleteCustomer} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium text-md-error hover:bg-md-error-container active:scale-95 transition-all duration-300 ease-emphasized" style={{ border: "1px solid #fecaca" }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                        Delete
                      </button>
                    </div>
                  )}

                  <div style={{ borderTop: "1px solid var(--border)" }} />

                  {/* Subscriptions */}
                  <div className="px-6 py-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-gray-900">Subscriptions</h3>
                      <button
                        onClick={openAddSubscription}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white active:scale-95"
                        style={{ backgroundColor: "var(--primary)" }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                        Add Subscription
                      </button>
                    </div>
                    {subsLoading ? (
                      <div className="py-8 text-center text-sm text-gray-400">Loading…</div>
                    ) : subscriptions.length === 0 ? (
                      <div className="py-8 text-center text-sm text-gray-400 rounded-lg" style={{ border: "1px dashed var(--border)" }}>
                        No subscriptions yet.
                      </div>
                    ) : (
                      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm min-w-[400px]">
                            <thead>
                              <tr style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Period</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {subscriptions.map((s, i) => (
                                <React.Fragment key={s.id}>
                                  <tr
                                    onClick={() => toggleExpand(s.id)}
                                    className="cursor-pointer hover:bg-md-primary/5 transition-colors"
                                    style={{ borderTop: "1px solid var(--border)", backgroundColor: expandedSubId === s.id ? "var(--nav-active)" : "var(--bg-app)", animation: "fade-in 0.15s ease-out both", animationDelay: `${i * 15}ms` }}
                                  >
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                                          style={{ transform: expandedSubId === s.id ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", color: "#9ca3af", flexShrink: 0 }}>
                                          <path d="m9 18 6-6-6-6" />
                                        </svg>
                                        <div>
                                          <p className="font-medium text-gray-900">{titleCase(s.productName)}</p>
                                          {s.productPlanName && <p className="text-xs text-gray-500">{titleCase(s.productPlanName)}</p>}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{s.currency} {Number(s.amount).toFixed(2)}</td>
                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                      <select
                                        value={s.status}
                                        disabled={statusUpdating === s.id}
                                        onChange={(e) => changeSubStatus(s, e.target.value)}
                                        className="text-xs font-semibold px-2 py-1 rounded outline-none cursor-pointer disabled:opacity-60"
                                        style={{ ...(({
                                          ACTIVE:    { backgroundColor: "#dcfce7", color: "#15803d" },
                                          PAUSED:    { backgroundColor: "#f3f4f6", color: "#6b7280" },
                                          CANCELLED: { backgroundColor: "#fee2e2", color: "#b91c1c" },
                                          EXPIRED:   { backgroundColor: "#fef3c7", color: "#b45309" },
                                        } as Record<string, React.CSSProperties>)[s.status] ?? { backgroundColor: "#f3f4f6", color: "#6b7280" }), border: "none" }}
                                      >
                                        {SUBSCRIPTION_STATUSES.map((st) => (
                                          <option key={st} value={st}>{st.charAt(0) + st.slice(1).toLowerCase()}</option>
                                        ))}
                                        {!SUBSCRIPTION_STATUSES.includes(s.status as typeof SUBSCRIPTION_STATUSES[number]) && (
                                          <option value={s.status}>{s.status.charAt(0) + s.status.slice(1).toLowerCase()}</option>
                                        )}
                                      </select>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                                      {formatDate(s.startsAt)}{s.endsAt ? ` → ${formatDate(s.endsAt)}` : " → ∞"}
                                    </td>
                                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => openEditSubscription(s)} className="text-gray-300 hover:text-gray-500 transition-colors p-1 rounded" title="Edit subscription">
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
                                        </button>
                                        {isAdmin && (
                                          <button onClick={() => deleteSubscription(s)} className="text-gray-300 hover:text-red-500 transition-colors p-1 rounded" title="Delete subscription">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                  {expandedSubId === s.id && (
                                    <tr>
                                      <td colSpan={5} className="px-0 py-0" style={{ borderTop: "1px solid var(--border)" }}>
                                        <div className="px-6 py-4" style={{ backgroundColor: "var(--bg-app)" }}>
                                          {remLoading ? (
                                            <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
                                              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                              Loading reminders…
                                            </div>
                                          ) : reminders.length === 0 ? (
                                            <p className="text-sm text-gray-400 py-2">No reminders yet.</p>
                                          ) : (
                                            <div>
                                              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Reminders</p>
                                              <table className="w-full text-sm">
                                                <thead>
                                                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Milestone</th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Scheduled</th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Sent</th>
                                                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Status</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {reminders.map((r) => (
                                                    <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                                                      <td className="px-3 py-2 text-gray-700">{r.daysBeforeExpiry === 0 ? "Due date" : `${r.daysBeforeExpiry}-day reminder`}</td>
                                                      <td className="px-3 py-2 text-gray-500">{formatDate(r.createdAt)}</td>
                                                      <td className="px-3 py-2 text-gray-500">{r.sentAt ? formatDate(r.sentAt) : "—"}</td>
                                                      <td className="px-3 py-2">
                                                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                                                          style={r.status === "SENT" ? { backgroundColor: "#dcfce7", color: "#166534" } : r.status === "FAILED" ? { backgroundColor: "#fee2e2", color: "#991b1b" } : { backgroundColor: "#f3f4f6", color: "#6b7280" }}>
                                                          {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                                                        </span>
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {showSubModal && (
              <SubscriptionModal
                mode={subMode}
                products={subProducts}
                plans={subPlans}
                onProductChange={handleSubProductChange}
                form={subForm}
                setForm={setSubForm}
                onClose={closeSubModal}
                onSubmit={saveSubscription}
                saving={subSaving}
                error={subError}
              />
            )}
          </>
        ) : null}
      </SlideOver>
    </>
  );
}
