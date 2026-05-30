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
  Calendar,
  CircleDollarSign,
  Clock,
  Layers,
  MoreHorizontal,
  Package,
  PauseCircle,
  Pencil,
  Play,
  Plus,
  Power,
  Repeat,
  Trash2,
  Users,
} from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Textarea } from "@/components/ui/textarea"
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
const PLAN_FILTERS: { label: string; value: "ALL" | PlanStatus }[] = [
  { label: "All", value: "ALL" },
  { label: "Active", value: "ACTIVE" },
  { label: "Paused", value: "PAUSED" },
  { label: "Cancelled", value: "CANCELLED" },
]

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
  const canDelete = isAtLeast("TENANT_ADMIN")
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
    mutationFn: ({
      customerId,
      cpId,
      status,
    }: {
      customerId: number
      cpId: number
      status: PlanStatus
    }) => plansApi.setStatus(tenantId, customerId, cpId, status),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: ["products", tenantId, productId, "customers"],
      })
      qc.invalidateQueries({ queryKey: ["plans", tenantId] })
      toast.success("Plan updated")
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
  })

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
    mutationFn: (planId: number) =>
      productPlansApi.delete(tenantId, productId, planId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-plans", tenantId, productId] })
      toast.success("Pricing tier deleted")
      setConfirmDeleteTier(null)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const p = product.data
  const planRows = assignments.data?.content ?? []
  const filteredPlans = useMemo(
    () =>
      filter === "ALL"
        ? planRows
        : planRows.filter((plan) => plan.status === filter),
    [filter, planRows]
  )

  const stats = useMemo(() => {
    const counts = { ACTIVE: 0, PAUSED: 0, CANCELLED: 0 } as Record<
      PlanStatus,
      number
    >
    for (const plan of planRows) {
      counts[plan.status as PlanStatus] =
        (counts[plan.status as PlanStatus] ?? 0) + 1
    }
    const activePlans = planRows.filter((pl) => pl.status === "ACTIVE")
    const recurring = activePlans.reduce((sum, pl) => sum + Number(pl.amount ?? 0), 0)
    return {
      total: planRows.length,
      active: counts.ACTIVE ?? 0,
      paused: counts.PAUSED ?? 0,
      cancelled: counts.CANCELLED ?? 0,
      recurring,
      currency: p?.currency ?? "USD",
    }
  }, [planRows, p])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href={`/${tenantId}/products`}
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
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
              <Button
                variant="outline"
                onClick={() => toggle.mutate()}
                loading={toggle.isPending}
              >
                <Power className="h-4 w-4" />
                {p.status === "ACTIVE" ? "Deactivate" : "Activate"}
              </Button>
              {canDelete && (
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
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
          {/* Hero card */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-[hsl(265_85%_65%)] to-[hsl(290_85%_60%)]" />
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(280_85%_60%)] text-primary-foreground shadow-pop">
                    <Package className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-2xl font-semibold tracking-tight">
                        {p.name}
                      </h2>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {p.description || "No description provided."}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Repeat className="h-3.5 w-3.5" />
                        {CADENCE_LABEL[p.billingCadence] ??
                          titleCase(p.billingCadence)}{" "}
                        billing
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Created {formatDate(p.createdAt)}
                      </span>
                      {p.updatedAt && p.updatedAt !== p.createdAt && (
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          Updated {formatDate(p.updatedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card/60 px-6 py-5 text-right shadow-sm lg:min-w-[220px]">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Base price
                  </p>
                  <p className="mt-1 font-display text-3xl font-semibold tracking-tight">
                    {formatCurrency(p.price, p.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    per {CADENCE_NOUN[p.billingCadence] ?? "cycle"} ·{" "}
                    {p.currency}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Key stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              icon={Users}
              label="Customers on this plan"
              value={String(stats.total)}
              hint={
                stats.total === 0 ? "Nobody yet" : `${stats.active} currently active`
              }
            />
            <Stat
              icon={Play}
              label="Active subscriptions"
              value={String(stats.active)}
              tone="emerald"
            />
            <Stat
              icon={PauseCircle}
              label="Paused"
              value={String(stats.paused)}
              tone="amber"
              hint={stats.cancelled > 0 ? `${stats.cancelled} cancelled` : undefined}
            />
            <Stat
              icon={CircleDollarSign}
              label={`Recurring (${
                CADENCE_NOUN[p.billingCadence] ?? "cycle"
              })`}
              value={formatCurrency(stats.recurring, stats.currency)}
              hint="From active subscriptions"
            />
          </div>

          {/* Tabs: Customers | Pricing tiers */}
          <div className="flex gap-1 border-b border-border">
            <button
              onClick={() => setActiveTab("customers")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "customers"
                  ? "border-b-2 border-primary text-foreground -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Users className="h-4 w-4" />
              Assigned customers
              {planRows.length > 0 && (
                <span className="ml-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium">
                  {planRows.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("tiers")}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                activeTab === "tiers"
                  ? "border-b-2 border-primary text-foreground -mb-px"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="h-4 w-4" />
              Pricing tiers
              {(pricingTiers.data?.length ?? 0) > 0 && (
                <span className="ml-1 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium">
                  {pricingTiers.data?.length}
                </span>
              )}
            </button>
          </div>

          {/* Assigned customers tab */}
          {activeTab === "customers" && (
            <Card>
              <CardHeader className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Assigned customers</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Everyone currently subscribed to this product.
                  </p>
                </div>
                <Select
                  value={filter}
                  onValueChange={(v) => setFilter(v as typeof filter)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_FILTERS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              {assignments.isLoading ? (
                <TableSkeleton rows={4} cols={5} />
              ) : filteredPlans.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={
                    planRows.length === 0
                      ? "No customers yet"
                      : "No plans match this filter"
                  }
                  description={
                    planRows.length === 0
                      ? "Once you assign this product to a customer, their plan will show up here."
                      : "Try selecting a different status above."
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Tier / Price</TableHead>
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
                          {plan.notes && (
                            <p className="truncate text-xs text-muted-foreground">
                              {plan.notes}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          <p className="font-medium">
                            {formatCurrency(plan.amount, plan.currency)}
                          </p>
                          {plan.productPlanName && (
                            <p className="text-xs text-muted-foreground">
                              {plan.productPlanName}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(plan.startsAt)} →{" "}
                          {plan.endsAt ? formatDate(plan.endsAt) : "Open-ended"}
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
                                <Link
                                  href={`/${tenantId}/customers/${plan.customerId}`}
                                >
                                  <Users className="h-4 w-4" /> View customer
                                </Link>
                              </DropdownMenuItem>
                              {plan.status === "ACTIVE" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    planStatusMut.mutate({
                                      customerId: plan.customerId,
                                      cpId: plan.id,
                                      status: "PAUSED",
                                    })
                                  }
                                >
                                  <PauseCircle className="h-4 w-4" /> Pause plan
                                </DropdownMenuItem>
                              )}
                              {plan.status === "PAUSED" && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    planStatusMut.mutate({
                                      customerId: plan.customerId,
                                      cpId: plan.id,
                                      status: "ACTIVE",
                                    })
                                  }
                                >
                                  <Play className="h-4 w-4" /> Resume plan
                                </DropdownMenuItem>
                              )}
                              {plan.status !== "CANCELLED" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    destructive
                                    onClick={() =>
                                      planStatusMut.mutate({
                                        customerId: plan.customerId,
                                        cpId: plan.id,
                                        status: "CANCELLED",
                                      })
                                    }
                                  >
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
              )}
            </Card>
          )}

          {/* Pricing tiers tab */}
          {activeTab === "tiers" && (
            <Card>
              <CardHeader className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base">Pricing tiers</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Named tiers customers can be assigned to. Base price is used when no tier is set.
                  </p>
                </div>
                {canDelete && (
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
                  description="Add tiers to offer different prices (e.g. Starter, Pro, Enterprise)."
                  action={
                    canDelete ? (
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
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingTiers.data?.map((tier) => (
                      <TableRow key={tier.id}>
                        <TableCell className="font-medium">{tier.name}</TableCell>
                        <TableCell>
                          {formatCurrency(tier.price, tier.currency)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {CADENCE_LABEL[tier.billingCadence] ?? titleCase(tier.billingCadence)}
                        </TableCell>
                        <TableCell className="text-right">
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setConfirmDeleteTier(tier.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
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
          <form
            onSubmit={editForm.handleSubmit((v) => editMut.mutate(v))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input id="editName" placeholder="Pro Plan" {...editForm.register("name")} />
              {editForm.formState.errors.name && (
                <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Description</Label>
              <Textarea
                id="editDescription"
                rows={3}
                placeholder="What does this product include?"
                {...editForm.register("description")}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="editPrice">Price</Label>
                <Input
                  id="editPrice"
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...editForm.register("price")}
                />
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
                  <SelectTrigger id="editCurrency">
                    <SelectValue />
                  </SelectTrigger>
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
                <SelectTrigger id="editCadence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="ANNUALLY">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={editMut.isPending}>
                Save changes
              </Button>
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
          <form
            onSubmit={tierForm.handleSubmit((v) => createTier.mutate(v as PricingTierValues))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="tierName">Name</Label>
              <Input
                id="tierName"
                placeholder="e.g. Starter, Pro, Enterprise"
                {...tierForm.register("name")}
              />
              {tierForm.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {tierForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="tierPrice">Price</Label>
                <Input
                  id="tierPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...tierForm.register("price")}
                />
                {tierForm.formState.errors.price && (
                  <p className="text-xs text-destructive">
                    {tierForm.formState.errors.price.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tierCurrency">Currency</Label>
                <Select
                  defaultValue={p?.currency ?? "USD"}
                  onValueChange={(v) =>
                    tierForm.setValue("currency", v as typeof CURRENCIES[number])
                  }
                >
                  <SelectTrigger id="tierCurrency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="NPR">NPR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tierCadence">Billing cadence</Label>
              <Select
                defaultValue={p?.billingCadence ?? "MONTHLY"}
                onValueChange={(v) =>
                  tierForm.setValue("billingCadence", v as PricingTierValues["billingCadence"])
                }
              >
                <SelectTrigger id="tierCadence">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                  <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                  <SelectItem value="ANNUALLY">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAddTierOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={createTier.isPending}>
                Create tier
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteTier !== null}
        onOpenChange={(open) => !open && setConfirmDeleteTier(null)}
        title="Delete pricing tier?"
        description="This only removes the tier definition. Existing customer assignments won't be affected, but their price will fall back to the product's base price."
        confirmText="Delete tier"
        destructive
        loading={deleteTier.isPending}
        onConfirm={() => confirmDeleteTier && deleteTier.mutate(confirmDeleteTier)}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this product?"
        description="You can only delete a product that isn't assigned to any active plan."
        confirmText="Delete product"
        destructive
        loading={del.isPending}
        onConfirm={() => del.mutate()}
      />
    </div>
  )
}

type StatTone = "default" | "emerald" | "amber"

function Stat({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  hint?: string
  tone?: StatTone
}) {
  const toneClasses: Record<StatTone, string> = {
    default: "bg-secondary text-foreground",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  }
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            toneClasses[tone]
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="font-display text-xl font-semibold tracking-tight">
            {value}
          </p>
          {hint && (
            <p className="truncate text-xs text-muted-foreground">{hint}</p>
          )}
        </div>
      </div>
    </Card>
  )
}

function ProductDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-[hsl(265_85%_65%)]/40 to-[hsl(290_85%_60%)]/40" />
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-72" />
                <div className="flex gap-4 pt-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card/60 px-6 py-5 lg:min-w-[220px]">
              <Skeleton className="ml-auto h-3 w-12" />
              <Skeleton className="ml-auto mt-2 h-8 w-32" />
              <Skeleton className="ml-auto mt-2 h-3 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <Skeleton className="h-5 w-44" />
        </CardHeader>
        <TableSkeleton rows={4} cols={5} />
      </Card>
    </div>
  )
}
