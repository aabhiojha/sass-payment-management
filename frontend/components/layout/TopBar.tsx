"use client"

import { useAuth } from "@/hooks/useAuth"
import { useRole } from "@/hooks/useRole"
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
import { Bell, ChevronDown, LogOut, User as UserIcon } from "lucide-react"
import { initials } from "@/lib/utils"
import { RoleBadge } from "@/components/shared/RoleBadge"
import Link from "next/link"

export function TopBar() {
  const { user, logout } = useAuth()
  const { role } = useRole()
  const name = user?.email?.split("@")[0] ?? "User"

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </Button>

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
          <DropdownMenuContent align="end" className="min-w-[14rem]">
            <DropdownMenuLabel className="flex items-center gap-2 normal-case tracking-normal">
              <span className="text-sm text-foreground">{user?.email}</span>
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
