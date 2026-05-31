"use client"

import { useAuth } from "@/hooks/useAuth"
import { useRole } from "@/hooks/useRole"
import { useTenantStore } from "@/store/tenantStore"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { Building2, ChevronDown, LogOut, Search, User as UserIcon, X } from "lucide-react"
import { SearchInput } from "@/components/shared/SearchInput"
import { initials } from "@/lib/utils"
import { RoleBadge } from "@/components/shared/RoleBadge"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { useRouter, usePathname } from "next/navigation"
import { tenantsApi } from "@/lib/api/tenants"
import type { TenantResponse } from "@/types/api"

function TenantPicker() {
  const tenantId = useTenantStore((s) => s.tenantId)
  const tenantName = useTenantStore((s) => s.tenantName)
  const setTenant = useTenantStore((s) => s.set)
  const router = useRouter()
  const pathname = usePathname()

  const handleSelect = (t: TenantResponse) => {
    setTenant(t.id, t.name)
    // If on a tenant-scoped page, navigate to same section for new tenant
    const sectionMatch = pathname.match(/^\/\d+\/([^/]+)/)
    if (sectionMatch) {
      router.push(`/${t.id}/${sectionMatch[1]}`)
    }
  }

  const handleClear = () => {
    setTenant(null)
    // Always go back to global dashboard when clearing
    router.push("/dashboard")
  }

  const { data, isLoading } = useQuery({
    queryKey: ["tenants-picker"],
    queryFn: () => tenantsApi.list(0, 100),
    staleTime: 60_000,
  })

  const tenants: TenantResponse[] = data?.content ?? []
  const selected = tenants.find((t) => t.id === tenantId)
  const displayName = selected?.name ?? tenantName

  return (
    <div className="flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex h-9 min-w-[200px] max-w-[260px] items-center justify-between gap-2 px-3"
            disabled={isLoading}
          >
            <div className="flex items-center gap-2 min-w-0">
              {displayName ? (
                <>
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarFallback className="text-[9px]">
                      {initials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-sm font-medium">{displayName}</span>
                </>
              ) : (
                <>
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {isLoading ? "Loading…" : "Select tenant"}
                  </span>
                </>
              )}
            </div>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px] max-h-[360px] overflow-y-auto">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {tenants.length} tenant{tenants.length !== 1 ? "s" : ""}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {tenants.map((t) => (
            <DropdownMenuItem
              key={t.id}
              onSelect={() => handleSelect(t)}
              className="flex items-center gap-3 py-2"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs">{initials(t.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <p className="truncate text-xs text-muted-foreground">{t.slug}</p>
              </div>
              <StatusBadge status={t.status} />
            </DropdownMenuItem>
          ))}
          {tenants.length === 0 && !isLoading && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No tenants found.
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {tenantId && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleClear}
          aria-label="Clear tenant selection"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}

export function TopBar() {
  const { user, logout } = useAuth()
  const { role, isSuperAdmin } = useRole()
  const name = user?.email?.split("@")[0] ?? "User"

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      {isSuperAdmin ? (
        <div className="hidden flex-1 md:block">
          <TenantPicker />
        </div>
      ) : (
        <div className="hidden flex-1 md:block">
          <SearchInput placeholder="Search customers, products, plans…" />
        </div>
      )}


      <div className="ml-auto flex items-center gap-2">
        {!isSuperAdmin && (
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Search">
            <Search className="h-4 w-4" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-full border border-border bg-card pl-1 pr-3 py-1 text-sm shadow-sm transition-colors hover:bg-secondary/60">
              <Avatar className="h-7 w-7">
                <AvatarFallback>{initials(name)}</AvatarFallback>
              </Avatar>
              <div className="hidden flex-col leading-tight text-left sm:flex">
                <span className="text-xs font-medium text-foreground">
                  {user?.email ?? "—"}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {role}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={4} collisionPadding={12} className="w-56">
            <DropdownMenuLabel className="normal-case tracking-normal">
              <span className="block truncate text-sm text-foreground">{user?.email}</span>
            </DropdownMenuLabel>
            <div className="px-3 pb-2">
              <RoleBadge role={role} />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/me">
                <UserIcon className="h-4 w-4" /> My profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive onClick={() => logout()}>
              <LogOut className="h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
