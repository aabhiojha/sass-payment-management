"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowLeft,
  Ban,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { EmptyState } from "@/components/shared/EmptyState"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton } from "@/components/shared/TableSkeleton"

import { customersApi } from "@/lib/api/customers"
import { plansApi } from "@/lib/api/plans"
import { friendlyError } from "@/lib/axios"
import { formatCurrency, formatDate, initials } from "@/lib/utils"
import { useRole } from "@/hooks/useRole"

const editSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})
type EditValues = z.infer<typeof editSchema>

export default function CustomerDetailPage({
  params,
}: {
  params: { tenantId: string; customerId: string }
}) {
  const tenantId = Number(params.tenantId)
  const customerId = Number(params.customerId)
  const router = useRouter()
  const qc = useQueryClient()
  const { isAtLeast } = useRole()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const customer = useQuery({
    queryKey: ["customers", tenantId, customerId],
    queryFn: () => customersApi.get(tenantId, customerId),
  })
  const plans = useQuery({
    queryKey: ["customers", tenantId, customerId, "products"],
    queryFn: () => plansApi.listForCustomer(tenantId, customerId, 0, 50),
  })

  const editForm = useForm<EditValues>({ resolver: zodResolver(editSchema) })

  const editMut = useMutation({
    mutationFn: (data: EditValues) => customersApi.update(tenantId, customerId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", tenantId, customerId] })
      qc.invalidateQueries({ queryKey: ["customers", tenantId] })
      toast.success("Customer updated")
      setEditOpen(false)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const del = useMutation({
    mutationFn: () => customersApi.delete(tenantId, customerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", tenantId] })
      toast.success("Customer deleted")
      router.push(`/${tenantId}/customers`)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const statusMut = useMutation({
    mutationFn: ({ cpId, status }: { cpId: number; status: "ACTIVE" | "PAUSED" | "CANCELLED" }) =>
      plansApi.setStatus(tenantId, customerId, cpId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["customers", tenantId, customerId, "products"] })
      toast.success("Plan updated")
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const c = customer.data
  const planRows = plans.data?.content ?? []
  const activeCount = planRows.filter((p) => p.status === "ACTIVE").length

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={`/${tenantId}/customers`} className="inline-flex items-center gap-1 hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Customers
          </Link>
        }
        title={c?.name ?? "Loading…"}
        description={c?.email}
        actions={
          c && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/${tenantId}/customers/${customerId}/products/new`}>
                  <Plus className="h-4 w-4" /> Assign product
                </Link>
              </Button>
              {isAtLeast("TENANT_ADMIN") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    editForm.reset({
                      name: c.name,
                      email: c.email,
                      phone: c.phone ?? "",
                      address: c.address ?? "",
                      notes: c.notes ?? "",
                    })
                    setEditOpen(true)
                  }}
                >
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
              )}
              {isAtLeast("TENANT_ADMIN") && (
                <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
              )}
            </>
          )
        }
      />

      {!c && <CustomerDetailSkeleton />}

      {c && (
        <>
          {/* Customer info */}
          <Card>
            <CardHeader className="flex-row items-center gap-4 pb-4">
              <Avatar className="h-12 w-12 shrink-0">
                <AvatarFallback className="text-sm font-medium">{initials(c.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-semibold tracking-tight truncate">{c.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={c.status} />
                  <span className="text-xs text-muted-foreground">Added {formatDate(c.createdAt)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <dl className="divide-y divide-border">
                <div className="flex items-baseline justify-between px-6 py-3">
                  <dt className="text-xs text-muted-foreground w-24 shrink-0">Email</dt>
                  <dd className="text-sm text-right break-all">{c.email}</dd>
                </div>
                <div className="flex items-baseline justify-between px-6 py-3">
                  <dt className="text-xs text-muted-foreground w-24 shrink-0">Phone</dt>
                  <dd className="text-sm text-right">{c.phone || <span className="text-muted-foreground/50">—</span>}</dd>
                </div>
                <div className="flex items-baseline justify-between px-6 py-3">
                  <dt className="text-xs text-muted-foreground w-24 shrink-0">Address</dt>
                  <dd className="text-sm text-right">{c.address || <span className="text-muted-foreground/50">—</span>}</dd>
                </div>
                {c.notes && (
                  <div className="flex items-start justify-between px-6 py-3">
                    <dt className="text-xs text-muted-foreground w-24 shrink-0 pt-0.5">Notes</dt>
                    <dd className="text-sm text-right whitespace-pre-wrap">{c.notes}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Plans */}
          <Card>
            <CardHeader className="flex-row items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Assigned plans</CardTitle>
                {planRows.length > 0 && (
                  <Badge variant="secondary">{planRows.length}</Badge>
                )}
                {activeCount > 0 && (
                  <Badge variant="success">{activeCount} active</Badge>
                )}
              </div>
              <Button size="sm" asChild>
                <Link href={`/${tenantId}/customers/${customerId}/products/new`}>
                  <Plus className="h-4 w-4" /> Assign product
                </Link>
              </Button>
            </CardHeader>

            {plans.isLoading ? (
              <TableSkeleton rows={3} cols={5} />
            ) : planRows.length === 0 ? (
              <EmptyState
                icon={Plus}
                title="No plans assigned"
                description="Assign a product to start tracking this customer's subscription."
                action={
                  <Button asChild>
                    <Link href={`/${tenantId}/customers/${customerId}/products/new`}>
                      <Plus className="h-4 w-4" /> Assign product
                    </Link>
                  </Button>
                }
              />
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {planRows.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <p className="font-medium">{p.productName}</p>
                            {p.productPlanName && (
                              <p className="text-xs text-muted-foreground">{p.productPlanName}</p>
                            )}
                            {p.notes && (
                              <p className="text-xs text-muted-foreground">{p.notes}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {formatCurrency(p.amount, p.currency)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(p.startsAt)} →{" "}
                            {p.endsAt ? formatDate(p.endsAt) : <span className="italic">Open-ended</span>}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={p.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {p.status === "ACTIVE" && (
                                  <DropdownMenuItem onClick={() => statusMut.mutate({ cpId: p.id, status: "PAUSED" })}>
                                    <PauseCircle className="h-4 w-4" /> Pause
                                  </DropdownMenuItem>
                                )}
                                {p.status === "PAUSED" && (
                                  <DropdownMenuItem onClick={() => statusMut.mutate({ cpId: p.id, status: "ACTIVE" })}>
                                    <Play className="h-4 w-4" /> Resume
                                  </DropdownMenuItem>
                                )}
                                {p.status !== "CANCELLED" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      destructive
                                      onClick={() => statusMut.mutate({ cpId: p.id, status: "CANCELLED" })}
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
                  {planRows.map((p) => (
                    <div key={p.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{p.productName}</p>
                          {p.productPlanName && (
                            <p className="text-xs text-muted-foreground">{p.productPlanName}</p>
                          )}
                        </div>
                        <StatusBadge status={p.status} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{formatCurrency(p.amount, p.currency)}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(p.startsAt)} → {p.endsAt ? formatDate(p.endsAt) : "Open-ended"}
                        </span>
                      </div>
                      {p.status !== "CANCELLED" && (
                        <div className="flex gap-2 pt-1">
                          {p.status === "ACTIVE" && (
                            <Button size="xs" variant="outline" onClick={() => statusMut.mutate({ cpId: p.id, status: "PAUSED" })}>
                              <PauseCircle className="h-3 w-3" /> Pause
                            </Button>
                          )}
                          {p.status === "PAUSED" && (
                            <Button size="xs" variant="outline" onClick={() => statusMut.mutate({ cpId: p.id, status: "ACTIVE" })}>
                              <Play className="h-3 w-3" /> Resume
                            </Button>
                          )}
                          <Button
                            size="xs"
                            variant="outline"
                            className="text-destructive ml-auto"
                            onClick={() => statusMut.mutate({ cpId: p.id, status: "CANCELLED" })}
                          >
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
        </>
      )}

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Edit customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit((v) => editMut.mutate(v))} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Name</Label>
              <Input id="editName" {...editForm.register("name")} />
              {editForm.formState.errors.name && (
                <p className="text-xs text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email</Label>
              <Input id="editEmail" type="email" {...editForm.register("email")} />
              {editForm.formState.errors.email && (
                <p className="text-xs text-destructive">{editForm.formState.errors.email.message}</p>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="editPhone">Phone</Label>
                <Input id="editPhone" {...editForm.register("phone")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editAddress">Address</Label>
                <Input id="editAddress" {...editForm.register("address")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editNotes">Notes</Label>
              <Textarea id="editNotes" rows={3} {...editForm.register("notes")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" loading={editMut.isPending}>Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this customer?"
        description="This permanently removes the customer. Cancel all active plans first."
        confirmText="Delete customer"
        destructive
        loading={del.isPending}
        onConfirm={() => del.mutate()}
      />
    </div>
  )
}

function CustomerDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center gap-4 pb-4">
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <TableSkeleton rows={3} cols={5} />
      </Card>
    </div>
  )
}
