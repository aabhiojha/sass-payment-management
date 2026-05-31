"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Mailbox,
  UserCircle2,
  Package,
  ClipboardList,
  Clock,
  ScrollText,
  Settings,
  X,
} from "lucide-react"
import { Logo } from "./Logo"
import { useAuthStore } from "@/store/authStore"
import { useTenantStore } from "@/store/tenantStore"
import { useRole } from "@/hooks/useRole"
import { cn, initials } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  minRole?: "TENANT_USER" | "TENANT_ADMIN" | "SUPER_ADMIN"
  superOnly?: boolean
}

function buildNav(tenantId: number | null): {
  primary: NavItem[]
  workspace: NavItem[]
  admin: NavItem[]
} {
  const tenantBase = tenantId ? `/${tenantId}` : ""
  return {
    primary: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
    workspace: tenantId
      ? [
          {
            href: `${tenantBase}/customers`,
            label: "Customers",
            icon: UserCircle2,
          },
          { href: `${tenantBase}/products`, label: "Products", icon: Package },
          {
            href: `${tenantBase}/plans`,
            label: "Plans",
            icon: ClipboardList,
          },
          {
            href: `${tenantBase}/reminders`,
            label: "Reminders",
            icon: Clock,
          },
        ]
      : [],
    admin: [
      ...(tenantId
        ? [
            {
              href: `${tenantBase}/users`,
              label: "Team",
              icon: Users,
            },
            {
              href: `${tenantBase}/invitations`,
              label: "Invitations",
              icon: Mailbox,
            },
          ]
        : []),
      ...(tenantId
        ? [
            {
              href: `${tenantBase}/audit-logs`,
              label: "Audit log",
              icon: ScrollText,
              minRole: "TENANT_ADMIN" as const,
            },
          ]
        : []),
      {
        href: "/audit-logs",
        label: "Audit log",
        icon: ScrollText,
        superOnly: true,
      },
    ],
  }
}

function NavLink({
  item,
  active,
}: {
  item: NavItem
  active: boolean
}) {
  const { icon: Icon, href, label } = item
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-fg"
          : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-fg"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-primary" />
      )}
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-primary" : "text-sidebar-muted group-hover:text-sidebar-fg"
        )}
      />
      <span className="truncate">{label}</span>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const { isAtLeast, isSuperAdmin } = useRole()

  const storeTenantId = useTenantStore((s) => s.tenantId)
  const storeTenantName = useTenantStore((s) => s.tenantName)
  const clearTenant = useTenantStore((s) => s.set)

  // For superadmin: use the store-selected tenant for workspace nav.
  // For regular users: use their own tenantId from auth.
  const tenantId = isSuperAdmin ? storeTenantId : (user?.tenantId ?? null)
  const nav = buildNav(tenantId)

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href)

  const handleClearTenant = () => {
    clearTenant(null)
    router.push("/dashboard")
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-fg md:flex">
      <div className="px-5 pt-6 pb-4">
        <Logo />
      </div>

      <nav aria-label="Main navigation" className="flex-1 space-y-6 overflow-y-auto px-3 pb-6 scrollbar-thin">
        <div className="space-y-1">
          {nav.primary.map((i) => (
            <NavLink key={i.href} item={i} active={isActive(i.href)} />
          ))}
        </div>

        {/* Superadmin global admin section — superOnly items only (e.g. Audit log) */}
        {isSuperAdmin && (
          <div className="space-y-1">
            <p className="px-3 pb-2 text-[10px] font-semibold text-sidebar-muted">
              Administration
            </p>
            {nav.admin.filter((i) => i.superOnly).map((i) => (
              <NavLink key={i.href} item={i} active={isActive(i.href)} />
            ))}
          </div>
        )}

        {/* Superadmin: tenant workspace section when a tenant is selected */}
        {isSuperAdmin && tenantId && (
          <>
            <div className="mx-3 border-t border-sidebar-border" />
            <div className="space-y-1">
              <div className="flex items-center justify-between px-3 pb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarFallback className="text-[9px]">
                      {initials(storeTenantName ?? String(tenantId))}
                    </AvatarFallback>
                  </Avatar>
                  <p className="truncate text-[10px] font-semibold text-sidebar-muted">
                    {storeTenantName ?? `Tenant #${tenantId}`}
                  </p>
                </div>
                <button
                  onClick={handleClearTenant}
                  className="ml-1 shrink-0 rounded p-0.5 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-fg transition-colors"
                  aria-label="Stop viewing tenant"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {nav.workspace.map((i) => (
                <NavLink key={i.href} item={i} active={isActive(i.href)} />
              ))}
              {/* Team + Invitations also available for superadmin */}
              {[
                { href: `/${tenantId}/users`, label: "Team", icon: Users },
                { href: `/${tenantId}/invitations`, label: "Invitations", icon: Mailbox },
              ].map((i) => (
                <NavLink key={i.href} item={i} active={isActive(i.href)} />
              ))}
            </div>
          </>
        )}

        {/* Regular tenant user workspace + admin nav */}
        {!isSuperAdmin && (
          <>
            {nav.workspace.length > 0 && (
              <div className="space-y-1">
                <p className="px-3 pb-2 text-[10px] font-semibold text-sidebar-muted">
                  Workspace
                </p>
                {nav.workspace.map((i) => (
                  <NavLink key={i.href} item={i} active={isActive(i.href)} />
                ))}
              </div>
            )}

            {nav.admin.length > 0 && (
              <div className="space-y-1">
                <p className="px-3 pb-2 text-[10px] font-semibold text-sidebar-muted">
                  Administration
                </p>
                {nav.admin.map((i) => {
                  if (i.superOnly && !isSuperAdmin) return null
                  if (i.minRole && !isAtLeast(i.minRole)) return null
                  return (
                    <NavLink key={i.href} item={i} active={isActive(i.href)} />
                  )
                })}
              </div>
            )}
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <Link
          href="/me"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-fg",
            pathname === "/me" && "bg-sidebar-accent text-sidebar-accent-fg"
          )}
        >
          <Settings className="h-4 w-4" />
          <span>My profile</span>
        </Link>
      </div>
    </aside>
  )
}
