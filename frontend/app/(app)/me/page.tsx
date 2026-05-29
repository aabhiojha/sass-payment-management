"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Mail, Calendar, ShieldCheck, Pencil, Check, X, User } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      // Sync fullName into the auth store so the dashboard greeting updates immediately.
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

      {me.isLoading && <Skeleton className="h-60" />}

      {me.data && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="text-base">
                  {initials(me.data.email)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <CardTitle>{me.data.fullName ?? me.data.email}</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <RoleBadge role={me.data.role as any} />
                  <StatusBadge status={me.data.status} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                {/* Editable full name */}
                <div className="col-span-full rounded-xl border border-border bg-card/50 p-4">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> Full name
                  </p>
                  {editing ? (
                    <div className="mt-2 flex items-center gap-2">
                      <Input
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") save.mutate()
                          if (e.key === "Escape") cancelEdit()
                        }}
                        placeholder="Your full name"
                        className="h-8 text-sm"
                        autoFocus
                        maxLength={100}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 text-success hover:text-success"
                        onClick={() => save.mutate()}
                        disabled={save.isPending || !nameInput.trim()}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0"
                        onClick={cancelEdit}
                        disabled={save.isPending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex items-center justify-between">
                      <p className="text-sm">
                        {me.data.fullName ?? (
                          <span className="text-muted-foreground">Not set</span>
                        )}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={startEdit}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>

                <Item label="Email" icon={Mail}>
                  {me.data.email}
                </Item>
                <Item label="Role" icon={ShieldCheck}>
                  {me.data.role}
                </Item>
                <Item label="Joined" icon={Calendar}>
                  {formatDate(me.data.createdAt)}
                </Item>
                <Item label="Last updated" icon={Calendar}>
                  {formatDate(me.data.updatedAt)}
                </Item>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Need to change your password or remove access? Contact your
                workspace admin.
              </p>
              <p>
                Sessions are protected by short-lived tokens that auto-refresh
                while you're active.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
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
