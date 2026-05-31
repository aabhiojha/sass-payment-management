"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Ban,
  MoreHorizontal,
  ShieldCheck,
  Trash2,
  Users,
  UserCog,
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { RoleBadge } from "@/components/shared/RoleBadge"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { usersApi } from "@/lib/api/users"
import { friendlyError } from "@/lib/axios"
import { initials, formatDate } from "@/lib/utils"
import { useRole } from "@/hooks/useRole"
import { useDebounce } from "@/hooks/useDebounce"
import { SearchInput } from "@/components/shared/SearchInput"
import type { UserResponse } from "@/types/api"

export default function UsersPage({
  params,
}: {
  params: { tenantId: string }
}) {
  const tenantId = Number(params.tenantId)
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const [q, setQ] = useState("")
  const debouncedQ = useDebounce(q)
  const [confirmTarget, setConfirmTarget] = useState<UserResponse | null>(null)
  const { isAtLeast } = useRole()

  const { data, isLoading } = useQuery({
    queryKey: ["users", tenantId, page, size],
    queryFn: () => usersApi.list(tenantId, page, size),
  })

  const updateRole = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: number
      role: "TENANT_ADMIN" | "TENANT_USER"
    }) => usersApi.updateRole(tenantId, userId, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", tenantId] })
      toast.success("Role updated")
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const disable = useMutation({
    mutationFn: (userId: number) => usersApi.disable(tenantId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", tenantId] })
      toast.success("User disabled")
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const del = useMutation({
    mutationFn: (userId: number) => usersApi.delete(tenantId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", tenantId] })
      toast.success("User deleted")
      setConfirmTarget(null)
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const rows = (data?.content ?? []).filter((u) => {
    if (u.status !== "ACTIVE") return false
    if (!debouncedQ) return true
    return u.email.toLowerCase().includes(debouncedQ.toLowerCase())
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Members who can access this tenant. Manage roles and access."
      />

      <Card>
        <div className="border-b border-border p-4">
          <SearchInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email…"
          />
        </div>
        {isLoading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No team members yet"
            description="Invite teammates to give them access to this workspace."
            action={
              isAtLeast("TENANT_ADMIN") ? (
                <Button asChild>
                  <Link href={`/${tenantId}/invitations`}>Send an invitation</Link>
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
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    {isAtLeast("TENANT_ADMIN") && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="text-[10px]">{initials(u.email)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium truncate">{u.email}</span>
                        </div>
                      </TableCell>
                      <TableCell><RoleBadge role={u.role} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                      {isAtLeast("TENANT_ADMIN") && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {u.role !== "TENANT_ADMIN" && (
                                <DropdownMenuItem onClick={() => updateRole.mutate({ userId: u.id, role: "TENANT_ADMIN" })}>
                                  <ShieldCheck className="h-4 w-4" /> Make admin
                                </DropdownMenuItem>
                              )}
                              {u.role !== "TENANT_USER" && (
                                <DropdownMenuItem onClick={() => updateRole.mutate({ userId: u.id, role: "TENANT_USER" })}>
                                  <UserCog className="h-4 w-4" /> Make member
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => disable.mutate(u.id)}>
                                <Ban className="h-4 w-4" /> Disable
                              </DropdownMenuItem>
                              <DropdownMenuItem destructive onClick={() => setConfirmTarget(u)}>
                                <Trash2 className="h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile card list */}
            <div className="divide-y divide-border sm:hidden">
              {rows.map((u) => (
                <div key={u.id} className="flex items-center gap-3 p-4">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-[10px]">{initials(u.email)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.email}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <RoleBadge role={u.role} />
                    </div>
                  </div>
                  {isAtLeast("TENANT_ADMIN") && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {u.role !== "TENANT_ADMIN" && (
                          <DropdownMenuItem onClick={() => updateRole.mutate({ userId: u.id, role: "TENANT_ADMIN" })}>
                            <ShieldCheck className="h-4 w-4" /> Make admin
                          </DropdownMenuItem>
                        )}
                        {u.role !== "TENANT_USER" && (
                          <DropdownMenuItem onClick={() => updateRole.mutate({ userId: u.id, role: "TENANT_USER" })}>
                            <UserCog className="h-4 w-4" /> Make member
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => disable.mutate(u.id)}>
                          <Ban className="h-4 w-4" /> Disable
                        </DropdownMenuItem>
                        <DropdownMenuItem destructive onClick={() => setConfirmTarget(u)}>
                          <Trash2 className="h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              ))}
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

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(open) => !open && setConfirmTarget(null)}
        title="Delete this user?"
        description={`This removes ${confirmTarget?.email} from your tenant permanently.`}
        confirmText="Delete user"
        destructive
        loading={del.isPending}
        onConfirm={() => confirmTarget && del.mutate(confirmTarget.id)}
      />
    </div>
  )
}
