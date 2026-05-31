"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowLeft,
  Ban,
  Layers,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Play,
  Plus,
  Power,
  Trash2,
  Users,
} from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { EmptyState } from "@/components/shared/EmptyState"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/shared/TableSkeleton"

import { productsApi } from "@/lib/api/products"
import { plansApi } from "@/lib/api/plans"
import { productPlansApi } from "@/lib/api/product-plans"
import { friendlyError } from "@/lib/axios"
import { cn, formatCurrency, formatDate, titleCase } from "@/lib/utils"
import { useRole } from "@/hooks/useRole"
import type { BillingCadence } from "@/types/api"

const CADENCE_LABEL: Record<string, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUALLY: "Annual",
}

const CADENCE_NOUN: Record<string, string> = {
  WEEKLY: "week",
  MONTHLY: "month",
  QUARTERLY: "quarter",
  ANNUALLY: "year",
}

type PlanStatus = "ACTIVE" | "PAUSED" | "CANCELLED"

const CURRENCIES = ["USD", "NPR"] as const

const editSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  price: z.coerce.number().positive("Price must be greater than 0"),
  currency: z.enum(CURRENCIES),
  billingCadence: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY"]),
})
type EditValues = z.infer<typeof editSchema>

const pricingTierSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  price: z.coerce.number().min(0, "Price must be non-negative"),
  currency: z.enum(CURRENCIES),
  billingCadence: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "ANNUALLY"]),
})
type PricingTierValues = z.infer<typeof pricingTierSchema>

