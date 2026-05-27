"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Building2, Plus, Search } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { tenantsApi } from "@/lib/api/tenants"
import { cn, initials } from "@/lib/utils"

export function TenantsSidebar() {
  const pathname = usePathname()
  const [q, setQ] = useState("")

  const { data, isLoading } = useQuery({
    queryKey: ["tenants", 0, 100],
    queryFn: () => tenantsApi.list(0, 100),
  })

  const tenants = (data?.content ?? []).filter((t) =>
    q ? t.name.toLowerCase().includes(q.toLowerCase()) : true
  )

  const activeTenantId = (() => {
    const m = pathname.match(/^\/tenants\/(\d+)/)
    return m ? Number(m[1]) : null
  })()

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card/20 lg:flex">
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <h2 className="text-sm font-semibold">Tenants</h2>
        <Link
          href="/tenants/new"
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-secondary",
            pathname === "/tenants/new" && "bg-accent text-accent-foreground"
          )}
        >
          <Plus className="h-4 w-4" />
        </Link>
      </div>

      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-3 text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {isLoading && (
          <div className="space-y-2 px-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        )}

        {!isLoading && tenants.length === 0 && (
          <div className="px-3 py-8 text-center">
            <Building2 className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              {q ? "No tenants match your search." : "No tenants yet."}
            </p>
          </div>
        )}

        <div className="space-y-0.5">
          {tenants.map((t) => {
            const isActive = activeTenantId === t.id
            return (
              <Link
                key={t.id}
                href={`/tenants/${t.id}`}
                className={cn(
                  "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-foreground hover:bg-secondary"
                )}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback
                    className={cn(
                      "text-[10px]",
                      isActive
                        ? "bg-primary/20 text-accent-foreground"
                        : "bg-muted"
                    )}
                  >
                    {initials(t.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {t.slug}
                  </p>
                </div>
                <StatusBadge
                  status={t.status}
                  className="scale-90 opacity-80"
                />
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-border px-3 py-2.5">
        <p className="text-center text-[10px] text-muted-foreground">
          {data?.totalElements ?? 0} tenants
        </p>
      </div>
    </aside>
  )
}
