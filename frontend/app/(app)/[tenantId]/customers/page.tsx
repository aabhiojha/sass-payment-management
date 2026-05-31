"use client"

import { useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Plus, UserCircle2 } from "lucide-react"

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

import { customersApi } from "@/lib/api/customers"
import { formatDate } from "@/lib/utils"
import { useDebounce } from "@/hooks/useDebounce"

export default function CustomersPage({
  params,
}: {
  params: { tenantId: string }
}) {
  const tenantId = Number(params.tenantId)
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [q, setQ] = useState("")
  const debouncedQ = useDebounce(q)
  const [statusFilter, setStatusFilter] = useState("ACTIVE")

  const apiStatus = statusFilter === "ALL" ? undefined : statusFilter

  const { data, isLoading } = useQuery({
    queryKey: ["customers", tenantId, page, size, apiStatus, debouncedQ],
    queryFn: () => customersApi.list(tenantId, page, size, apiStatus, debouncedQ || undefined),
  })

  const rows = data?.content ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Manage the people and organisations being billed in this workspace."
        actions={
          <Button asChild>
            <Link href={`/${tenantId}/customers/new`}>
              <Plus className="h-4 w-4" /> New customer
            </Link>
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email…"
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
          <TableSkeleton rows={6} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UserCircle2}
            title="No customers yet"
            description="Add your first customer to start assigning plans and sending reminders."
            action={
              <Button asChild>
                <Link href={`/${tenantId}/customers/new`}>
                  <Plus className="h-4 w-4" /> New customer
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
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <Link
                          href={`/${tenantId}/customers/${c.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.email}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={c.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(c.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/${tenantId}/customers/${c.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list */}
            <div className="divide-y divide-border sm:hidden">
              {rows.map((c) => (
                <Link
                  key={c.id}
                  href={`/${tenantId}/customers/${c.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-secondary/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground mt-0.5">{c.email}</p>
                  </div>
                  <StatusBadge status={c.status} />
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
