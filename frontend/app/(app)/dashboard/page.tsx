"use client"

import { useQuery } from "@tanstack/react-query"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Building2,
  Calendar,
  ClipboardList,
  DollarSign,
  Package,
  PauseCircle,
  ScrollText,
  Send,
  SkipForward,
  UserCircle2,
  Users,
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
  titleCase,
} from "@/lib/utils"

import { useAuthStore } from "@/store/authStore"
import { useTenantStore } from "@/store/tenantStore"
import { useRole } from "@/hooks/useRole"
import { dashboardApi } from "@/lib/api/dashboard"

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
}: {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  accent: string
  sub?: string
}) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl ${accent}`}
      />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wider">
          {label}
        </CardDescription>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent} text-white`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl font-semibold tracking-tight">
          {value}
        </p>
        {sub && (
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        )}
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
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

  if (admin.isLoading) return <DashboardSkeleton />

  const d = admin.data
  if (!d) return null

  const totalTenants = d.activeTenants + d.suspendedTenants + d.archivedTenants
  const totalReminders = d.remindersSent + d.remindersFailed + d.remindersSkipped

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active tenants"
          value={d.activeTenants}
          icon={Building2}
          accent="bg-gradient-to-br from-primary to-[hsl(280_85%_55%)]"
          sub={`${totalTenants} total`}
        />
        <StatCard
          label="Suspended tenants"
          value={d.suspendedTenants}
          icon={PauseCircle}
          accent="bg-gradient-to-br from-[hsl(38_92%_50%)] to-[hsl(28_92%_55%)]"
        />
        <StatCard
          label="Total users"
          value={d.totalUsers}
          icon={Users}
          accent="bg-gradient-to-br from-[hsl(199_89%_48%)] to-[hsl(212_92%_45%)]"
        />
        <StatCard
          label="Reminders sent"
          value={d.remindersSent}
          icon={Send}
          accent="bg-gradient-to-br from-[hsl(152_65%_38%)] to-[hsl(160_70%_42%)]"
          sub={`${totalReminders} total · ${d.remindersFailed} failed`}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">
              Tenant breakdown
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Active", value: d.activeTenants, variant: "success" as const },
              { label: "Suspended", value: d.suspendedTenants, variant: "warning" as const },
              { label: "Archived", value: d.archivedTenants, variant: "muted" as const },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <Badge variant={row.variant}>{row.label}</Badge>
                <span className="font-display text-lg font-semibold">
                  {row.value}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="sm:col-span-2">
          <CardHeader className="pb-3">
            <CardDescription className="text-xs font-medium uppercase tracking-wider">
              Reminder delivery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Sent", value: d.remindersSent, icon: Send, color: "text-success" },
                { label: "Failed", value: d.remindersFailed, icon: XCircle, color: "text-destructive" },
                { label: "Skipped", value: d.remindersSkipped, icon: SkipForward, color: "text-muted-foreground" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <s.icon className={`mx-auto mb-2 h-5 w-5 ${s.color}`} />
                  <p className="font-display text-2xl font-semibold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
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
  const overdue = useQuery({
    queryKey: ["dashboard-overdue", tenantId],
    queryFn: () => dashboardApi.overduePlans(tenantId),
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
    <>
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Customers"
          value={s?.totalCustomers ?? 0}
          icon={UserCircle2}
          accent="bg-gradient-to-br from-primary to-[hsl(280_85%_55%)]"
        />
        <StatCard
          label="Products"
          value={s?.totalProducts ?? 0}
          icon={Package}
          accent="bg-gradient-to-br from-[hsl(199_89%_48%)] to-[hsl(212_92%_45%)]"
        />
        <StatCard
          label="Active plans"
          value={s?.activePlans ?? 0}
          icon={ClipboardList}
          accent="bg-gradient-to-br from-[hsl(152_65%_38%)] to-[hsl(160_70%_42%)]"
          sub={`${s?.pausedPlans ?? 0} paused · ${s?.cancelledPlans ?? 0} cancelled`}
        />
        <StatCard
          label="Reminders sent"
          value={reminderStats.data?.sent ?? 0}
          icon={Bell}
          accent="bg-gradient-to-br from-[hsl(38_92%_50%)] to-[hsl(28_92%_55%)]"
          sub={
            reminderStats.data
              ? `${reminderStats.data.failed} failed · last 30 days`
              : undefined
          }
        />
      </div>

      {/* Revenue + Reminder stats row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Revenue overview</CardTitle>
              <CardDescription>
                Active plan amounts by currency
              </CardDescription>
            </div>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {revenue.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : revenue.data?.totals && revenue.data.totals.length > 0 ? (
              <div className="space-y-3">
                {revenue.data.totals.map((t) => (
                  <div
                    key={t.currency}
                    className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                        {t.currency}
                      </div>
                      <div>
                        <p className="font-display text-xl font-semibold tracking-tight">
                          {formatCurrency(t.totalAmount, t.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.planCount} active {t.planCount === 1 ? "plan" : "plans"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
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
          <CardContent>
            {reminderStats.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : reminderStats.data ? (
              <div className="space-y-4">
                {[
                  { label: "Sent", value: reminderStats.data.sent, icon: Send, color: "text-success", bg: "bg-success/10" },
                  { label: "Failed", value: reminderStats.data.failed, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
                  { label: "Skipped", value: reminderStats.data.skipped, icon: SkipForward, color: "text-muted-foreground", bg: "bg-muted" },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${row.bg}`}>
                        <row.icon className={`h-4 w-4 ${row.color}`} />
                      </div>
                      <span className="text-sm font-medium">{row.label}</span>
                    </div>
                    <span className="font-display text-lg font-semibold">
                      {row.value}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    Total
                  </span>
                  <span className="font-display text-lg font-semibold">
                    {reminderStats.data.total}
                  </span>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming + Overdue row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming reminders</CardTitle>
              <CardDescription>Due within the next 7 days</CardDescription>
            </div>
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {upcoming.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : upcoming.data && upcoming.data.length > 0 ? (
              <div className="space-y-2">
                {upcoming.data.map((u) => (
                  <div
                    key={u.customerProductId}
                    className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {u.customerName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.productName} · {formatCurrency(u.amount, u.currency)}
                      </p>
                    </div>
                    <Badge variant="info">{formatDate(u.endsAt)}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No upcoming reminders.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Overdue plans</CardTitle>
              <CardDescription>Active plans past due date</CardDescription>
            </div>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            {overdue.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : overdue.data && overdue.data.length > 0 ? (
              <div className="space-y-2">
                {overdue.data.map((o) => (
                  <div
                    key={o.customerProductId}
                    className="flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {o.customerName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {o.productName} · {formatCurrency(o.amount, o.currency)}
                      </p>
                    </div>
                    <Badge variant="danger">{formatDate(o.endsAt)}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No overdue plans.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
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
          <CardContent>
            {activity.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : activity.data && activity.data.length > 0 ? (
              <div className="space-y-2">
                {activity.data.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-xl border border-border bg-card/50 px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary">
                        <ScrollText className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {a.actorEmail}{" "}
                          <span className="font-normal text-muted-foreground">
                            {a.action.toLowerCase().replace("_", " ")}
                          </span>{" "}
                          {titleCase(a.resourceType)}
                          {a.resourceId ? ` #${a.resourceId}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {timeAgo(a.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No activity recorded yet.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </>
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
          isSuperAdmin ? (
            selectedTenantId ? (
              <Button asChild>
                <Link href={`/${selectedTenantId}/customers`}>
                  <UserCircle2 className="h-4 w-4" />
                  Go to workspace
                </Link>
              </Button>
            ) : null
          ) : tenantId ? (
            <Button asChild>
              <Link href={`/${tenantId}/customers`}>
                <UserCircle2 className="h-4 w-4" />
                New customer
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
