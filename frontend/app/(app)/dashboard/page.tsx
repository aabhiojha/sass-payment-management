"use client"

import { memo, useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Check,
  Send,
  SkipForward,
  UserCircle2,
  X,
  XCircle,
} from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  formatCurrency,
  formatDate,
  timeAgo,
} from "@/lib/utils"

import { useAuthStore } from "@/store/authStore"
import { useTenantStore } from "@/store/tenantStore"
import { useRole } from "@/hooks/useRole"
import { dashboardApi } from "@/lib/api/dashboard"
import { auditApi } from "@/lib/api/audit"
import { describeEvent } from "@/lib/audit-helpers"
import { useCountUp } from "@/hooks/useCountUp"

/* ------------------------------------------------------------------ */
/*  Animated stat cell                                                 */
/* ------------------------------------------------------------------ */

const StatCell = memo(function StatCell({
  label,
  value,
  sub,
  delay = 0,
}: {
  label: string
  value: number
  sub: string | null
  delay?: number
}) {
  const count = useCountUp(value)
  return (
    <div
      className="flex flex-col gap-0.5 bg-card px-5 py-4 motion-safe:animate-fade-in motion-safe:opacity-0 motion-safe:[animation-fill-mode:forwards]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-display text-2xl font-semibold tracking-tight tabular-nums">
        {count}
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  )
})

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-16 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-56 lg:col-span-2" />
        <Skeleton className="h-56" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-52" />
        <Skeleton className="h-52" />
      </div>
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-border bg-card px-6 py-10 text-center">
      <p className="text-sm text-muted-foreground">Could not load dashboard data.</p>
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Getting started checklist                                          */
/* ------------------------------------------------------------------ */

interface SummaryData {
  totalProducts: number
  totalCustomers: number
  activePlans: number
  pausedPlans: number
}

const ONBOARD_STEPS = [
  {
    id: "product",
    label: "Add a product",
    isComplete: (s: SummaryData) => s.totalProducts > 0,
    href: (id: number) => `/${id}/products/new`,
    action: "Add product",
  },
  {
    id: "customer",
    label: "Add a customer",
    isComplete: (s: SummaryData) => s.totalCustomers > 0,
    href: (id: number) => `/${id}/customers/new`,
    action: "Add customer",
  },
  {
    id: "plan",
    label: "Assign a plan",
    isComplete: (s: SummaryData) => (s.activePlans ?? 0) + (s.pausedPlans ?? 0) > 0,
    href: (id: number) => `/${id}/customers`,
    action: "Go to customers",
  },
] as const

