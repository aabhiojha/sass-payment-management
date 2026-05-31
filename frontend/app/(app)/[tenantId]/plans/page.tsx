"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Ban, ClipboardList, MoreHorizontal, PauseCircle, Pencil, Play } from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/PageHeader"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { plansApi } from "@/lib/api/plans"
import { friendlyError } from "@/lib/axios"
import { formatCurrency, formatDate } from "@/lib/utils"
import { useDebounce } from "@/hooks/useDebounce"
import { SearchInput } from "@/components/shared/SearchInput"
import type { CustomerProductResponse } from "@/types/api"

// ── helpers ───────────────────────────────────────────────────────────────────

function toLocalInput(iso?: string | null): string {
  if (!iso) return ""
  return iso.slice(0, 16)
}

function toIso(local: string): string {
  return local ? new Date(local).toISOString() : ""
}

// ── schema ────────────────────────────────────────────────────────────────────

const editPlanSchema = z.object({
  startsAt: z.string().min(1, "Start date is required"),
  endsAt: z.string().optional(),
  notes: z.string().optional(),
})
type EditPlanValues = z.infer<typeof editPlanSchema>

// ── page ──────────────────────────────────────────────────────────────────────

export default function PlansPage({
  params,
}: {
  params: { tenantId: string }
}) {
  const tenantId = Number(params.tenantId)
  const qc = useQueryClient()

  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [filter, setFilter] = useState<string>("ALL")
  const [q, setQ] = useState("")
  const debouncedQ = useDebounce(q)

  const [editPlanOpen, setEditPlanOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<CustomerProductResponse | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["plans", tenantId, page, size, filter, debouncedQ],
    queryFn: () => plansApi.listAll(tenantId, page, size, filter, debouncedQ || undefined),
  })

  const form = useForm<EditPlanValues>({ resolver: zodResolver(editPlanSchema) })

  const editMut = useMutation({
    mutationFn: (values: EditPlanValues) =>
      plansApi.update(tenantId, editingPlan!.customerId, editingPlan!.id, {
        startsAt: toIso(values.startsAt),
        endsAt: values.endsAt ? toIso(values.endsAt) : undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans", tenantId] })
      toast.success("Plan updated")
      setEditPlanOpen(false)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const statusMut = useMutation({
    mutationFn: ({ plan, status }: { plan: CustomerProductResponse; status: "ACTIVE" | "PAUSED" | "CANCELLED" }) =>
      plansApi.setStatus(tenantId, plan.customerId, plan.id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plans", tenantId] })
      toast.success("Plan updated")
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  function openEdit(p: CustomerProductResponse) {
    setEditingPlan(p)
    form.reset({
      startsAt: toLocalInput(p.startsAt),
      endsAt: toLocalInput(p.endsAt),
      notes: p.notes ?? "",
    })
    setEditPlanOpen(true)
  }

  const rows = data?.content ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans"
        description="Every active, paused, and cancelled subscription across your tenant."
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(0) }}
            placeholder="Search by customer or product…"
          />
          <div className="flex items-center gap-3 shrink-0">
            <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(0) }}>
              <SelectTrigger className="min-w-[130px] h-8 text-xs">
                <SelectValue placeholder="Filter…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              {data?.totalElements ?? 0} {filter === "ALL" ? "total" : filter.toLowerCase()}
            </p>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No plans found"
            description="Assign a product to a customer to see plans appear here."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link href={`/${tenantId}/customers/${p.customerId}`} className="font-medium hover:underline">
                          {p.customerName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={`/${tenantId}/products/${p.productId}`} className="hover:underline">
                          {p.productName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.productPlanName ?? <span className="italic">Default</span>}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatCurrency(p.amount, p.currency)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(p.startsAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(p)}>
                              <Pencil className="h-4 w-4" /> Edit plan
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {p.status === "ACTIVE" && (
                              <DropdownMenuItem onClick={() => statusMut.mutate({ plan: p, status: "PAUSED" })}>
                                <PauseCircle className="h-4 w-4" /> Pause
                              </DropdownMenuItem>
                            )}
                            {p.status === "PAUSED" && (
                              <DropdownMenuItem onClick={() => statusMut.mutate({ plan: p, status: "ACTIVE" })}>
                                <Play className="h-4 w-4" /> Resume
                              </DropdownMenuItem>
                            )}
                            {p.status !== "CANCELLED" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  destructive
                                  onClick={() => statusMut.mutate({ plan: p, status: "CANCELLED" })}
                                >
                                  <Ban className="h-4 w-4" /> Cancel
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
              {rows.map((p) => (
                <div key={p.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/${tenantId}/customers/${p.customerId}`} className="font-medium text-sm hover:underline">
                      {p.customerName}
                    </Link>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/${tenantId}/products/${p.productId}`} className="text-xs text-muted-foreground hover:underline">
                      {p.productName}{p.productPlanName && ` · ${p.productPlanName}`}
                    </Link>
                    <p className="text-sm font-medium shrink-0">{formatCurrency(p.amount, p.currency)}</p>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                      <Pencil className="h-3 w-3" /> Edit
                    </Button>
                    {p.status === "ACTIVE" && (
                      <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ plan: p, status: "PAUSED" })}>
                        <PauseCircle className="h-3 w-3" /> Pause
                      </Button>
                    )}
                    {p.status === "PAUSED" && (
                      <Button size="sm" variant="outline" onClick={() => statusMut.mutate({ plan: p, status: "ACTIVE" })}>
                        <Play className="h-3 w-3" /> Resume
                      </Button>
                    )}
                    {p.status !== "CANCELLED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive ml-auto"
                        onClick={() => statusMut.mutate({ plan: p, status: "CANCELLED" })}
                      >
                        <Ban className="h-3 w-3" /> Cancel
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border">
              <Pagination
                page={page}
                totalPages={data?.totalPages ?? 0}
                totalElements={data?.totalElements}
                pageSize={size}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>

      {/* Edit plan dialog */}
      <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Edit plan</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((v) => editMut.mutate(v))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="startsAt">Start date</Label>
              <Input id="startsAt" type="datetime-local" {...form.register("startsAt")} />
              {form.formState.errors.startsAt && (
                <p className="text-xs text-destructive">{form.formState.errors.startsAt.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endsAt">
                End date{" "}
                <span className="text-muted-foreground font-normal">(leave blank for open-ended)</span>
              </Label>
              <Input id="endsAt" type="datetime-local" {...form.register("endsAt")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={2} {...form.register("notes")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditPlanOpen(false)}>Cancel</Button>
              <Button type="submit" loading={editMut.isPending}>Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
