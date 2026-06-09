"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import SlideOver, { SlideOverHeader, SlideOverField } from "@/components/SlideOver";
import { cadenceLabel, cadenceBadgeStyle } from "@/lib/cadence";

type Product = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billingCadence: string;
  status: string;
  createdAt: string;
};

type Plan = {
  id: number;
  productId: number;
  name: string;
  price: number;
  currency: string;
  billingCadence: string;
  createdAt: string;
};

type Page<T> = { content: T[]; page: { totalElements: number; totalPages: number; size: number; number: number } };

const STATUS_FILTERS = ["ALL", "ACTIVE", "INACTIVE", "DELETED"] as const;

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  ACTIVE:   { bg: "#dcfce7", color: "#166534" },
  INACTIVE: { bg: "#f3f4f6", color: "#6b7280" },
  DELETED:  { bg: "#fee2e2", color: "#dc2626" },
};

const CADENCES = ["WEEKLY", "FORTNIGHT", "MONTHLY", "QUARTERLY", "ANNUALLY"];


function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", { month: "numeric", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ProductsPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAdmin = user?.role === "TENANT_ADMIN";

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  // Sidebar state
  const [selected, setSelected] = useState<Product | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [productEditOpen, setProductEditOpen] = useState(false);
  const [productEditClosing, setProductEditClosing] = useState(false);

  // Plan dialog: null = closed, "add" = new plan, "edit" = editing existing plan
  const [planDialogMode, setPlanDialogMode] = useState<"add" | "edit" | null>(null);
  const [planDialogClosing, setPlanDialogClosing] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planDropdownId, setPlanDropdownId] = useState<number | null>(null);

  // Edit form
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCurrency, setEditCurrency] = useState("USD");
  const [editCadence, setEditCadence] = useState("MONTHLY");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New plan form
  const [planName, setPlanName] = useState("");
  const [planPrice, setPlanPrice] = useState("");
  const [planCadence, setPlanCadence] = useState("MONTHLY");
  const [planCurrency, setPlanCurrency] = useState("USD");
  const [planSearch, setPlanSearch] = useState("");

  useEffect(() => {
    if (planDropdownId === null) return;
    const close = () => setPlanDropdownId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [planDropdownId]);

  const PAGE_SIZE = 20;
  const tid = user?.tenantId;

  const load = (f = filter, q = search, p = page) => {
    if (!token || !tid) return;
    setLoading(true);
    const params = new URLSearchParams({ size: String(PAGE_SIZE), page: String(p), sort: "createdAt,desc" });
    if (f !== "ALL") params.set("status", f);
    if (q.trim()) params.set("search", q.trim());
    apiGet<Page<Product>>(`/api/v1/tenants/${tid}/products?${params}`, token)
      .then((d) => { setProducts(d.content); setTotal(d.page.totalElements); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token, user]);

  const loadPlans = (productId: number) => {
    if (!token || !tid) return;
    setPlansLoading(true);
    apiGet<Plan[]>(`/api/v1/tenants/${tid}/products/${productId}/plans`, token)
      .then((d) => setPlans(d))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  };

  const openProduct = (p: Product) => {
    setSelected(p);
    setEditing(false);
    setPlanDialogMode(null);
    setEditingPlan(null);
    setPlanDropdownId(null);
    setFormError(null);
    loadPlans(p.id);
  };

  const startEdit = () => {
    if (!selected) return;
    setEditName(selected.name);
    setEditDesc(selected.description ?? "");
    setEditPrice(String(selected.price));
    setEditCurrency(selected.currency);
    setEditCadence(selected.billingCadence);
    setFormError(null);
    setProductEditOpen(true);
    setPlanDialogMode(null);
  };

  const saveProduct = async () => {
    if (!token || !tid || !selected) return;
    if (!editName.trim() || !editPrice) { setFormError("Name and price are required."); return; }
    setSaving(true); setFormError(null);
    try {
      await apiPatch<Product>(`/api/v1/tenants/${tid}/products/${selected.id}`, {
        name: editName.trim(),
        description: editDesc.trim() || null,
        price: Number(editPrice),
        currency: editCurrency,
        billingCadence: editCadence,
      }, token);
      load();
      closeProductEdit();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const openAddPlan = () => {
    setPlanName(""); setPlanPrice(""); setPlanCadence("MONTHLY"); setPlanCurrency(selected?.currency ?? "USD");
    setFormError(null);
    setEditingPlan(null);
    setPlanDialogMode("add");
  };

  const openEditPlan = (plan: Plan) => {
    setPlanName(plan.name);
    setPlanPrice(String(plan.price));
    setPlanCadence(plan.billingCadence);
    setPlanCurrency(plan.currency);
    setFormError(null);
    setEditingPlan(plan);
    setPlanDialogMode("edit");
    setPlanDropdownId(null);
  };

  const closePlanDialog = () => {
    setPlanDialogClosing(true);
    setTimeout(() => { setPlanDialogMode(null); setPlanDialogClosing(false); setEditingPlan(null); setFormError(null); }, 160);
  };

  const closeProductEdit = () => {
    setProductEditClosing(true);
    setTimeout(() => { setProductEditOpen(false); setProductEditClosing(false); setFormError(null); }, 160);
  };

  const savePlan = async () => {
    if (!token || !tid || !selected) return;
    if (!planName.trim() || !planPrice) { setFormError("Name and price are required."); return; }
    setSaving(true); setFormError(null);
    try {
      if (planDialogMode === "add") {
        await apiPost(`/api/v1/tenants/${tid}/products/${selected.id}/plans`, {
          name: planName.trim(), price: Number(planPrice),
          currency: planCurrency, billingCadence: planCadence,
        }, token);
      } else if (planDialogMode === "edit" && editingPlan) {
        await apiPatch(`/api/v1/tenants/${tid}/products/${selected.id}/plans/${editingPlan.id}`, {
          name: planName.trim(), price: Number(planPrice),
          currency: planCurrency, billingCadence: planCadence,
        }, token);
      }
      closePlanDialog();
      loadPlans(selected.id);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to save plan.");
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async (plan: Plan) => {
    if (!token || !tid || !selected) return;
    if (!confirm(`Delete plan "${plan.name}"? This cannot be undone.`)) return;
    setPlanDropdownId(null);
    try {
      await apiDelete(`/api/v1/tenants/${tid}/products/${selected.id}/plans/${plan.id}`, token);
      loadPlans(selected.id);
    } catch { /* ignore */ }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const filteredPlans = plans.filter((pl) => pl.name.toLowerCase().includes(planSearch.toLowerCase()));

  const inputCls = "w-full text-sm px-3 py-2 rounded-lg outline-none";
  const inputStyle = { border: "1px solid var(--border)", backgroundColor: "#fff" };
  const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1";

  return (
    <>
      <div className="px-6 py-8 md:px-10 max-w-7xl mx-auto space-y-6" style={{ animation: "fade-in-up 0.2s ease-out both" }}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products &amp; Plans</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} products</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setSelected(null); setEditing(true); setEditName(""); setEditDesc(""); setEditPrice(""); setEditCurrency("USD"); setEditCadence("MONTHLY"); setFormError(null); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--primary)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
              Add Product
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ backgroundColor: "var(--border)" }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setPage(0); load(f, search, 0); }}
                className="text-xs font-semibold px-3 py-1.5 rounded-md transition-all"
                style={
                  filter === f
                    ? { backgroundColor: "#fff", color: "#111827", boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }
                    : { color: "#6b7280" }
                }
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
              placeholder="Search products…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); load(filter, e.target.value, 0); }}
              className="w-full text-sm pl-9 pr-3 py-2 rounded-lg outline-none"
              style={{ border: "1px solid var(--border)", backgroundColor: "#eceeec" }}
            />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <svg className="animate-spin mr-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
            Loading…
          </div>
        ) : products.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400 rounded-xl" style={{ border: "1px dashed var(--border)" }}>
            No products found.
          </div>
        ) : (
          <div className="rounded-xl" style={{ border: "1px solid var(--border)" }}>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cadence</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => openProduct(p)}
                    className="cursor-pointer hover:bg-[#eef3ee] transition-colors"
                    style={{ borderTop: "1px solid var(--border)", backgroundColor: selected?.id === p.id ? "#eef3ee" : "#f8faf8", animation: "fade-in 0.15s ease-out both", animationDelay: `${i * 15}ms` }}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      {p.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{p.currency} {Number(p.price).toLocaleString()}</td>
                    <td className="px-4 py-3"><span className="text-xs font-semibold px-2.5 py-1 rounded" style={cadenceBadgeStyle(p.billingCadence)}>{cadenceLabel(p.billingCadence)}</span></td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md" style={STATUS_STYLE[p.status] ?? { backgroundColor: "#f3f4f6", color: "#6b7280" }}>
                        {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Page {page + 1} of {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => { const p = page - 1; setPage(p); load(filter, search, p); }} className="px-3 py-1.5 rounded-lg font-medium disabled:opacity-40" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}>Prev</button>
              <button disabled={page >= totalPages - 1} onClick={() => { const p = page + 1; setPage(p); load(filter, search, p); }} className="px-3 py-1.5 rounded-lg font-medium disabled:opacity-40" style={{ border: "1px solid var(--border)", backgroundColor: "var(--bg-card)" }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Product detail / edit sidebar */}
      <SlideOver open={!!selected || (isAdmin && editing && !selected)} onClose={() => { setSelected(null); setEditing(false); }} width="50vw">
        {editing && !selected ? (
          // Create new product
          <>
            <SlideOverHeader title="New Product" onClose={() => setEditing(false)} />
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div><label className={labelCls}>Name *</label><input className={inputCls} style={inputStyle} value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Product name" /></div>
              <div><label className={labelCls}>Description</label><textarea className={inputCls} style={inputStyle} rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Optional description" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Price *</label><input type="number" min="0" step="0.01" className={inputCls} style={inputStyle} value={editPrice} onChange={(e) => setEditPrice(e.target.value)} placeholder="0.00" /></div>
                <div><label className={labelCls}>Currency</label><input className={inputCls} style={inputStyle} value={editCurrency} onChange={(e) => setEditCurrency(e.target.value.toUpperCase())} placeholder="USD" /></div>
              </div>
              <div>
                <label className={labelCls}>Billing Cadence</label>
                <div className="flex gap-2 flex-wrap">
                  {CADENCES.map((c) => (
                    <button key={c} onClick={() => setEditCadence(c)} className="text-xs px-3 py-1.5 rounded-md font-medium transition-all"
                      style={editCadence === c ? { backgroundColor: "var(--primary)", color: "#fff" } : { border: "1px solid var(--border)", color: "#6b7280" }}>
                      {cadenceLabel(c)}
                    </button>
                  ))}
                </div>
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
            </div>
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: "1px solid var(--border)" }}>
              <button onClick={() => setEditing(false)} className="flex-1 py-2 text-sm font-medium rounded-lg text-gray-600" style={{ border: "1px solid var(--border)" }}>Cancel</button>
              <button onClick={async () => {
                if (!token || !tid || !editName.trim() || !editPrice) { setFormError("Name and price are required."); return; }
                setSaving(true); setFormError(null);
                try {
                  await apiPost<Product>(`/api/v1/tenants/${tid}/products`, { name: editName.trim(), description: editDesc.trim() || null, price: Number(editPrice), currency: editCurrency, billingCadence: editCadence }, token);
                  load(); setEditing(false);
                } catch (e) { setFormError(e instanceof Error ? e.message : "Failed to create."); }
                finally { setSaving(false); }
              }} disabled={saving} className="flex-1 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-60" style={{ backgroundColor: "var(--primary)" }}>
                {saving ? "Creating…" : "Create Product"}
              </button>
            </div>
          </>
        ) : selected ? (
          <>
            {/* Header */}
            <div className="px-6 pt-6 pb-5 flex-shrink-0" style={{ borderBottom: "1px solid var(--border)", backgroundColor: "#fff" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-gray-900 leading-snug">{selected.name}</h2>
                  <span
                    className="inline-block mt-2 text-xs font-semibold px-2.5 py-0.5 rounded"
                    style={STATUS_STYLE[selected.status] ?? { backgroundColor: "#f3f4f6", color: "#6b7280" }}
                  >
                    {selected.status.charAt(0) + selected.status.slice(1).toLowerCase()}
                  </span>
                </div>
                <button
                  onClick={() => { setSelected(null); setEditing(false); setProductEditOpen(false); setPlanDialogMode(null); setPlanDropdownId(null); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 mt-0.5"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div
              className="flex-1 overflow-y-auto"
              style={{ animation: "slide-in-from-right 0.2s cubic-bezier(0.25,0.46,0.45,0.94) both" }}
            >
              <>
                {/* Detail rows */}
                <div className="px-6 py-2">
                  {selected.description && <SlideOverField label="Description">{selected.description}</SlideOverField>}
                    <SlideOverField label="Status">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={STATUS_STYLE[selected.status] ?? { backgroundColor: "#f3f4f6", color: "#6b7280" }}
                      >
                        {selected.status.charAt(0) + selected.status.slice(1).toLowerCase()}
                      </span>
                    </SlideOverField>
                    <SlideOverField label="Created at">{formatDateTime(selected.createdAt)}</SlideOverField>
                    <SlideOverField label="Base price">{selected.currency} {Number(selected.price).toFixed(2)} / {cadenceLabel(selected.billingCadence)}</SlideOverField>
                  </div>

                  {/* Action buttons */}
                  {isAdmin && (
                    <div className="px-6 pb-5 pt-2 flex gap-3">
                      <button
                        onClick={startEdit}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{ backgroundColor: "var(--primary)" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
                        Edit product
                      </button>
                      <button
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-600"
                        style={{ border: "1px solid var(--border)" }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                        Delete product
                      </button>
                    </div>
                  )}

                  <div style={{ borderTop: "1px solid var(--border)" }} />

                  {/* Plans section */}
                  <div className="px-6 py-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h3 className="text-base font-semibold text-gray-900">Product plans</h3>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                          </svg>
                          <input
                            type="text"
                            placeholder="Search"
                            value={planSearch}
                            onChange={(e) => setPlanSearch(e.target.value)}
                            className="text-sm pl-8 pr-3 py-1.5 rounded-lg outline-none"
                            style={{ border: "1px solid var(--border)", width: "160px", backgroundColor: "#eceeec" }}
                          />
                        </div>
                        {isAdmin && (
                          <button
                            onClick={openAddPlan}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap"
                            style={{ backgroundColor: "var(--primary)" }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
                            Add plan
                          </button>
                        )}
                      </div>
                    </div>

                    {plansLoading ? (
                      <div className="py-8 text-center text-sm text-gray-400">Loading plans…</div>
                    ) : (
                      <>
                        {filteredPlans.length > 0 ? (
                          <div className="rounded-xl pb-6" style={{ border: "1px solid var(--border)" }}>
                            <div className="overflow-x-auto">
                            <table className="w-full text-sm min-w-[360px]">
                              <thead>
                                <tr style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--border)" }}>
                                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Base cadence</th>
                                  <th className="px-4 py-3"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredPlans.map((pl, i) => (
                                  <tr
                                    key={pl.id}
                                    className="hover:bg-[#eef3ee] transition-colors"
                                    style={{ borderTop: "1px solid var(--border)", backgroundColor: "#f8faf8", animation: "fade-in 0.15s ease-out both", animationDelay: `${i * 15}ms` }}
                                  >
                                    <td className="px-4 py-3 font-medium text-gray-900">{pl.name}</td>
                                    <td className="px-4 py-3 text-gray-600">{pl.currency} {Number(pl.price).toFixed(2)}</td>
                                    <td className="px-4 py-3">
                                      <span className="text-xs font-semibold px-2.5 py-1 rounded" style={cadenceBadgeStyle(pl.billingCadence)}>
                                        {cadenceLabel(pl.billingCadence)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-right relative">
                                      {isAdmin && (
                                        <>
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setPlanDropdownId(planDropdownId === pl.id ? null : pl.id); }}
                                            className="p-1 rounded text-gray-300 hover:text-gray-500 transition-colors"
                                          >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
                                          </button>
                                          {planDropdownId === pl.id && (
                                            <div
                                              className="absolute right-3 z-20 rounded-xl overflow-hidden py-1"
                                              style={{ top: "100%", backgroundColor: "#fff", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,0.10)", minWidth: "120px" }}
                                              onClick={(e) => e.stopPropagation()}
                                            >
                                              <button onClick={() => openEditPlan(pl)} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-[#f0f7f0] transition-colors flex items-center gap-2">
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
                                                Edit
                                              </button>
                                              <button onClick={() => deletePlan(pl)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                                                Delete
                                              </button>
                                            </div>
                                          )}
                                        </>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            </div>
                          </div>
                        ) : (
                          <div className="py-8 text-center text-sm text-gray-400 rounded-lg" style={{ border: "1px dashed var(--border)" }}>
                            {plans.length === 0 ? "No plans yet." : "No plans match your search."}
                          </div>
                        )}

                      </>
                    )}
                  </div>
                </>
            </div>

            {/* Plan dialog (add / edit) — overlay inside the sidebar panel */}
            {(planDialogMode !== null || planDialogClosing) && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center p-6"
                style={{ backgroundColor: "rgba(0,0,0,0.32)", backdropFilter: "blur(4px)", animation: `${planDialogClosing ? "fade-out 0.15s ease-out both" : "fade-in 0.15s ease-out both"}` }}
                onClick={closePlanDialog}
              >
                <div
                  className="w-full rounded-2xl overflow-hidden"
                  style={{ maxWidth: "360px", backgroundColor: "#fff", border: "1px solid var(--border)", boxShadow: "0 8px 40px rgba(0,0,0,0.12)", animation: planDialogClosing ? "dialog-out 0.15s ease-in both" : "dialog-in 0.18s cubic-bezier(0.34,1.56,0.64,1) both" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    <h3 className="text-base font-bold text-gray-900">
                      {planDialogMode === "edit" ? `Edit plan` : "Add product plan"}
                    </h3>
                    <button onClick={closePlanDialog} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                  {/* Body */}
                  <div className="px-5 py-4 space-y-4">
                    <div>
                      <label className={labelCls}>Plan name *</label>
                      <input className={inputCls} style={inputStyle} placeholder="e.g. Starter, Pro, Enterprise" value={planName} onChange={(e) => setPlanName(e.target.value)} autoFocus />
                    </div>
                    <div>
                      <label className={labelCls}>Price *</label>
                      <div className="flex items-center gap-2">
                        <input className={`${inputCls} w-16 text-center`} style={inputStyle} placeholder="USD" value={planCurrency} onChange={(e) => setPlanCurrency(e.target.value.toUpperCase())} maxLength={3} />
                        <input type="number" min="0" step="0.01" className={`${inputCls} flex-1`} style={inputStyle} placeholder="0.00" value={planPrice} onChange={(e) => setPlanPrice(e.target.value)} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Billing cadence</label>
                      <div className="flex gap-2 flex-wrap mt-1">
                        {CADENCES.map((c) => (
                          <button key={c} onClick={() => setPlanCadence(c)} className="text-xs px-3 py-1.5 rounded-md font-medium transition-all"
                            style={planCadence === c ? { backgroundColor: "var(--primary)", color: "#fff" } : { border: "1px solid var(--border)", color: "#6b7280" }}>
                            {cadenceLabel(c)}
                          </button>
                        ))}
                      </div>
                    </div>
                    {formError && <p className="text-sm text-red-600">{formError}</p>}
                  </div>
                  {/* Footer */}
                  <div className="px-5 py-4 flex gap-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <button onClick={closePlanDialog} className="flex-1 py-2 text-sm font-medium rounded-lg text-gray-600" style={{ border: "1px solid var(--border)" }}>Cancel</button>
                    <button onClick={savePlan} disabled={saving || !planName.trim() || !planPrice} className="flex-1 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-60" style={{ backgroundColor: "var(--primary)" }}>
                      {saving ? (planDialogMode === "edit" ? "Saving…" : "Adding…") : (planDialogMode === "edit" ? "Save plan" : "Add plan")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Product edit dialog */}
            {(productEditOpen || productEditClosing) && selected && (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center p-6"
                style={{ backgroundColor: "rgba(0,0,0,0.32)", backdropFilter: "blur(4px)", animation: `${productEditClosing ? "fade-out 0.15s ease-out both" : "fade-in 0.15s ease-out both"}` }}
                onClick={closeProductEdit}
              >
                <div
                  className="w-full rounded-2xl overflow-hidden"
                  style={{ maxWidth: "400px", backgroundColor: "#fff", border: "1px solid var(--border)", boxShadow: "0 8px 40px rgba(0,0,0,0.12)", animation: productEditClosing ? "dialog-out 0.15s ease-in both" : "dialog-in 0.18s cubic-bezier(0.34,1.56,0.64,1) both" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-5 pt-5 pb-4" style={{ borderBottom: "1px solid var(--border)" }}>
                    <h3 className="text-base font-bold text-gray-900">Edit product</h3>
                    <button onClick={closeProductEdit} className="text-gray-400 hover:text-gray-600 transition-colors">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    <div>
                      <label className={labelCls}>Name</label>
                      <input className={inputCls} style={inputStyle} value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>
                    <div>
                      <label className={labelCls}>Description</label>
                      <textarea className={inputCls} style={inputStyle} rows={3} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelCls}>Price</label>
                        <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle} value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
                      </div>
                      <div>
                        <label className={labelCls}>Currency</label>
                        <input className={inputCls} style={inputStyle} value={editCurrency} onChange={(e) => setEditCurrency(e.target.value.toUpperCase())} />
                      </div>
                    </div>
                    <div>
                      <label className={labelCls}>Billing Cadence</label>
                      <div className="flex gap-2 flex-wrap mt-1">
                        {CADENCES.map((c) => (
                          <button key={c} onClick={() => setEditCadence(c)} className="text-xs px-3 py-1.5 rounded-md font-medium transition-all"
                            style={editCadence === c ? { backgroundColor: "var(--primary)", color: "#fff" } : { border: "1px solid var(--border)", color: "#6b7280" }}>
                            {cadenceLabel(c)}
                          </button>
                        ))}
                      </div>
                    </div>
                    {formError && <p className="text-sm text-red-600">{formError}</p>}
                  </div>
                  <div className="px-5 py-4 flex gap-3" style={{ borderTop: "1px solid var(--border)" }}>
                    <button onClick={closeProductEdit} className="flex-1 py-2 text-sm font-medium rounded-lg text-gray-600" style={{ border: "1px solid var(--border)" }}>Cancel</button>
                    <button onClick={saveProduct} disabled={saving} className="flex-1 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-60" style={{ backgroundColor: "var(--primary)" }}>
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </SlideOver>
    </>
  );
}
