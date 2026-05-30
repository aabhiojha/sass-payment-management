"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Package, Plus } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Button } from "@/components/ui/button"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SearchInput } from "@/components/shared/SearchInput"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"

import { productsApi } from "@/lib/api/products"
import { formatCurrency, formatDate, titleCase } from "@/lib/utils"

const CADENCE_LABEL: Record<string, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUALLY: "Annual",
}

export default function ProductsPage({
  params,
}: {
  params: { tenantId: string }
}) {
  const tenantId = Number(params.tenantId)
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [q, setQ] = useState("")
  const [statusFilter, setStatusFilter] = useState("ACTIVE")

  const apiStatus = statusFilter === "ALL" ? undefined : statusFilter

  const { data, isLoading } = useQuery({
    queryKey: ["products", tenantId, page, size, apiStatus],
    queryFn: () => productsApi.list(tenantId, page, size, apiStatus),
  })

  const rows = useMemo(() => {
    const list = data?.content ?? []
    if (!q) return list
    const needle = q.toLowerCase()
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        (p.description ?? "").toLowerCase().includes(needle)
    )
  }, [data, q])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="The catalog of subscription offerings you bill customers for."
        actions={
          <Button asChild>
            <Link href={`/${tenantId}/products/new`}>
              <Plus className="h-4 w-4" /> New product
            </Link>
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or description…"
          />
          <div className="flex items-center gap-3 shrink-0">
            <Select
              value={statusFilter}
              onValueChange={(v) => { setStatusFilter(v); setPage(0) }}
            >
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="DELETED">Deleted</SelectItem>
                <SelectItem value="ALL">All statuses</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground whitespace-nowrap">
              {data?.totalElements ?? 0} total
            </p>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            description="Add a product to start building plans and reminders around it."
            action={
              <Button asChild>
                <Link href={`/${tenantId}/products/new`}>
                  <Plus className="h-4 w-4" /> New product
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
                    <TableHead>Price</TableHead>
                    <TableHead>Cadence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link
                          href={`/${tenantId}/products/${p.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {p.name}
                        </Link>
                        {p.description && (
                          <p className="truncate text-xs text-muted-foreground">
                            {p.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {formatCurrency(p.price, p.currency)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {p.currency}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {CADENCE_LABEL[p.billingCadence] ?? titleCase(p.billingCadence)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(p.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/${tenantId}/products/${p.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list */}
            <div className="divide-y divide-border sm:hidden">
              {rows.map((p) => (
                <Link
                  key={p.id}
                  href={`/${tenantId}/products/${p.id}`}
                  className="flex items-start gap-3 p-4 hover:bg-secondary/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground">{p.name}</p>
                    {p.description && (
                      <p className="truncate text-xs text-muted-foreground mt-0.5">{p.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <StatusBadge status={p.status} />
                      <span className="text-xs text-muted-foreground">
                        {CADENCE_LABEL[p.billingCadence] ?? titleCase(p.billingCadence)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium text-sm">{formatCurrency(p.price, p.currency)}</p>
                    <p className="text-xs text-muted-foreground">{p.currency}</p>
                  </div>
                </Link>
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
    </div>
  )
}
