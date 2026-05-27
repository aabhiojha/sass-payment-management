"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  AlertCircle,
  Archive,
  Ban,
  Bell,
  Building2,
  Calendar,
  ChevronDown,
  ClipboardList,
  Globe,
  Mail,
  Mailbox,
  Package,
  PauseCircle,
  PauseOctagon,
  Phone,
  PlayCircle,
  Plus,
  RefreshCw,
  Send,
  SkipForward,
  StickyNote,
  Trash2,
  UserCircle2,
  Users,
  X,
  XCircle,
} from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Skeleton } from "@/components/ui/skeleton"
import { tenantsApi } from "@/lib/api/tenants"
import { dashboardApi } from "@/lib/api/dashboard"
import { customersApi } from "@/lib/api/customers"
import { productsApi } from "@/lib/api/products"
import { plansApi } from "@/lib/api/plans"
import { remindersApi } from "@/lib/api/reminders"
import { usersApi } from "@/lib/api/users"
import { invitationsApi } from "@/lib/api/invitations"
import { friendlyError } from "@/lib/axios"
import {
  cn,
  formatCurrency,
  formatDate,
  initials,
  timeAgo,
  titleCase,
} from "@/lib/utils"
import type {
  CustomerResponse,
  CustomerProductResponse,
  ProductResponse,
} from "@/types/api"

type Section =
  | "customers"
  | "products"
  | "plans"
  | "reminders"
  | "users"
  | "invitations"
  | null

const SECTIONS: {
  key: Section & string
  label: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
}[] = [
  { key: "customers", label: "Customers", icon: UserCircle2, accent: "from-primary to-[hsl(280_85%_55%)]" },
  { key: "products", label: "Products", icon: Package, accent: "from-[hsl(199_89%_48%)] to-[hsl(212_92%_45%)]" },
  { key: "plans", label: "Plans", icon: ClipboardList, accent: "from-[hsl(152_65%_38%)] to-[hsl(160_70%_42%)]" },
  { key: "reminders", label: "Reminders", icon: Bell, accent: "from-[hsl(38_92%_50%)] to-[hsl(28_92%_55%)]" },
  { key: "users", label: "Team", icon: Users, accent: "from-[hsl(340_65%_47%)] to-[hsl(350_70%_55%)]" },
  { key: "invitations", label: "Invitations", icon: Mailbox, accent: "from-[hsl(270_55%_50%)] to-[hsl(280_60%_60%)]" },
]

