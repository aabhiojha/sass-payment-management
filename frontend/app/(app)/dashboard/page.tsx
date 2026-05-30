"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  ArrowUpRight,
  Bell,
  ScrollText,
  Send,
  SkipForward,
  UserCircle2,
  XCircle,
  AlertCircle,
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

  const d = admin.data
  if (!d) return null

  const totalTenants = d.activeTenants + d.suspendedTenants + d.archivedTenants
  const totalReminders = d.remindersSent + d.remindersFailed + d.remindersSkipped

  return (
    <div className="space-y-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
        {[
          { label: "Active tenants", value: d.activeTenants, sub: `${totalTenants} total` },
          { label: "Suspended", value: d.suspendedTenants, sub: null },
          { label: "Total users", value: d.totalUsers, sub: null },
          { label: "Reminders sent", value: d.remindersSent, sub: `${d.remindersFailed} failed` },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col gap-0.5 bg-card px-5 py-4">
            <span className="text-xs text-muted-foreground">{stat.label}</span>
            <span className="font-display text-2xl font-semibold tracking-tight">{stat.value}</span>
            {stat.sub && <span className="text-xs text-muted-foreground">{stat.sub}</span>}
          </div>
        ))}
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

  const isLoading = summary.isLoading
  if (isLoading) return <DashboardSkeleton />

  const s = summary.data

  return (
    <div className="space-y-6">
      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-4">
        {[
          { label: "Customers", value: s?.totalCustomers ?? 0, sub: null },
          { label: "Products", value: s?.totalProducts ?? 0, sub: null },
          { label: "Active plans", value: s?.activePlans ?? 0, sub: `${s?.pausedPlans ?? 0} paused` },
          { label: "Reminders sent", value: reminderStats.data?.sent ?? 0, sub: reminderStats.data ? `${reminderStats.data.failed} failed` : null },
        ].map((stat) => (
          <div key={stat.label} className="flex flex-col gap-0.5 bg-card px-5 py-4">
            <span className="text-xs text-muted-foreground">{stat.label}</span>
            <span className="font-display text-2xl font-semibold tracking-tight">{stat.value}</span>
            {stat.sub && <span className="text-xs text-muted-foreground">{stat.sub}</span>}
          </div>
        ))}
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
              <p className="px-6 py-8 text-center text-sm text-muted-foreground">
                No active plans yet.
              </p>
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
                  { label: "Failed", value: reminderStats.data.failed, icon: AlertCircle, color: "text-destructive" },
                  { label: "Skipped", value: reminderStats.data.skipped, icon: SkipForward, color: "text-muted-foreground" },
                  { label: "Total", value: reminderStats.data.total, icon: Bell, color: "text-foreground" },
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
            <CardDescription>Due within the next 7 days</CardDescription>
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

        {/* Recent activity — sits beside upcoming reminders on lg */}
        {showActivity && (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>Last 10 audit log entries</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/audit-logs`}>
                  View all
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
          <CardContent className="px-0 pb-0">
            {activity.isLoading ? (
              <div className="divide-y divide-border">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2">
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
                    <div key={a.id} className="flex items-center gap-3 px-4 py-2">
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
