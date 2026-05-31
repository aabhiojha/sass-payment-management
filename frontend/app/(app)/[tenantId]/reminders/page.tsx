"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Clock, Zap } from "lucide-react"

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
import { Button } from "@/components/ui/button"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { remindersApi } from "@/lib/api/reminders"
import { formatDateTime } from "@/lib/utils"
import { friendlyError } from "@/lib/axios"

export default function RemindersPage({
  params,
}: {
  params: { tenantId: string }
}) {
  const tenantId = Number(params.tenantId)
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [filter, setFilter] = useState("ALL")

  const { data, isLoading } = useQuery({
    queryKey: ["reminders", tenantId, page, size, filter],
    queryFn: () => remindersApi.list(tenantId, page, size, filter),
  })

  const rows = data?.content ?? []

  const trigger = useMutation({
    mutationFn: () => remindersApi.trigger(tenantId),
    onSuccess: (rs) => {
      qc.invalidateQueries({ queryKey: ["reminders", tenantId] })
      toast.success(`Processed ${rs.length} reminder${rs.length === 1 ? "" : "s"}`)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reminders"
        description="Outbound reminder dispatches across this workspace."
        actions={
          <Button onClick={() => trigger.mutate()} loading={trigger.isPending}>
            <Zap className="h-4 w-4" /> Trigger now
          </Button>
        }
      />

      <Card>
        <div className="flex items-center justify-between border-b border-border p-4">
          <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(0) }}>
            <SelectTrigger className="min-w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="SKIPPED">Skipped</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{data?.totalElements ?? 0} total</p>
        </div>

        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Clock}
            title={filter === "ALL" ? "No reminders yet" : "No matching reminders"}
            description={
              filter === "ALL"
                ? "Run a dispatch manually or wait for the scheduled batch to fire."
                : "Try a different status filter."
            }
            action={
              filter === "ALL" ? (
                <Button onClick={() => trigger.mutate()} loading={trigger.isPending}>
                  <Zap className="h-4 w-4" /> Trigger reminders
                </Button>
              ) : undefined
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
                    <TableHead>Product</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Link
                          href={`/${tenantId}/customers/${r.customerId}`}
                          className="font-medium hover:underline"
                        >
                          {r.customerName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{r.productName}</TableCell>
                      <TableCell>
                        <StatusBadge status={r.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDateTime(r.sentAt)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                        {r.errorMessage ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list */}
            <div className="divide-y divide-border sm:hidden">
              {rows.map((r) => (
                <div key={r.id} className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/${tenantId}/customers/${r.customerId}`}
                      className="font-medium text-sm hover:underline"
                    >
                      {r.customerName}
                    </Link>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">{r.productName}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{formatDateTime(r.sentAt)}</span>
                    {r.errorMessage && (
                      <span className="truncate text-[11px] text-destructive max-w-[60%] text-right">
                        {r.errorMessage}
                      </span>
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
    </div>
  )
}