export default function TenantDetailPage({
  params,
}: {
  params: { tenantId: string }
}) {
  const tenantId = Number(params.tenantId)
  const qc = useQueryClient()
  const [confirmSuspend, setConfirmSuspend] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)
  const [activeSection, setActiveSection] = useState<Section>(null)

  const [selectedCustomer, setSelectedCustomer] = useState<CustomerResponse | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<ProductResponse | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<CustomerProductResponse | null>(null)

  const [confirmDelete, setConfirmDelete] = useState<{ type: string; id: number; name: string; extra?: number } | null>(null)
  const [inviteEmail, setInviteEmail] = useState("")

  const tenant = useQuery({ queryKey: ["tenants", tenantId], queryFn: () => tenantsApi.get(tenantId) })
  const summary = useQuery({ queryKey: ["dashboard-summary", tenantId], queryFn: () => dashboardApi.summary(tenantId) })
  const rsQuery = useQuery({ queryKey: ["dashboard-reminder-stats", tenantId], queryFn: () => dashboardApi.reminderStats(tenantId) })

  const previewCustomers = useQuery({ queryKey: ["preview-customers", tenantId], queryFn: () => customersApi.list(tenantId, 0, 5) })
  const previewProducts = useQuery({ queryKey: ["preview-products", tenantId], queryFn: () => productsApi.list(tenantId, 0, 5) })
  const previewPlans = useQuery({ queryKey: ["preview-plans", tenantId], queryFn: () => plansApi.listAll(tenantId, 0, 5) })

  const customers = useQuery({ queryKey: ["tenantpage-customers", tenantId], queryFn: () => customersApi.list(tenantId, 0, 20), enabled: activeSection === "customers" })
  const products = useQuery({ queryKey: ["tenantpage-products", tenantId], queryFn: () => productsApi.list(tenantId, 0, 20), enabled: activeSection === "products" })
  const plans = useQuery({ queryKey: ["tenantpage-plans", tenantId], queryFn: () => plansApi.listAll(tenantId, 0, 20), enabled: activeSection === "plans" })
  const reminders = useQuery({ queryKey: ["tenantpage-reminders", tenantId], queryFn: () => remindersApi.list(tenantId, 0, 20), enabled: activeSection === "reminders" })
  const usersQ = useQuery({ queryKey: ["tenantpage-users", tenantId], queryFn: () => usersApi.list(tenantId, 0, 20), enabled: activeSection === "users" })
  const invitationsQ = useQuery({ queryKey: ["tenantpage-invitations", tenantId], queryFn: () => invitationsApi.list(tenantId, 0, 20), enabled: activeSection === "invitations" })

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["tenantpage-customers", tenantId] })
    qc.invalidateQueries({ queryKey: ["tenantpage-products", tenantId] })
    qc.invalidateQueries({ queryKey: ["tenantpage-plans", tenantId] })
    qc.invalidateQueries({ queryKey: ["tenantpage-reminders", tenantId] })
    qc.invalidateQueries({ queryKey: ["tenantpage-users", tenantId] })
    qc.invalidateQueries({ queryKey: ["tenantpage-invitations", tenantId] })
    qc.invalidateQueries({ queryKey: ["preview-customers", tenantId] })
    qc.invalidateQueries({ queryKey: ["preview-products", tenantId] })
    qc.invalidateQueries({ queryKey: ["preview-plans", tenantId] })
    qc.invalidateQueries({ queryKey: ["dashboard-summary", tenantId] })
  }

  const suspend = useMutation({
    mutationFn: () => tenantsApi.suspend(tenantId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); toast.success("Tenant suspended"); setConfirmSuspend(false) },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const archive = useMutation({
    mutationFn: () => tenantsApi.archive(tenantId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tenants"] }); toast.success("Tenant archived"); setConfirmArchive(false) },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const deleteCustomer = useMutation({
    mutationFn: (id: number) => customersApi.delete(tenantId, id),
    onSuccess: () => { invalidateAll(); setSelectedCustomer(null); setConfirmDelete(null); toast.success("Customer deleted") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const deleteProduct = useMutation({
    mutationFn: (id: number) => productsApi.delete(tenantId, id),
    onSuccess: () => { invalidateAll(); setSelectedProduct(null); setConfirmDelete(null); toast.success("Product deleted") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const deletePlan = useMutation({
    mutationFn: ({ customerId, cpId }: { customerId: number; cpId: number }) => plansApi.delete(tenantId, customerId, cpId),
    onSuccess: () => { invalidateAll(); setSelectedPlan(null); setConfirmDelete(null); toast.success("Plan deleted") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const setPlanStatus = useMutation({
    mutationFn: ({ customerId, cpId, status }: { customerId: number; cpId: number; status: "ACTIVE" | "PAUSED" | "CANCELLED" }) =>
      plansApi.setStatus(tenantId, customerId, cpId, status),
    onSuccess: () => { invalidateAll(); setSelectedPlan(null); toast.success("Plan status updated") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const disableUser = useMutation({
    mutationFn: (userId: number) => usersApi.disable(tenantId, userId),
    onSuccess: () => { invalidateAll(); toast.success("User disabled") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const deleteUser = useMutation({
    mutationFn: (userId: number) => usersApi.delete(tenantId, userId),
    onSuccess: () => { invalidateAll(); setConfirmDelete(null); toast.success("User deleted") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const revokeInvitation = useMutation({
    mutationFn: (id: number) => invitationsApi.revoke(tenantId, id),
    onSuccess: () => { invalidateAll(); toast.success("Invitation revoked") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const resendInvitation = useMutation({
    mutationFn: (id: number) => invitationsApi.resend(tenantId, id),
    onSuccess: () => { invalidateAll(); toast.success("Invitation resent") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const inviteUser = useMutation({
    mutationFn: (email: string) => invitationsApi.inviteUser(tenantId, email),
    onSuccess: () => { invalidateAll(); setInviteEmail(""); toast.success("Invitation sent") },
    onError: (e) => toast.error(friendlyError(e)),
  })
  const triggerReminders = useMutation({
    mutationFn: () => remindersApi.trigger(tenantId),
    onSuccess: () => { invalidateAll(); toast.success("Reminders triggered") },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const t = tenant.data
  const s = summary.data
  const rsd = rsQuery.data

  function toggleSection(key: Section & string) {
    setActiveSection((prev) => (prev === key ? null : key))
    setSelectedCustomer(null)
    setSelectedProduct(null)
    setSelectedPlan(null)
  }

  const sectionCounts: Record<string, number | undefined> = {
    customers: s?.totalCustomers,
    products: s?.totalProducts,
    plans: s != null ? s.activePlans + s.pausedPlans + s.cancelledPlans : undefined,
  }

  function handleConfirmDelete() {
    if (!confirmDelete) return
    const { type, id, extra } = confirmDelete
    if (type === "customer") deleteCustomer.mutate(id)
    else if (type === "product") deleteProduct.mutate(id)
    else if (type === "plan" && extra != null) deletePlan.mutate({ customerId: extra, cpId: id })
    else if (type === "user") deleteUser.mutate(id)
  }

  return (
    <div className="space-y-6">
      {!t && <Skeleton className="h-28" />}

      {t && (
        <>
          {/* ── Info card + Reminder stats ─────────────────────── */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[hsl(280_85%_60%)] text-primary-foreground">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-lg font-semibold leading-tight tracking-tight">{t.name}</h2>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.slug}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {t.status === "ACTIVE" && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setConfirmSuspend(true)}>
                      <PauseOctagon className="h-3.5 w-3.5" /> Suspend
                    </Button>
                  )}
                  {t.status !== "ARCHIVED" && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={() => setConfirmArchive(true)}>
                      <Archive className="h-3.5 w-3.5" /> Archive
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Mail className="h-3 w-3" /> {t.companyEmail}</span>
                <span className="inline-flex items-center gap-1.5"><Globe className="h-3 w-3" /> {t.timezone}</span>
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Created {formatDate(t.createdAt)}</span>
              </div>
            </Card>

            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Reminders · last 30 days</p>
              {!rsd ? <Skeleton className="mt-3 h-16" /> : (
                <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                  {[
                    { n: rsd.sent, label: "Sent", icon: Send, color: "text-success" },
                    { n: rsd.failed, label: "Failed", icon: AlertCircle, color: "text-destructive" },
                    { n: rsd.skipped, label: "Skipped", icon: SkipForward, color: "text-muted-foreground" },
                  ].map((r) => (
                    <div key={r.label}>
                      <r.icon className={`mx-auto mb-1 h-4 w-4 ${r.color}`} />
                      <p className="font-display text-xl font-semibold tabular-nums">{r.n}</p>
                      <p className="text-[10px] text-muted-foreground">{r.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* ── Section tabs ───────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SECTIONS.map((sec) => {
              const isOpen = activeSection === sec.key
              const count = sectionCounts[sec.key]
              return (
                <button key={sec.key} type="button" onClick={() => toggleSection(sec.key)} className={cn(
                  "group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-all",
                  isOpen ? "border-primary/40 bg-accent shadow-soft" : "border-border bg-card/50 hover:border-primary/30 hover:shadow-soft"
                )}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${sec.accent} text-white`}>
                    <sec.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-sm font-medium">{sec.label}</p>
                      {count != null && <span className="font-display text-sm font-semibold tabular-nums text-muted-foreground">{count}</span>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── Default view ───────────────────────────────────── */}
          {!activeSection && (
            <div className="grid gap-6 lg:grid-cols-2 animate-fade-in">
              <Card>
                <CardHeader className="flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Recent customers</CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleSection("customers")}>View all</Button>
                </CardHeader>
                <CardContent className="space-y-0.5">
                  {previewCustomers.isLoading && <ListSkeleton count={3} />}
                  {previewCustomers.data?.content.length === 0 && <Empty label="customers" />}
                  {previewCustomers.data?.content.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-secondary">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{initials(c.name)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{c.email}</p>
                      </div>
                      <StatusBadge status={c.status} className="scale-90" />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Recent products</CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleSection("products")}>View all</Button>
                </CardHeader>
                <CardContent className="space-y-0.5">
                  {previewProducts.isLoading && <ListSkeleton count={3} />}
                  {previewProducts.data?.content.length === 0 && <Empty label="products" />}
                  {previewProducts.data?.content.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-secondary">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="text-[11px] text-muted-foreground">{p.billingCadence.toLowerCase()} · {formatCurrency(p.price, p.currency)}</p>
                      </div>
                      <StatusBadge status={p.status} className="scale-90" />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader className="flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">Recent plans</CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggleSection("plans")}>View all</Button>
                </CardHeader>
                <CardContent className="space-y-0.5">
                  {previewPlans.isLoading && <ListSkeleton count={3} />}
                  {previewPlans.data?.content.length === 0 && <Empty label="plans" />}
                  {previewPlans.data?.content.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors hover:bg-secondary">
                      <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="text-[10px]">{initials(p.customerName)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.customerName}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{p.productName} · {timeAgo(p.createdAt)}</p>
                      </div>
                      {p.endsAt && <Badge variant="outline" className="text-[10px] shrink-0">Due {formatDate(p.endsAt)}</Badge>}
                      <StatusBadge status={p.status} className="scale-90 shrink-0" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Expanded section ───────────────────────────────── */}
          {activeSection && (
            <Card className="animate-fade-in">
              <CardHeader className="flex-row items-center justify-between pb-3">
                <CardTitle className="text-base">{SECTIONS.find((sec) => sec.key === activeSection)?.label}</CardTitle>
                <div className="flex items-center gap-1.5">
                  {activeSection === "reminders" && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => triggerReminders.mutate()} disabled={triggerReminders.isPending}>
                      <Send className="h-3 w-3" /> Trigger batch
                    </Button>
                  )}
                  {activeSection === "invitations" && (
                    <form className="flex items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); if (inviteEmail.trim()) inviteUser.mutate(inviteEmail.trim()) }}>
                      <Input placeholder="Email to invite…" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="h-7 w-48 text-xs" />
                      <Button variant="outline" size="sm" className="h-7 text-xs" type="submit" disabled={inviteUser.isPending || !inviteEmail.trim()}>
                        <Plus className="h-3 w-3" /> Invite
                      </Button>
                    </form>
                  )}
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActiveSection(null)}>
                    <X className="h-3.5 w-3.5" /> Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-0.5">

                {/* ── Customers ── */}
                {activeSection === "customers" && (<>
                  {customers.isLoading && <ListSkeleton />}
                  {customers.data?.content.length === 0 && <Empty label="customers" />}
                  {customers.data?.content.map((c) => (
                    <div key={c.id}>
                      <button type="button" onClick={() => setSelectedCustomer(selectedCustomer?.id === c.id ? null : c)} className={cn("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-secondary", selectedCustomer?.id === c.id && "bg-accent")}>
                        <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{initials(c.name)}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{c.name}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{c.email}</p>
                        </div>
                        <StatusBadge status={c.status} className="scale-90" />
                        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", selectedCustomer?.id === c.id && "rotate-180")} />
                      </button>
                      {selectedCustomer?.id === c.id && (
                        <DetailPanel onClose={() => setSelectedCustomer(null)} actions={
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive hover:text-destructive" onClick={() => setConfirmDelete({ type: "customer", id: c.id, name: c.name })}>
                            <Trash2 className="h-3 w-3" /> Delete
                          </Button>
                        }>
                          <DetailRow icon={Mail} label="Email" value={c.email} />
                          {c.phone && <DetailRow icon={Phone} label="Phone" value={c.phone} />}
                          {c.notes && <DetailRow icon={StickyNote} label="Notes" value={c.notes} />}
                          <DetailRow icon={Calendar} label="Created" value={formatDate(c.createdAt)} />
                          <DetailRow icon={Calendar} label="Updated" value={formatDate(c.updatedAt)} />
                        </DetailPanel>
                      )}
                    </div>
                  ))}
                </>)}

                {/* ── Products ── */}
                {activeSection === "products" && (<>
                  {products.isLoading && <ListSkeleton />}
                  {products.data?.content.length === 0 && <Empty label="products" />}
                  {products.data?.content.map((p) => (
                    <div key={p.id}>
                      <button type="button" onClick={() => setSelectedProduct(selectedProduct?.id === p.id ? null : p)} className={cn("flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-secondary", selectedProduct?.id === p.id && "bg-accent")}>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{p.name}</p>
                          <p className="text-[11px] text-muted-foreground">{p.billingCadence.toLowerCase()} · {formatCurrency(p.price, p.currency)}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <StatusBadge status={p.status} className="scale-90" />
                          <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", selectedProduct?.id === p.id && "rotate-180")} />
                        </div>
                      </button>
                      {selectedProduct?.id === p.id && (
                        <DetailPanel onClose={() => setSelectedProduct(null)} actions={
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive hover:text-destructive" onClick={() => setConfirmDelete({ type: "product", id: p.id, name: p.name })}>
                            <Trash2 className="h-3 w-3" /> Delete
                          </Button>
                        }>
                          <DetailRow icon={Package} label="Price" value={formatCurrency(p.price, p.currency)} />
                          <DetailRow icon={ClipboardList} label="Cadence" value={titleCase(p.billingCadence)} />
                          {p.description && <DetailRow icon={StickyNote} label="Description" value={p.description} />}
                          <DetailRow icon={Calendar} label="Created" value={formatDate(p.createdAt)} />
                          <DetailRow icon={Calendar} label="Updated" value={formatDate(p.updatedAt)} />
                        </DetailPanel>
                      )}
                    </div>
                  ))}
                </>)}

                {/* ── Plans ── */}
                {activeSection === "plans" && (<>
                  {plans.isLoading && <ListSkeleton />}
                  {plans.data?.content.length === 0 && <Empty label="plans" />}
                  {plans.data?.content.map((p) => (
                    <div key={p.id}>
                      <button type="button" onClick={() => setSelectedPlan(selectedPlan?.id === p.id ? null : p)} className={cn("flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-secondary", selectedPlan?.id === p.id && "bg-accent")}>
                        <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="text-[10px]">{initials(p.customerName)}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.customerName}</p>
                          <p className="truncate text-[11px] text-muted-foreground">{p.productName} · {timeAgo(p.createdAt)}</p>
                        </div>
                        {p.endsAt && <Badge variant="outline" className="text-[10px] shrink-0">Due {formatDate(p.endsAt)}</Badge>}
                        <StatusBadge status={p.status} className="scale-90 shrink-0" />
                        <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", selectedPlan?.id === p.id && "rotate-180")} />
                      </button>
                      {selectedPlan?.id === p.id && (
                        <DetailPanel onClose={() => setSelectedPlan(null)} actions={
                          <div className="flex items-center gap-1">
                            {p.status === "ACTIVE" && (
                              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setPlanStatus.mutate({ customerId: p.customerId, cpId: p.id, status: "PAUSED" })}>
                                <PauseCircle className="h-3 w-3" /> Pause
                              </Button>
                            )}
                            {p.status === "PAUSED" && (
                              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setPlanStatus.mutate({ customerId: p.customerId, cpId: p.id, status: "ACTIVE" })}>
                                <PlayCircle className="h-3 w-3" /> Resume
                              </Button>
                            )}
                            {(p.status === "ACTIVE" || p.status === "PAUSED") && (
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive hover:text-destructive" onClick={() => setPlanStatus.mutate({ customerId: p.customerId, cpId: p.id, status: "CANCELLED" })}>
                                <XCircle className="h-3 w-3" /> Cancel
                              </Button>
                            )}
                            {p.status === "CANCELLED" && (
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive hover:text-destructive" onClick={() => setConfirmDelete({ type: "plan", id: p.id, name: `${p.customerName} / ${p.productName}`, extra: p.customerId })}>
                                <Trash2 className="h-3 w-3" /> Delete
                              </Button>
                            )}
                          </div>
                        }>
                          <DetailRow icon={UserCircle2} label="Customer" value={p.customerName} />
                          <DetailRow icon={Package} label="Product" value={p.productName} />
                          <DetailRow icon={Calendar} label="Starts" value={formatDate(p.startsAt)} />
                          {p.endsAt && <DetailRow icon={Calendar} label="Ends" value={formatDate(p.endsAt)} />}
                          {p.notes && <DetailRow icon={StickyNote} label="Notes" value={p.notes} />}
                          <DetailRow icon={Calendar} label="Created" value={formatDate(p.createdAt)} />
                        </DetailPanel>
                      )}
                    </div>
                  ))}
                </>)}

                {/* ── Reminders ── */}
                {activeSection === "reminders" && (<>
                  {reminders.isLoading && <ListSkeleton />}
                  {reminders.data?.content.length === 0 && <Empty label="reminders" />}
                  {reminders.data?.content.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-secondary transition-colors">
                      <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className="text-[10px]">{initials(r.customerName)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.customerName}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{r.productName} · {timeAgo(r.createdAt)}</p>
                      </div>
                      <StatusBadge status={r.status} className="scale-90 shrink-0" />
                    </div>
                  ))}
                </>)}

                {/* ── Users ── */}
                {activeSection === "users" && (<>
                  {usersQ.isLoading && <ListSkeleton />}
                  {usersQ.data?.content.length === 0 && <Empty label="users" />}
                  {usersQ.data?.content.map((u) => (
                    <div key={u.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-secondary transition-colors">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{initials(u.email)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{u.email}</p>
                        <p className="text-[11px] text-muted-foreground">{titleCase(u.role)} · Joined {formatDate(u.createdAt)}</p>
                      </div>
                      <StatusBadge status={u.status} className="scale-90" />
                      <div className="flex items-center gap-0.5 shrink-0">
                        {u.status === "ACTIVE" && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" title="Disable" onClick={() => disableUser.mutate(u.id)}>
                            <Ban className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" title="Delete" onClick={() => setConfirmDelete({ type: "user", id: u.id, name: u.email })}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>)}

                {/* ── Invitations ── */}
                {activeSection === "invitations" && (<>
                  {invitationsQ.isLoading && <ListSkeleton />}
                  {invitationsQ.data?.content.length === 0 && <Empty label="invitations" />}
                  {invitationsQ.data?.content.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 hover:bg-secondary transition-colors">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{initials(inv.email)}</AvatarFallback></Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{inv.email}</p>
                        <p className="text-[11px] text-muted-foreground">{titleCase(inv.role)} · Expires {formatDate(inv.expiresAt)}</p>
                      </div>
                      <StatusBadge status={inv.status} className="scale-90" />
                      {inv.status === "PENDING" && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px]" title="Resend" onClick={() => resendInvitation.mutate(inv.id)}>
                            <RefreshCw className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-destructive hover:text-destructive" title="Revoke" onClick={() => revokeInvitation.mutate(inv.id)}>
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </>)}

              </CardContent>
            </Card>
          )}
        </>
      )}

      <ConfirmDialog open={confirmSuspend} onOpenChange={setConfirmSuspend} title="Suspend this tenant?" description="Suspended tenants cannot sign in until reactivated." confirmText="Suspend" destructive loading={suspend.isPending} onConfirm={() => suspend.mutate()} />
      <ConfirmDialog open={confirmArchive} onOpenChange={setConfirmArchive} title="Archive this tenant?" description="This is irreversible. The tenant's data will be retained but inaccessible." confirmText="Archive permanently" destructive loading={archive.isPending} onConfirm={() => archive.mutate()} />
      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(open) => { if (!open) setConfirmDelete(null) }}
        title={`Delete ${confirmDelete?.type}?`}
        description={`"${confirmDelete?.name}" will be permanently removed. This action cannot be undone.`}
        confirmText="Delete"
        destructive
        loading={deleteCustomer.isPending || deleteProduct.isPending || deletePlan.isPending || deleteUser.isPending}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-11" />
      ))}
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return <p className="py-8 text-center text-xs text-muted-foreground">No {label} yet.</p>
}

function DetailPanel({ onClose, actions, children }: { onClose: () => void; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-2.5 mb-2 mt-1 animate-fade-in rounded-lg border border-border bg-card/50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Details</p>
        <div className="flex items-center gap-1">
          {actions}
          <button type="button" onClick={onClose} className="rounded p-0.5 text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="mt-2 space-y-1.5 text-xs">{children}</div>
    </div>
  )
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  )
}
