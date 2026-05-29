"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  Users,
  Mailbox,
  UserCircle2,
  Package,
  ClipboardList,
  Bell,
  ScrollText,
  Settings,
} from "lucide-react"
import { Logo } from "./Logo"
import { useAuthStore } from "@/store/authStore"
import { useRole } from "@/hooks/useRole"
import { cn } from "@/lib/utils"

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
  const t = tenantId ?? 0
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
            icon: Bell,
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
        href: "/tenants",
        label: "Tenants",
        icon: Building2,
        superOnly: true,
      },
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
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-accent text-accent-foreground shadow-sm"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-accent-foreground" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      <span className="truncate">{label}</span>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const user = useAuthStore((s) => s.user)
  const { isAtLeast, isSuperAdmin } = useRole()
  const tenantId = user?.tenantId ?? null

  const nav = buildNav(tenantId)

  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href)

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur md:flex">
      <div className="px-5 pt-6 pb-4">
        <Logo />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6 scrollbar-thin">
        <div className="space-y-1">
          {nav.primary.map((i) => (
            <NavLink key={i.href} item={i} active={isActive(i.href)} />
          ))}
        </div>

        {nav.workspace.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
              Workspace
            </p>
            {nav.workspace.map((i) => (
              <NavLink key={i.href} item={i} active={isActive(i.href)} />
            ))}
          </div>
        )}

        {nav.admin.length > 0 && (
          <div className="space-y-1">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
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
      </nav>

      <div className="border-t border-border p-3">
        <Link
          href="/me"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary",
            pathname === "/me" && "bg-accent text-accent-foreground"
          )}
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
          <span>My profile</span>
        </Link>
      </div>
    </aside>
  )
}
