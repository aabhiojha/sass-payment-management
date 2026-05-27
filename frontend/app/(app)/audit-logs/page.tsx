"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import {
  ScrollText,
  FilePlus2,
  FileEdit,
  FileMinus,
  RefreshCcw,
  LogIn,
  LogOut,
  AlertTriangle,
  FilterX,
  Search,
} from "lucide-react"

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
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { auditApi, type AuditFilter } from "@/lib/api/audit"
import { formatDateTime, titleCase } from "@/lib/utils"
import { useRole } from "@/hooks/useRole"

const ACTION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  CREATE: FilePlus2,
  UPDATE: FileEdit,
  DELETE: FileMinus,
  STATUS_CHANGE: RefreshCcw,
  LOGIN: LogIn,
  LOGOUT: LogOut,
  LOGIN_FAILED: AlertTriangle,
}

const ACTION_VARIANT: Record<
  string,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "danger",
  STATUS_CHANGE: "warning",
  LOGIN: "muted",
  LOGOUT: "muted",
  LOGIN_FAILED: "danger",
}

const ACTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "STATUS_CHANGE",
  "LOGIN",
  "LOGOUT",
  "LOGIN_FAILED",
] as const

const RESOURCE_TYPES = [
  "USER",
  "TENANT",
  "CUSTOMER",
  "PRODUCT",
  "CUSTOMER_PRODUCT",
] as const

export default function AuditLogsPage() {
  const router = useRouter()
  const { isSuperAdmin } = useRole()
  const [page, setPage] = useState(0)
  const [size] = useState(25)

  const [action, setAction] = useState("ALL")
  const [resourceType, setResourceType] = useState("ALL")
  const [resourceIdInput, setResourceIdInput] = useState("")
  const [actorSearch, setActorSearch] = useState("")

  useEffect(() => {
    if (!isSuperAdmin) router.replace("/dashboard")
  }, [isSuperAdmin, router])

  const filter: AuditFilter = {}
  if (action !== "ALL") filter.action = action as AuditFilter["action"]
  if (resourceType !== "ALL") filter.resourceType = resourceType
  if (resourceIdInput.trim()) {
    const n = Number(resourceIdInput.trim())
    if (!isNaN(n)) filter.resourceId = n
  }

  const hasFilters =
    action !== "ALL" ||
    resourceType !== "ALL" ||
    resourceIdInput.trim() !== "" ||
    actorSearch.trim() !== ""

  function clearFilters() {
    setAction("ALL")
    setResourceType("ALL")
    setResourceIdInput("")
    setActorSearch("")
    setPage(0)
  }

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, size, action, resourceType, resourceIdInput],
    queryFn: () => auditApi.list(page, size, filter),
    enabled: isSuperAdmin,
  })

  if (!isSuperAdmin) return null

  const actorQ = actorSearch.trim().toLowerCase()
  const rows = (data?.content ?? []).filter((a) =>
    actorQ ? a.actorEmail.toLowerCase().includes(actorQ) : true
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Timestamped record of every change made across the platform."
      />

      <Card>
        {/* Filter bar */}
        <div className="flex flex-col gap-3 border-b border-border p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative flex-1 sm:max-w-[220px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search actor email…"
                value={actorSearch}
                onChange={(e) => { setActorSearch(e.target.value); setPage(0) }}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <Select value={action} onValueChange={(v) => { setAction(v); setPage(0) }}>
              <SelectTrigger className="h-8 w-full text-xs sm:w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All actions</SelectItem>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {titleCase(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={resourceType} onValueChange={(v) => { setResourceType(v); setPage(0) }}>
              <SelectTrigger className="h-8 w-full text-xs sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All resources</SelectItem>
                {RESOURCE_TYPES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {titleCase(r)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              placeholder="Resource ID"
              value={resourceIdInput}
              onChange={(e) => { setResourceIdInput(e.target.value); setPage(0) }}
              className="h-8 w-full text-xs sm:w-[110px]"
            />

            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs shrink-0" onClick={clearFilters}>
                <FilterX className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {data?.totalElements ?? 0} total entries
              {hasFilters && ` · ${rows.length} shown`}
            </p>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={hasFilters ? "No matching events" : "No audit events yet"}
            description={
              hasFilters
                ? "Try adjusting the filters above."
                : "Actions taken across the platform will be recorded here for compliance."
            }
            action={
              hasFilters ? (
                <Button variant="outline" size="sm" onClick={clearFilters}>
                  <FilterX className="h-3.5 w-3.5" /> Clear filters
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
                    <TableHead>When</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a) => {
                    const Icon = ACTION_ICON[a.action] ?? FileEdit
                    const variant = ACTION_VARIANT[a.action] ?? "muted"
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatDateTime(a.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm">{a.actorEmail}</TableCell>
                        <TableCell>
                          <Badge variant={variant}>
                            <Icon className="h-3 w-3" />
                            {titleCase(a.action)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {titleCase(a.resourceType)}{" "}
                          {a.resourceId != null && (
                            <span className="text-xs text-muted-foreground">
                              #{a.resourceId}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-md">
                          {a.newValue || a.oldValue ? (
                            <details className="group text-xs">
                              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                View change
                              </summary>
                              <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-secondary/40 p-2 text-[11px] leading-relaxed text-foreground scrollbar-thin">
                                {a.oldValue && `- ${a.oldValue}\n`}
                                {a.newValue && `+ ${a.newValue}`}
                              </pre>
                            </details>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list */}
            <div className="space-y-0.5 p-2 sm:hidden">
              {rows.map((a) => {
                const Icon = ACTION_ICON[a.action] ?? FileEdit
                const variant = ACTION_VARIANT[a.action] ?? "muted"
                return (
                  <div
                    key={a.id}
                    className="rounded-lg border border-border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={variant}>
                        <Icon className="h-3 w-3" />
                        {titleCase(a.action)}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDateTime(a.createdAt)}
                      </span>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Actor: </span>
                      <span className="font-medium break-all">{a.actorEmail}</span>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Resource: </span>
                      {titleCase(a.resourceType)}
                      {a.resourceId != null && (
                        <span className="text-muted-foreground"> #{a.resourceId}</span>
                      )}
                    </div>
                    {(a.newValue || a.oldValue) && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          View change
                        </summary>
                        <pre className="mt-1 overflow-x-auto rounded-md border border-border bg-secondary/40 p-2 text-[10px] leading-relaxed text-foreground scrollbar-thin">
                          {a.oldValue && `- ${a.oldValue}\n`}
                          {a.newValue && `+ ${a.newValue}`}
                        </pre>
                      </details>
                    )}
                  </div>
                )
              })}
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
