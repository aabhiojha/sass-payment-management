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
  ChevronDown,
  X,
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

import { auditApi, type AuditFilter } from "@/lib/api/audit"
import { cn, formatDateTime, titleCase } from "@/lib/utils"
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

const ACTION_VARIANT: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
  CREATE: "success",
  UPDATE: "info",
  DELETE: "danger",
  STATUS_CHANGE: "warning",
  LOGIN: "muted",
  LOGOUT: "muted",
  LOGIN_FAILED: "danger",
}

const ACTIONS = ["CREATE", "UPDATE", "DELETE", "STATUS_CHANGE", "LOGIN", "LOGOUT", "LOGIN_FAILED"] as const
const RESOURCE_TYPES = ["USER", "TENANT", "CUSTOMER", "PRODUCT", "CUSTOMER_PRODUCT"] as const

const PRESETS: { label: string; actions: string[]; resources: string[] }[] = [
  { label: "All writes", actions: ["CREATE", "UPDATE", "DELETE"], resources: [] },
  { label: "Auth events", actions: ["LOGIN", "LOGOUT", "LOGIN_FAILED"], resources: [] },
  { label: "Status changes", actions: ["STATUS_CHANGE"], resources: [] },
  { label: "Destructive", actions: ["DELETE"], resources: [] },
  { label: "Tenant ops", actions: [], resources: ["TENANT"] },
  { label: "User ops", actions: [], resources: ["USER"] },
]

function toggleInSet(set: string[], value: string): string[] {
  return set.includes(value) ? set.filter((v) => v !== value) : [...set, value]
}

export default function AuditLogsPage() {
  const router = useRouter()
  const { isSuperAdmin } = useRole()
  const [page, setPage] = useState(0)
  const [size] = useState(25)

  const [selectedActions, setSelectedActions] = useState<string[]>([])
  const [selectedResources, setSelectedResources] = useState<string[]>([])
  const [resourceIdInput, setResourceIdInput] = useState("")
  const [actorSearch, setActorSearch] = useState("")
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!isSuperAdmin) router.replace("/dashboard")
  }, [isSuperAdmin, router])

  const filter: AuditFilter = {}
  if (selectedActions.length) filter.actions = selectedActions
  if (selectedResources.length) filter.resourceTypes = selectedResources
  if (actorSearch.trim()) filter.actorEmail = actorSearch.trim()
  if (resourceIdInput.trim()) {
    const n = Number(resourceIdInput.trim())
    if (!isNaN(n)) filter.resourceId = n
  }

  const hasFilters =
    selectedActions.length > 0 ||
    selectedResources.length > 0 ||
    resourceIdInput.trim() !== "" ||
    actorSearch.trim() !== ""

  const activeChipCount =
    selectedActions.length + selectedResources.length +
    (actorSearch.trim() ? 1 : 0) +
    (resourceIdInput.trim() ? 1 : 0)

  function clearFilters() {
    setSelectedActions([])
    setSelectedResources([])
    setResourceIdInput("")
    setActorSearch("")
    setPage(0)
  }

  function applyPreset(preset: typeof PRESETS[number]) {
    setSelectedActions(preset.actions)
    setSelectedResources(preset.resources)
    setPage(0)
  }

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, size, selectedActions, selectedResources, resourceIdInput, actorSearch],
    queryFn: () => auditApi.list(page, size, filter),
    enabled: isSuperAdmin,
  })

  if (!isSuperAdmin) return null

  const rows = data?.content ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Timestamped record of every change made across the platform."
      />

      <Card>
        {/* ── Filter header ─────────────────────────────────── */}
        <div className="border-b border-border">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters</span>
              {activeChipCount > 0 && (
                <Badge variant="default" className="h-5 min-w-[20px] justify-center px-1.5 text-[10px]">
                  {activeChipCount}
                </Badge>
              )}
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showFilters && "rotate-180")} />
          </button>

          {showFilters && (
            <div className="space-y-4 px-4 pb-4 animate-fade-in">
              {/* Search + Resource ID */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search actor email…"
                    value={actorSearch}
                    onChange={(e) => { setActorSearch(e.target.value); setPage(0) }}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <Input
                  placeholder="Resource ID"
                  value={resourceIdInput}
                  onChange={(e) => { setResourceIdInput(e.target.value); setPage(0) }}
                  className="h-8 text-xs sm:w-28"
                />
              </div>

              {/* Action chips */}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Actions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ACTIONS.map((a) => {
                    const Icon = ACTION_ICON[a]
                    const active = selectedActions.includes(a)
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => { setSelectedActions(toggleInSet(selectedActions, a)); setPage(0) }}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                          active
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {titleCase(a)}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Resource type chips */}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Resource type
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {RESOURCE_TYPES.map((r) => {
                    const active = selectedResources.includes(r)
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setSelectedResources(toggleInSet(selectedResources, r)); setPage(0) }}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all",
                          active
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                        )}
                      >
                        {titleCase(r)}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Presets */}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Quick presets
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="inline-flex items-center rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-muted-foreground transition-all hover:border-primary/30 hover:text-foreground"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active filter summary + clear */}
              {hasFilters && (
                <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mr-1">Active:</span>
                  {selectedActions.map((a) => (
                    <Badge key={a} variant="secondary" className="gap-1 pr-1">
                      {titleCase(a)}
                      <button type="button" onClick={() => { setSelectedActions(selectedActions.filter((x) => x !== a)); setPage(0) }} className="rounded-full p-0.5 hover:bg-muted">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                  {selectedResources.map((r) => (
                    <Badge key={r} variant="secondary" className="gap-1 pr-1">
                      {titleCase(r)}
                      <button type="button" onClick={() => { setSelectedResources(selectedResources.filter((x) => x !== r)); setPage(0) }} className="rounded-full p-0.5 hover:bg-muted">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                  {actorSearch.trim() && (
                    <Badge variant="secondary" className="gap-1 pr-1">
                      Actor: {actorSearch}
                      <button type="button" onClick={() => { setActorSearch(""); setPage(0) }} className="rounded-full p-0.5 hover:bg-muted">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  )}
                  {resourceIdInput.trim() && (
                    <Badge variant="secondary" className="gap-1 pr-1">
                      ID: {resourceIdInput}
                      <button type="button" onClick={() => { setResourceIdInput(""); setPage(0) }} className="rounded-full p-0.5 hover:bg-muted">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" className="ml-auto h-6 text-[10px]" onClick={clearFilters}>
                    <FilterX className="h-3 w-3" /> Clear all
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Count bar ─────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <p className="text-xs text-muted-foreground">
            {data?.totalElements ?? 0} entries
          </p>
        </div>

        {/* ── Results ───────────────────────────────────────── */}
        {isLoading ? (
          <TableSkeleton rows={8} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={hasFilters ? "No matching events" : "No audit events yet"}
            description={
              hasFilters
                ? "Try adjusting the filters above."
                : "Actions taken across the platform will be recorded here."
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
                            <span className="text-xs text-muted-foreground">#{a.resourceId}</span>
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
                            <span className="text-xs text-muted-foreground">—</span>
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
                  <div key={a.id} className="rounded-lg border border-border p-3 space-y-2">
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
                      {a.resourceId != null && <span className="text-muted-foreground"> #{a.resourceId}</span>}
                    </div>
                    {(a.newValue || a.oldValue) && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View change</summary>
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