function GettingStarted({ tenantId, summary }: { tenantId: number; summary: SummaryData }) {
  const storageKey = `paynest-gs-dismissed-${tenantId}`
  const [dismissed, setDismissed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setDismissed(localStorage.getItem(storageKey) === "1")
    setHydrated(true)
  }, [storageKey])

  const steps = ONBOARD_STEPS.map((s) => ({ ...s, done: s.isComplete(summary) }))
  const doneCount = steps.filter((s) => s.done).length
  const allDone = doneCount === steps.length

  // Hide once all steps are complete or user dismissed
  if (!hydrated || dismissed || allDone) return null

  function dismiss() {
    localStorage.setItem(storageKey, "1")
    setDismissed(true)
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base">Get started</CardTitle>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {doneCount} of {steps.length}
          </span>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss getting started"
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <ol className="divide-y divide-border" aria-label="Setup checklist">
          {steps.map((step) => (
            <li key={step.id} className="flex items-center gap-4 px-6 py-3">
              {step.done ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                </span>
              ) : (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border" />
              )}
              <span className={`flex-1 text-sm ${step.done ? "text-muted-foreground line-through" : "font-medium"}`}>
                {step.label}
              </span>
              {!step.done && (
                <Button variant="ghost" size="sm" asChild className="h-7 shrink-0 gap-1 text-xs">
                  <Link href={step.href(tenantId)}>
                    {step.action}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ol>
        <div className="px-6 py-3">
          <div className="h-1 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Super-admin dashboard                                              */
/* ------------------------------------------------------------------ */

function AdminDashboard() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const admin = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => dashboardApi.adminSummary(),
    enabled: !!accessToken,
  })
  const auditLogs = useQuery({
    queryKey: ["admin-audit-logs-recent"],
    queryFn: () => auditApi.list(0, 10),
    enabled: !!accessToken,
  })

  if (admin.isLoading) return <DashboardSkeleton />
  if (admin.isError || !admin.data) {
    return <ErrorState onRetry={() => admin.refetch()} />
  }

  const d = admin.data
  const totalTenants = d.activeTenants + d.suspendedTenants + d.archivedTenants

  return (
    <div className="space-y-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
        <StatCell label="Active tenants" value={d.activeTenants} sub={`${totalTenants} total`} delay={0} />
        <StatCell label="Suspended" value={d.suspendedTenants} sub={null} delay={80} />
        <StatCell label="Total users" value={d.totalUsers} sub={null} delay={160} />
        <StatCell label="Reminders sent" value={d.remindersSent} sub={`${d.remindersFailed} failed`} delay={240} />
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tenant breakdown</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="divide-y divide-border">
              {[
                { label: "Active", value: d.activeTenants, variant: "success" as const },
                { label: "Suspended", value: d.suspendedTenants, variant: "warning" as const },
                { label: "Archived", value: d.archivedTenants, variant: "muted" as const },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-6 py-3">
                  <Badge variant={row.variant}>{row.label}</Badge>
                  <span className="font-display text-lg font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className="sm:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Reminder delivery</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="divide-y divide-border">
              {[
                { label: "Sent", value: d.remindersSent, icon: Send, color: "text-success" },
                { label: "Failed", value: d.remindersFailed, icon: XCircle, color: "text-destructive" },
                { label: "Skipped", value: d.remindersSkipped, icon: SkipForward, color: "text-muted-foreground" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-6 py-3">
                  <div className="flex items-center gap-2">
                    <row.icon className={`h-3.5 w-3.5 ${row.color}`} />
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                  </div>
                  <span className="font-display text-base font-semibold">{row.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Recent audit logs</CardTitle>
            <CardDescription>Last 10 events across all tenants</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/audit-logs">
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {auditLogs.isLoading ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-6 py-3">
                  <Skeleton className="h-1.5 w-1.5 rounded-full shrink-0" />
                  <Skeleton className="h-3.5 flex-1" />
                  <Skeleton className="h-3 w-14 shrink-0" />
                </div>
              ))}
            </div>
          ) : auditLogs.data && auditLogs.data.content.length > 0 ? (
            <div className="divide-y divide-border">
              {auditLogs.data.content.map((a) => (
                <div key={a.id} className="flex items-center gap-3 px-6 py-2.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                  <p className="flex-1 truncate text-xs text-foreground">{describeEvent(a)}</p>
                  <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                    {timeAgo(a.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No audit logs yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Tenant dashboard                                                   */
/* ------------------------------------------------------------------ */

function TenantDashboard({ tenantId }: { tenantId: number }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const ready = !!accessToken

  const summary = useQuery({
    queryKey: ["dashboard-summary", tenantId],
    queryFn: () => dashboardApi.summary(tenantId),
    enabled: ready,
  })
  const revenue = useQuery({
    queryKey: ["dashboard-revenue", tenantId],
    queryFn: () => dashboardApi.revenue(tenantId),
    enabled: ready,
  })
  const reminderStats = useQuery({
    queryKey: ["dashboard-reminder-stats", tenantId],
    queryFn: () => dashboardApi.reminderStats(tenantId),
    enabled: ready,
  })
  const upcoming = useQuery({
    queryKey: ["dashboard-upcoming", tenantId],
    queryFn: () => dashboardApi.upcomingReminders(tenantId),
    enabled: ready,
  })
  const { isAtLeast } = useRole()
  const showActivity = isAtLeast("TENANT_ADMIN")
  const activity = useQuery({
    queryKey: ["dashboard-activity", tenantId],
    queryFn: () => dashboardApi.recentActivity(tenantId),
    enabled: ready && showActivity,
  })

  if (summary.isLoading) return <DashboardSkeleton />
  if (summary.isError || !summary.data) {
    return <ErrorState onRetry={() => summary.refetch()} />
  }

  const s = summary.data
  const failedCount = reminderStats.data?.failed ?? 0

  return (
    <div className="space-y-6">
      {/* Getting started — shown to new workspaces until all steps complete */}
      <GettingStarted tenantId={tenantId} summary={s} />

      {/* Failed reminders alert — only shown when action is needed */}
      {failedCount > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="flex-1 text-sm text-foreground">
            <span className="font-medium">{failedCount} reminder {failedCount === 1 ? "delivery" : "deliveries"} failed.</span>{" "}
            Check which plans were affected and retry.
          </p>
          <Button variant="outline" size="sm" asChild className="shrink-0">
            <Link href={`/${tenantId}/reminders?status=FAILED`}>Review</Link>
          </Button>
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
        <StatCell label="Customers" value={s.totalCustomers ?? 0} sub={null} delay={0} />
        <StatCell label="Products" value={s.totalProducts ?? 0} sub={null} delay={80} />
        <StatCell label="Active plans" value={s.activePlans ?? 0} sub={`${s.pausedPlans ?? 0} paused`} delay={160} />
        <StatCell label="Reminders sent" value={reminderStats.data?.sent ?? 0} sub={reminderStats.data ? `${reminderStats.data.failed} failed` : null} delay={240} />
      </div>

      {/* Revenue + Reminder stats row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue overview</CardTitle>
            <CardDescription>Active plan amounts by currency</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {revenue.isLoading ? (
              <div className="space-y-px px-6 pb-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : revenue.data?.totals && revenue.data.totals.length > 0 ? (
              <div className="divide-y divide-border">
                {revenue.data.totals.map((t) => (
                  <div key={t.currency} className="flex items-center justify-between px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                        {t.currency}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {t.planCount} active {t.planCount === 1 ? "plan" : "plans"}
                      </p>
                    </div>
                    <p className="font-display text-xl font-semibold tracking-tight">
                      {formatCurrency(t.totalAmount, t.currency)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-muted-foreground">No active plans yet.</p>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <Link href={`/${tenantId}/customers`}>Assign a product to a customer</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reminder stats</CardTitle>
            <CardDescription>
              {reminderStats.data
                ? `${formatDate(reminderStats.data.from)} – ${formatDate(reminderStats.data.to)}`
                : "Last 30 days"}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {reminderStats.isLoading ? (
              <div className="space-y-px px-6 pb-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : reminderStats.data ? (
              <div className="divide-y divide-border">
                {[
                  { label: "Sent", value: reminderStats.data.sent, icon: Send, color: "text-success" },
                  { label: "Failed", value: reminderStats.data.failed, icon: XCircle, color: "text-destructive" },
                  { label: "Skipped", value: reminderStats.data.skipped, icon: SkipForward, color: "text-muted-foreground" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-2">
                      <row.icon className={`h-3.5 w-3.5 ${row.color}`} />
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                    </div>
                    <span className="font-display text-base font-semibold">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming reminders</CardTitle>
            <CardDescription>Plans expiring at the next milestone</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {upcoming.isLoading ? (
              <div className="space-y-px px-6 pb-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : upcoming.data && upcoming.data.length > 0 ? (
              <div className="divide-y divide-border">
                {upcoming.data.map((u) => (
                  <div key={u.customerProductId} className="flex items-center justify-between px-6 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{u.customerName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.productName} · {formatCurrency(u.amount, u.currency)}
                      </p>
                    </div>
                    <Badge variant="info" className="shrink-0 ml-3">{formatDate(u.endsAt)}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No upcoming reminders.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent activity — TENANT_ADMIN+ only */}
        {showActivity && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>Last 10 audit log entries</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/${tenantId}/audit-logs`}>
                  View all
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {activity.isLoading ? (
                <div className="divide-y divide-border">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-6 py-2">
                      <Skeleton className="h-1.5 w-1.5 rounded-full shrink-0" />
                      <Skeleton className="h-3.5 flex-1" />
                      <Skeleton className="h-3 w-14 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : activity.data && activity.data.length > 0 ? (
                <div className="divide-y divide-border">
                  {activity.data.map((a) => {
                    const dotColor =
                      a.action === "CREATE" ? "bg-success" :
                      a.action === "DELETE" ? "bg-destructive" :
                      a.action === "STATUS_CHANGE" ? "bg-warning" :
                      a.action === "LOGIN_FAILED" ? "bg-destructive" :
                      "bg-muted-foreground/40"
                    return (
                      <div key={a.id} className="flex items-center gap-3 px-6 py-2">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor}`} />
                        <p className="flex-1 truncate text-xs text-foreground">
                          {describeEvent(a)}
                        </p>
                        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                          {timeAgo(a.createdAt)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No activity recorded yet.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page wrapper                                                       */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const { isSuperAdmin } = useRole()
  const tenantId = user?.tenantId ?? null

  const selectedTenantId = useTenantStore((s) => s.tenantId)
  const selectedTenantName = useTenantStore((s) => s.tenantName)

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return "Good morning"
    if (h < 18) return "Good afternoon"
    return "Good evening"
  })()
  const displayName = user?.fullName ?? user?.email?.split("@")[0] ?? "there"

  const pageDescription = isSuperAdmin && selectedTenantName
    ? `Viewing ${selectedTenantName}'s workspace.`
    : "Here's what's happening across your billing workspace today."

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={greeting}
        title={`Welcome back, ${displayName}.`}
        description={pageDescription}
        actions={
          isSuperAdmin && selectedTenantId ? (
            <Button asChild>
              <Link href={`/${selectedTenantId}/customers`}>
                <UserCircle2 className="h-4 w-4" />
                Go to workspace
              </Link>
            </Button>
          ) : null
        }
      />

      {isSuperAdmin ? (
        selectedTenantId ? (
          <TenantDashboard tenantId={selectedTenantId} />
        ) : (
          <AdminDashboard />
        )
      ) : tenantId ? (
        <TenantDashboard tenantId={tenantId} />
      ) : (
        <DashboardSkeleton />
      )}
    </div>
  )
}
