"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import { Mail, Plus, RotateCw, Ban, Mailbox } from "lucide-react"

import { PageHeader } from "@/components/shared/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Pagination } from "@/components/shared/Pagination"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { TableSkeleton } from "@/components/shared/TableSkeleton"
import { EmptyState } from "@/components/shared/EmptyState"
import { RoleBadge } from "@/components/shared/RoleBadge"

import { invitationsApi } from "@/lib/api/invitations"
import { formatDate } from "@/lib/utils"
import { friendlyError } from "@/lib/axios"
import { useRole } from "@/hooks/useRole"

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  role: z.enum(["TENANT_USER", "TENANT_ADMIN"]),
})
type Values = z.infer<typeof schema>

export default function InvitationsPage({
  params,
}: {
  params: { tenantId: string }
}) {
  const tenantId = Number(params.tenantId)
  const qc = useQueryClient()
  const [page, setPage] = useState(0)
  const [size] = useState(20)
  const { isSuperAdmin } = useRole()

  const list = useQuery({
    queryKey: ["invitations", tenantId, page, size],
    queryFn: () => invitationsApi.list(tenantId, page, size),
  })

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", role: "TENANT_USER" },
  })

  const invite = useMutation({
    mutationFn: (data: Values) =>
      data.role === "TENANT_ADMIN"
        ? invitationsApi.inviteAdmin(tenantId, data.email)
        : invitationsApi.inviteUser(tenantId, data.email),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations", tenantId] })
      toast.success("Invitation sent")
      form.reset({ email: "", role: "TENANT_USER" })
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const revoke = useMutation({
    mutationFn: (id: number) => invitationsApi.revoke(tenantId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations", tenantId] })
      toast.success("Invitation revoked")
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const resend = useMutation({
    mutationFn: (id: number) => invitationsApi.resend(tenantId, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations", tenantId] })
      toast.success("Invitation resent")
    },
    onError: (e) => toast.error(friendlyError(e)),
  })

  const rows = list.data?.content ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invitations"
        description="Invite teammates and track pending invites."
      />

      <Card>
        <CardHeader>
          <CardTitle>Invite a teammate</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit((v) => invite.mutate(v))}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9"
                  placeholder="teammate@company.com"
                  {...form.register("email")}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={form.watch("role")}
                onValueChange={(v) =>
                  form.setValue("role", v as Values["role"])
                }
              >
                <SelectTrigger id="role" className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TENANT_USER">Tenant User</SelectItem>
                  {isSuperAdmin && (
                    <SelectItem value="TENANT_ADMIN">Tenant Admin</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" loading={invite.isPending}>
              <Plus className="h-4 w-4" /> Send invite
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        {list.isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Mailbox}
            title="No invitations yet"
            description="When you invite teammates, they'll show up here until accepted."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.email}</TableCell>
                    <TableCell>
                      <RoleBadge role={i.role} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={i.status} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(i.expiresAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      {i.status === "PENDING" && (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => resend.mutate(i.id)}
                            loading={resend.isPending}
                          >
                            <RotateCw className="h-3.5 w-3.5" /> Resend
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => revoke.mutate(i.id)}
                          >
                            <Ban className="h-3.5 w-3.5" /> Revoke
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="border-t border-border">
              <Pagination
                page={page}
                totalPages={list.data?.totalPages ?? 0}
                totalElements={list.data?.totalElements}
                pageSize={size}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
