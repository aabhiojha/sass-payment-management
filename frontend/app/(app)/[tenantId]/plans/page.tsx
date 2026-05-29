"use client"

import { useState, useMemo } from "react"
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
import { formatDate } from "@/lib/utils"

export default function PlansPage({
  params,
}: {
  params: { tenantId: string }
}) {
  const tenantId = Number(params.tenantId)
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [filter, setFilter] = useState<string>("ALL")

  const { data, isLoading } = useQuery({
    queryKey: ["plans", tenantId, page, size],
    queryFn: () => plansApi.listAll(tenantId, page, size),
  })

  const rows = useMemo(() => {
    const all = data?.content ?? []
    return filter === "ALL" ? all : all.filter((p) => p.status === filter)
  }, [data, filter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plans"
        description="Every active, paused, and cancelled subscription across your tenant."
        actions={
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="PAUSED">Paused</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <Card>
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No plans found"
            description="Assign a product to a customer to see plans appear here."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
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
                      {formatDate(p.startsAt)} → {formatDate(p.endsAt)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatDate(p.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
