"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Check, Pencil, X } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { RoleBadge } from "@/components/shared/RoleBadge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { authApi } from "@/lib/api/auth"
import { useAuth } from "@/hooks/useAuth"
import { useAuthStore } from "@/store/authStore"
import { friendlyError } from "@/lib/axios"
import { formatDate, initials } from "@/lib/utils"

export default function MePage() {
  const { logout } = useAuth()
  const qc = useQueryClient()
  const setAuth = useAuthStore((s) => s.setAuth)
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)

  const me = useQuery({ queryKey: ["me"], queryFn: authApi.me })

  const [editing, setEditing] = useState(false)
  const [nameInput, setNameInput] = useState("")

  function startEdit() {
    setNameInput(me.data?.fullName ?? "")
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setNameInput("")
  }

  const save = useMutation({
    mutationFn: () => authApi.updateProfile(nameInput.trim()),
    onSuccess: (updated) => {
      qc.setQueryData(["me"], updated)
      if (user && accessToken) {
        setAuth(accessToken, { ...user, fullName: updated.fullName })
      }
      setEditing(false)
      toast.success("Name updated")
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="My profile"
        description="Your account information and role within this workspace."
        actions={
          <Button variant="outline" onClick={() => logout()}>
            Log out
          </Button>
        }
      />

      {me.isLoading && <Skeleton className="h-52 max-w-xl rounded-xl" />}

      {me.data && (
        <Card className="max-w-xl">
          <CardHeader className="flex-row items-center gap-4 pb-4">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarFallback className="text-sm font-medium">
                {initials(me.data.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold tracking-tight truncate">
                {me.data.fullName ?? me.data.email}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <RoleBadge role={me.data.role as any} />
                <StatusBadge status={me.data.status} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <dl className="divide-y divide-border">
              <div className="flex items-center justify-between px-6 py-3">
                <dt className="text-xs text-muted-foreground w-24 shrink-0">Full name</dt>
                {editing ? (
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <Input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") save.mutate()
                        if (e.key === "Escape") cancelEdit()
                      }}
                      placeholder="Your full name"
                      className="h-7 text-sm max-w-[200px]"
                      autoFocus
                      maxLength={100}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-success hover:text-success"
                      onClick={() => save.mutate()}
                      disabled={save.isPending || !nameInput.trim()}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0"
                      onClick={cancelEdit}
                      disabled={save.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <dd className="text-sm">
                      {me.data.fullName ?? <span className="text-muted-foreground/50">Not set</span>}
                    </dd>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground" onClick={startEdit}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-6 py-3">
                <dt className="text-xs text-muted-foreground w-24 shrink-0">Email</dt>
                <dd className="text-sm break-all text-right">{me.data.email}</dd>
              </div>

              <div className="flex items-center justify-between px-6 py-3">
                <dt className="text-xs text-muted-foreground w-24 shrink-0">Role</dt>
                <dd><RoleBadge role={me.data.role as any} /></dd>
              </div>

              <div className="flex items-center justify-between px-6 py-3">
                <dt className="text-xs text-muted-foreground w-24 shrink-0">Joined</dt>
                <dd className="text-sm text-muted-foreground">{formatDate(me.data.createdAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
