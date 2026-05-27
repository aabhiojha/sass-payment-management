"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Archive,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Building2,
  ClipboardList,
  Globe,
  Mail,
  Mailbox,
  Package,
  PauseOctagon,
  UserCircle2,
  Users,
} from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Skeleton } from "@/components/ui/skeleton"
import { tenantsApi } from "@/lib/api/tenants"
import { dashboardApi } from "@/lib/api/dashboard"
import { friendlyError } from "@/lib/axios"
import { formatDate } from "@/lib/utils"

interface QuickLink {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  accent: string
  count?: number
  sub?: string
}

export default function TenantDetailPage({
  params,
}: {
  params: { tenantId: string }
}) {
  const tenantId = Number(params.tenantId)
  const qc = useQueryClient()
  const [confirmSuspend, setConfirmSuspend] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)

  const tenant = useQuery({
    queryKey: ["tenants", tenantId],
    queryFn: () => tenantsApi.get(tenantId),
  })

  const summary = useQuery({
    queryKey: ["dashboard-summary", tenantId],
    queryFn: () => dashboardApi.summary(tenantId),
  })

  const suspend = useMutation({
    mutationFn: () => tenantsApi.suspend(tenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants", tenantId] })
      qc.invalidateQueries({ queryKey: ["tenants"] })
      toast.success("Tenant suspended")
      setConfirmSuspend(false)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const archive = useMutation({
    mutationFn: () => tenantsApi.archive(tenantId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tenants", tenantId] })
      qc.invalidateQueries({ queryKey: ["tenants"] })
      toast.success("Tenant archived")
      setConfirmArchive(false)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const t = tenant.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link
            href="/tenants"
            className="inline-flex items-center gap-1 hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Tenants
          </Link>
        }
        title={t?.name ?? "Loading…"}
        description={t?.slug}
        actions={
          t && (
            <>
              {t.status === "ACTIVE" && (
                <Button variant="outline" onClick={() => setConfirmSuspend(true)}>
                  <PauseOctagon className="h-4 w-4" /> Suspend
                </Button>
              )}
              {t.status !== "ARCHIVED" && (
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setConfirmArchive(true)}
                >
                  <Archive className="h-4 w-4" /> Archive
                </Button>
              )}
            </>
          )
        }
      />

      {!t && <Skeleton className="h-60" />}

      {t && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[hsl(280_85%_60%)] text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <CardTitle>{t.name}</CardTitle>
                <div className="flex items-center gap-2 text-xs">
                  <StatusBadge status={t.status} />
                  <span className="text-muted-foreground">· {t.slug}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <Item label="Company email" icon={Mail}>
                  {t.companyEmail}
                </Item>
                <Item label="Timezone" icon={Globe}>
                  {t.timezone}
                </Item>
                <Item label="Created">{formatDate(t.createdAt)}</Item>
                <Item label="Updated">{formatDate(t.updatedAt)}</Item>
              </dl>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {([
              {
                href: `/${tenantId}/customers`,
                label: "Customers",
                icon: UserCircle2,
                count: summary.data?.totalCustomers,
                accent: "from-primary to-[hsl(280_85%_55%)]",
              },
              {
                href: `/${tenantId}/products`,
                label: "Products",
                icon: Package,
                count: summary.data?.totalProducts,
                accent: "from-[hsl(199_89%_48%)] to-[hsl(212_92%_45%)]",
              },
              {
                href: `/${tenantId}/plans`,
                label: "Plans",
                icon: ClipboardList,
                count:
                  summary.data != null
                    ? summary.data.activePlans +
                      summary.data.pausedPlans +
                      summary.data.cancelledPlans
                    : undefined,
                sub:
                  summary.data != null
                    ? `${summary.data.activePlans} active`
                    : undefined,
                accent: "from-[hsl(152_65%_38%)] to-[hsl(160_70%_42%)]",
              },
              {
                href: `/${tenantId}/reminders`,
                label: "Reminders",
                icon: Bell,
                accent: "from-[hsl(38_92%_50%)] to-[hsl(28_92%_55%)]",
              },
              {
                href: `/${tenantId}/users`,
                label: "Team",
                icon: Users,
                accent: "from-[hsl(340_65%_47%)] to-[hsl(350_70%_55%)]",
              },
              {
                href: `/${tenantId}/invitations`,
                label: "Invitations",
                icon: Mailbox,
                accent: "from-[hsl(270_55%_50%)] to-[hsl(280_60%_60%)]",
              },
            ] satisfies QuickLink[]).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card/50 px-4 py-3 transition-all hover:border-primary/30 hover:shadow-soft"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${link.accent} text-white`}
                >
                  <link.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{link.label}</p>
                  {link.sub && (
                    <p className="text-xs text-muted-foreground">
                      {link.sub}
                    </p>
                  )}
                </div>
                {link.count != null ? (
                  <span className="font-display text-lg font-semibold tabular-nums text-foreground">
                    {link.count}
                  </span>
                ) : (
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmSuspend}
        onOpenChange={setConfirmSuspend}
        title="Suspend this tenant?"
        description="Suspended tenants cannot sign in until reactivated."
        confirmText="Suspend"
        destructive
        loading={suspend.isPending}
        onConfirm={() => suspend.mutate()}
      />
      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Archive this tenant?"
        description="This is irreversible. The tenant's data will be retained but inaccessible."
        confirmText="Archive permanently"
        destructive
        loading={archive.isPending}
        onConfirm={() => archive.mutate()}
      />
    </div>
  )
}

function Item({
  label,
  icon: Icon,
  children,
}: {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </p>
      <p className="mt-1.5 text-sm">{children}</p>
    </div>
  )
}
