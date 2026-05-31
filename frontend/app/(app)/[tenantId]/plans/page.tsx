"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ClipboardList } from "lucide-react"

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
import { formatCurrency, formatDate } from "@/lib/utils"
import { useDebounce } from "@/hooks/useDebounce"
import { SearchInput } from "@/components/shared/SearchInput"

export default function PlansPage({
  params,
}: {
  params: { tenantId: string }
}) {
  const tenantId = Number(params.tenantId)
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [filter, setFilter] = useState<string>("ALL")
  const [q, setQ] = useState("")
  const debouncedQ = useDebounce(q)

  const { data, isLoading } = useQuery({
    queryKey: ["plans", tenantId, page, size, filter, debouncedQ],
    queryFn: () => plansApi.listAll(tenantId, page, size, filter, debouncedQ || undefined),
  })

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
            <SelectTrigger className="w-[130px] h-8 text-xs">
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
                    <TableHead className="text-right">Started</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link
                          href={`/${tenantId}/customers/${p.customerId}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {p.customerName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/${tenantId}/products/${p.productId}`}
                          className="hover:underline"
                        >
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
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDate(p.startsAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list */}
            <div className="divide-y divide-border sm:hidden">
              {rows.map((p) => (
                <div key={p.id} className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/${tenantId}/customers/${p.customerId}`}
                      className="font-medium text-sm text-foreground hover:underline"
                    >
                      {p.customerName}
                    </Link>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/${tenantId}/products/${p.productId}`}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      {p.productName}
                      {p.productPlanName && ` · ${p.productPlanName}`}
                    </Link>
                    <p className="text-sm font-medium shrink-0">{formatCurrency(p.amount, p.currency)}</p>
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
    </div>
  )
}