export default function ProductDetailPage({
  params,
}: {
  params: { tenantId: string; productId: string }
}) {
  const tenantId = Number(params.tenantId)
  const productId = Number(params.productId)
  const router = useRouter()
  const qc = useQueryClient()
  const { isAtLeast } = useRole()
  const canEdit = isAtLeast("TENANT_ADMIN")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [filter, setFilter] = useState<"ALL" | PlanStatus>("ALL")
  const [activeTab, setActiveTab] = useState<"customers" | "tiers">("customers")
  const [addTierOpen, setAddTierOpen] = useState(false)
  const [confirmDeleteTier, setConfirmDeleteTier] = useState<number | null>(null)

  const product = useQuery({
    queryKey: ["products", tenantId, productId],
    queryFn: () => productsApi.get(tenantId, productId),
  })

  const assignments = useQuery({
    queryKey: ["products", tenantId, productId, "customers"],
    queryFn: () => plansApi.listForProduct(tenantId, productId, 0, 100),
  })

  const pricingTiers = useQuery({
    queryKey: ["product-plans", tenantId, productId],
    queryFn: () => productPlansApi.list(tenantId, productId),
  })

  const toggle = useMutation({
    mutationFn: () =>
      productsApi.update(tenantId, productId, {
        status: product.data?.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products", tenantId] })
      toast.success("Product status updated")
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const del = useMutation({
    mutationFn: () => productsApi.delete(tenantId, productId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products", tenantId] })
      toast.success("Product deleted")
      router.push(`/${tenantId}/products`)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const planStatusMut = useMutation({
    mutationFn: ({ customerId, cpId, status }: { customerId: number; cpId: number; status: PlanStatus }) =>
      plansApi.setStatus(tenantId, customerId, cpId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products", tenantId, productId, "customers"] })
      qc.invalidateQueries({ queryKey: ["plans", tenantId] })
      toast.success("Plan updated")
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const editForm = useForm<EditValues>({ resolver: zodResolver(editSchema) })

  const editMut = useMutation({
    mutationFn: (data: EditValues) => productsApi.update(tenantId, productId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products", tenantId] })
      toast.success("Product updated")
      setEditOpen(false)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const tierForm = useForm<PricingTierValues>({
    resolver: zodResolver(pricingTierSchema),
    defaultValues: {
      name: "",
      price: undefined,
      currency: (CURRENCIES.includes(product.data?.currency as typeof CURRENCIES[number]) ? product.data?.currency : "USD") as typeof CURRENCIES[number],
      billingCadence: product.data?.billingCadence ?? "MONTHLY",
    },
  })

  const createTier = useMutation({
    mutationFn: (data: PricingTierValues) =>
      productPlansApi.create(tenantId, productId, {
        name: data.name,
        price: data.price,
        currency: data.currency,
        billingCadence: data.billingCadence as BillingCadence,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-plans", tenantId, productId] })
      toast.success("Pricing tier created")
      setAddTierOpen(false)
      tierForm.reset()
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const deleteTier = useMutation({
    mutationFn: (planId: number) => productPlansApi.delete(tenantId, productId, planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-plans", tenantId, productId] })
      toast.success("Pricing tier deleted")
      setConfirmDeleteTier(null)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const p = product.data
  const planRows = assignments.data?.content ?? []

  const stats = useMemo(() => {
    const active = planRows.filter((pl) => pl.status === "ACTIVE")
    const paused = planRows.filter((pl) => pl.status === "PAUSED").length
    const recurring = active.reduce((sum, pl) => sum + Number(pl.amount ?? 0), 0)
    return { total: planRows.length, active: active.length, paused, recurring }
  }, [planRows])

  const filteredPlans = useMemo(
    () => filter === "ALL" ? planRows : planRows.filter((pl) => pl.status === filter),
    [filter, planRows]
  )

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={`/${tenantId}/products`} className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Products
          </Link>
        }
        title={p?.name ?? "Loading…"}
        description={p?.description ?? undefined}
        actions={
          p && (
            <>
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={() => {
                    editForm.reset({
                      name: p.name,
                      description: p.description ?? "",
                      price: p.price,
                      currency: (CURRENCIES.includes(p.currency as typeof CURRENCIES[number]) ? p.currency : "USD") as typeof CURRENCIES[number],
                      billingCadence: p.billingCadence as EditValues["billingCadence"],
                    })
                    setEditOpen(true)
                  }}
                >
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              )}
              <Button variant="outline" onClick={() => toggle.mutate()} loading={toggle.isPending}>
                <Power className="h-4 w-4" />
                {p.status === "ACTIVE" ? "Deactivate" : "Activate"}
              </Button>
              {canEdit && (
                <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
            </>
          )
        }
      />

      {!p && <ProductDetailSkeleton />}

      {p && (
        <>
          {/* Product info + stats */}
          <Card>
            <CardContent className="px-0 pb-0">
              {/* Commercial terms */}
              <dl className="divide-y divide-border">
                <div className="flex items-center justify-between px-6 py-3">
                  <dt className="text-xs text-muted-foreground w-28 shrink-0">Base price</dt>
                  <dd className="font-display text-lg font-semibold tracking-tight">
                    {formatCurrency(p.price, p.currency)}
                    <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                      / {CADENCE_NOUN[p.billingCadence] ?? "cycle"} · {p.currency}
                    </span>
                  </dd>
                </div>
                <div className="flex items-center justify-between px-6 py-3">
                  <dt className="text-xs text-muted-foreground w-28 shrink-0">Billing cadence</dt>
                  <dd className="text-sm">{CADENCE_LABEL[p.billingCadence] ?? titleCase(p.billingCadence)}</dd>
                </div>
                <div className="flex items-center justify-between px-6 py-3">
                  <dt className="text-xs text-muted-foreground w-28 shrink-0">Status</dt>
                  <dd><StatusBadge status={p.status} /></dd>
                </div>
                <div className="flex items-center justify-between px-6 py-3">
                  <dt className="text-xs text-muted-foreground w-28 shrink-0">Created</dt>
                  <dd className="text-sm text-muted-foreground">{formatDate(p.createdAt)}</dd>
                </div>
              </dl>

              {/* Stats strip */}
              <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4 overflow-hidden rounded-b-xl">
                {[
                  { label: "Customers", value: stats.total },
                  { label: "Active", value: stats.active },
                  { label: "Paused", value: stats.paused },
                  { label: `Recurring / ${CADENCE_NOUN[p.billingCadence] ?? "cycle"}`, value: formatCurrency(stats.recurring, p.currency) },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col gap-0.5 bg-card px-5 py-3">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <span className="font-display text-lg font-semibold tracking-tight">{s.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-border">
            {(["customers", "tiers"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                  activeTab === tab
                    ? "border-b-2 border-primary text-foreground -mb-px"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "customers" ? <Users className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                {tab === "customers" ? "Assigned customers" : "Pricing tiers"}
                {tab === "customers" && planRows.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{planRows.length}</Badge>
                )}
                {tab === "tiers" && (pricingTiers.data?.length ?? 0) > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{pricingTiers.data?.length}</Badge>
                )}
              </button>
            ))}
          </div>

          {/* Assigned customers */}
          {activeTab === "customers" && (
            <Card>
              <div className="flex items-center justify-between border-b border-border p-4">
                <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
                  <SelectTrigger className="w-[130px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{filteredPlans.length} shown</p>
              </div>

              {assignments.isLoading ? (
                <TableSkeleton rows={4} cols={5} />
              ) : filteredPlans.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={planRows.length === 0 ? "No customers yet" : "No plans match this filter"}
                  description={
                    planRows.length === 0
                      ? "Once you assign this product to a customer, their plan will show up here."
                      : "Try selecting a different status above."
                  }
                />
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPlans.map((plan) => (
                          <TableRow key={plan.id}>
                            <TableCell>
                              <Link
                                href={`/${tenantId}/customers/${plan.customerId}`}
                                className="font-medium text-foreground hover:underline"
                              >
                                {plan.customerName}
                              </Link>
                              {plan.productPlanName && (
                                <p className="text-xs text-muted-foreground">{plan.productPlanName}</p>
                              )}
                              {plan.notes && (
                                <p className="truncate text-xs text-muted-foreground">{plan.notes}</p>
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {formatCurrency(plan.amount, plan.currency)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(plan.startsAt)} →{" "}
                              {plan.endsAt ? formatDate(plan.endsAt) : <span className="italic">Open-ended</span>}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={plan.status} />
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link href={`/${tenantId}/customers/${plan.customerId}`}>
                                      <Users className="h-4 w-4" /> View customer
                                    </Link>
                                  </DropdownMenuItem>
                                  {plan.status === "ACTIVE" && (
                                    <DropdownMenuItem onClick={() => planStatusMut.mutate({ customerId: plan.customerId, cpId: plan.id, status: "PAUSED" })}>
                                      <PauseCircle className="h-4 w-4" /> Pause plan
                                    </DropdownMenuItem>
                                  )}
                                  {plan.status === "PAUSED" && (
                                    <DropdownMenuItem onClick={() => planStatusMut.mutate({ customerId: plan.customerId, cpId: plan.id, status: "ACTIVE" })}>
                                      <Play className="h-4 w-4" /> Resume plan
                                    </DropdownMenuItem>
                                  )}
                                  {plan.status !== "CANCELLED" && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem destructive onClick={() => planStatusMut.mutate({ customerId: plan.customerId, cpId: plan.id, status: "CANCELLED" })}>
                                        <Ban className="h-4 w-4" /> Cancel plan
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile card list */}
                  <div className="divide-y divide-border sm:hidden">
                    {filteredPlans.map((plan) => (
                      <div key={plan.id} className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/${tenantId}/customers/${plan.customerId}`} className="font-medium text-sm hover:underline">
                            {plan.customerName}
                          </Link>
                          <StatusBadge status={plan.status} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{formatCurrency(plan.amount, plan.currency)}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(plan.startsAt)} → {plan.endsAt ? formatDate(plan.endsAt) : "Open-ended"}
                          </span>
                        </div>
                        {plan.status !== "CANCELLED" && (
                          <div className="flex gap-2 pt-1">
                            {plan.status === "ACTIVE" && (
                              <Button size="xs" variant="outline" onClick={() => planStatusMut.mutate({ customerId: plan.customerId, cpId: plan.id, status: "PAUSED" })}>
                                <PauseCircle className="h-3 w-3" /> Pause
                              </Button>
                            )}
                            {plan.status === "PAUSED" && (
                              <Button size="xs" variant="outline" onClick={() => planStatusMut.mutate({ customerId: plan.customerId, cpId: plan.id, status: "ACTIVE" })}>
                                <Play className="h-3 w-3" /> Resume
                              </Button>
                            )}
                            <Button size="xs" variant="outline" className="text-destructive ml-auto" onClick={() => planStatusMut.mutate({ customerId: plan.customerId, cpId: plan.id, status: "CANCELLED" })}>
                              <Ban className="h-3 w-3" /> Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </Card>
          )}

          {/* Pricing tiers */}
          {activeTab === "tiers" && (
            <Card>
              <CardHeader className="flex-row items-center justify-between border-b border-border pb-4">
                <div>
                  <CardTitle className="text-base">Pricing tiers</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Named tiers customers can be assigned to. Base price applies when no tier is set.
                  </p>
                </div>
                {canEdit && (
                  <Button size="sm" onClick={() => setAddTierOpen(true)}>
                    <Plus className="h-4 w-4" /> Add tier
                  </Button>
                )}
              </CardHeader>
              {pricingTiers.isLoading ? (
                <TableSkeleton rows={3} cols={4} />
              ) : (pricingTiers.data?.length ?? 0) === 0 ? (
                <EmptyState
                  icon={Layers}
                  title="No pricing tiers"
                  description="Add tiers to offer different prices — e.g. Starter, Pro, Enterprise."
                  action={
                    canEdit ? (
                      <Button size="sm" onClick={() => setAddTierOpen(true)}>
                        <Plus className="h-4 w-4" /> Add tier
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Cadence</TableHead>
                      {canEdit && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingTiers.data?.map((tier) => (
                      <TableRow key={tier.id}>
                        <TableCell className="font-medium">{tier.name}</TableCell>
                        <TableCell>{formatCurrency(tier.price, tier.currency)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {CADENCE_LABEL[tier.billingCadence] ?? titleCase(tier.billingCadence)}
                        </TableCell>
                        {canEdit && (
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setConfirmDeleteTier(tier.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          )}
        </>
      )}

      {/* Edit product dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit((v) => editMut.mutate(v))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input id="editName" placeholder="Pro Plan" {...editForm.register("name")} />
              {editForm.formState.errors.name && (
                <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea id="editDescription" rows={3} placeholder="What does this product include?" {...editForm.register("description")} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="editPrice">Price</Label>
                <Input id="editPrice" type="number" step="0.01" min="0.01" {...editForm.register("price")} />
                {editForm.formState.errors.price && (
                  <p className="text-xs text-destructive">{editForm.formState.errors.price.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCurrency">Currency</Label>
                <Select
                  value={editForm.watch("currency")}
                  onValueChange={(v) => editForm.setValue("currency", v as typeof CURRENCIES[number])}
                >
                  <SelectTrigger id="editCurrency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="NPR">NPR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editCadence">Billing cadence</Label>
              <Select
                value={editForm.watch("billingCadence")}
                onValueChange={(v) => editForm.setValue("billingCadence", v as EditValues["billingCadence"])}
              >
                <SelectTrigger id="editCadence"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="ANNUALLY">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" loading={editMut.isPending}>Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add pricing tier dialog */}
      <Dialog open={addTierOpen} onOpenChange={setAddTierOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Add pricing tier</DialogTitle>
          </DialogHeader>
          <form onSubmit={tierForm.handleSubmit((v) => createTier.mutate(v as PricingTierValues))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tierName">Name</Label>
              <Input id="tierName" placeholder="e.g. Starter, Pro, Enterprise" {...tierForm.register("name")} />
              {tierForm.formState.errors.name && (
                <p className="text-xs text-destructive">{tierForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tierPrice">Price</Label>
                <Input id="tierPrice" type="number" step="0.01" min="0" placeholder="0.00" {...tierForm.register("price")} />
                {tierForm.formState.errors.price && (
                  <p className="text-xs text-destructive">{tierForm.formState.errors.price.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tierCurrency">Currency</Label>
                <Select defaultValue={p?.currency ?? "USD"} onValueChange={(v) => tierForm.setValue("currency", v as typeof CURRENCIES[number])}>
                  <SelectTrigger id="tierCurrency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="NPR">NPR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tierCadence">Billing cadence</Label>
              <Select defaultValue={p?.billingCadence ?? "MONTHLY"} onValueChange={(v) => tierForm.setValue("billingCadence", v as PricingTierValues["billingCadence"])}>
                <SelectTrigger id="tierCadence"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="ANNUALLY">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setAddTierOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createTier.isPending}>Create tier</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteTier !== null}
        onOpenChange={(open) => !open && setConfirmDeleteTier(null)}
        title="Delete pricing tier?"
        description="This removes the tier definition. Existing assignments fall back to the base price."
        confirmText="Delete tier"
        destructive
        loading={deleteTier.isPending}
        onConfirm={() => confirmDeleteTier && deleteTier.mutate(confirmDeleteTier)}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this product?"
        description="You can only delete a product with no active plans."
        confirmText="Delete product"
        destructive
        loading={del.isPending}
        onConfirm={() => del.mutate()}
      />
    </div>
  )
}

function ProductDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="px-0 pb-0">
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5 bg-card px-5 py-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <TableSkeleton rows={4} cols={5} />
      </Card>
    </div>
  )
}
