"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import axios from "axios"
import { toast } from "sonner"
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MailWarning,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  UserRound,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/layout/Logo"
import { authApi, type InviteTokenValidation } from "@/lib/api/auth"
import { friendlyError } from "@/lib/axios"
import type { ApiError } from "@/types/api"

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords must match",
    path: ["confirm"],
  })
type Values = z.infer<typeof schema>

type ValidationState =
  | { status: "checking" }
  | { status: "invalid"; code: string }
  | { status: "no-token" }
  | { status: "valid"; data: InviteTokenValidation }

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteForm />
    </Suspense>
  )
}

function AcceptInviteForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token") ?? ""

  const [validation, setValidation] = useState<ValidationState>(
    token ? { status: "checking" } : { status: "no-token" }
  )
  const [submitting, setSubmitting] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  })

  useEffect(() => {
    if (!token) return
    authApi
      .validateInviteToken(token)
      .then((data) => setValidation({ status: "valid", data }))
      .catch((err) => {
        const code = axios.isAxiosError(err)
          ? ((err.response?.data as ApiError | undefined)?.error?.code ?? "INVALID_TOKEN")
          : "INVALID_TOKEN"
        setValidation({ status: "invalid", code })
      })
  }, [token])

  async function onSubmit(values: Values) {
    setSubmitting(true)
    try {
      await authApi.acceptInvite(token, values.password)
      toast.success("Account activated. Please sign in to continue.")
      router.replace("/login")
    } catch (err) {
      const message = resolveInviteError(err)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── states ────────────────────────────────────────────────────────────────

  if (validation.status === "checking") {
    return (
      <StatusCard>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Validating invitation…</p>
      </StatusCard>
    )
  }

  if (validation.status === "no-token") {
    return (
      <ErrorCard
        icon={<MailWarning className="h-6 w-6" />}
        title="Invitation link is incomplete"
        message="We couldn't find an invitation token in this URL. Open the link from your invitation email exactly as it was sent."
      />
    )
  }

  if (validation.status === "invalid") {
    const { icon, title, message } = inviteErrorContent(validation.code)
    return <ErrorCard icon={icon} title={title} message={message} />
  }

  // status === "valid"
  const { data } = validation
  const roleLabel = data.role === "TENANT_ADMIN" ? "Administrator" : "Member"

  return (
    <div className="mx-auto w-full max-w-md space-y-8 rounded-3xl border border-border bg-card p-8 shadow-pop sm:p-10 animate-fade-in">
      <Logo />

      {/* Invitation context */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-accent px-3 py-1 text-xs text-accent-foreground">
          <ShieldCheck className="h-3 w-3" />
          You've been invited
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Set up your password
        </h1>

        {/* Who / where */}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="font-medium text-foreground">{data.tenantName}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <UserRound className="h-4 w-4 shrink-0" />
            <span>{data.email}</span>
            <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {roleLabel}
            </span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Choose a strong password to activate your account.
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="pl-9 pr-10"
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPwd((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showPwd ? "Hide password" : "Show password"}
            >
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm password</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="confirm"
              type={showPwd ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Re-enter password"
              className="pl-9"
              {...form.register("confirm")}
            />
          </div>
          {form.formState.errors.confirm && (
            <p className="text-xs text-destructive">
              {form.formState.errors.confirm.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          Activate account
          <ArrowRight className="h-4 w-4" />
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Already activated?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  )
}

// ── helpers ──────────────────────────────────────────────────────────────────

function StatusCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md space-y-4 rounded-3xl border border-border bg-card p-8 text-center shadow-pop sm:p-10 animate-fade-in">
      <Logo className="mx-auto justify-center" />
      <div className="flex flex-col items-center gap-3">{children}</div>
    </div>
  )
}

function ErrorCard({
  icon,
  title,
  message,
}: {
  icon: React.ReactNode
  title: string
  message: string
}) {
  return (
    <div className="mx-auto w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-8 text-center shadow-pop sm:p-10 animate-fade-in">
      <Logo className="mx-auto justify-center" />
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        {icon}
      </div>
      <div className="space-y-1.5">
        <h1 className="font-display text-xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <Button asChild variant="outline" className="w-full">
        <Link href="/login">Back to sign in</Link>
      </Button>
    </div>
  )
}

function inviteErrorContent(code: string): {
  icon: React.ReactNode
  title: string
  message: string
} {
  switch (code) {
    case "INVITATION_ACCEPTED":
      return {
        icon: <CheckCircle2 className="h-6 w-6" />,
        title: "Invitation already used",
        message:
          "This invitation link has already been accepted. If you have an account, sign in below.",
      }
    case "INVITATION_REVOKED":
      return {
        icon: <ShieldOff className="h-6 w-6" />,
        title: "Invitation revoked",
        message:
          "This invitation has been revoked by your administrator. Ask them to send a new one.",
      }
    case "INVITATION_EXPIRED":
      return {
        icon: <ShieldAlert className="h-6 w-6" />,
        title: "Invitation expired",
        message:
          "This invitation link has expired. Ask your administrator to resend the invitation.",
      }
    default:
      return {
        icon: <MailWarning className="h-6 w-6" />,
        title: "Invalid invitation link",
        message:
          "We couldn't find this invitation. Open the link from your invitation email exactly as it was sent.",
      }
  }
}

function resolveInviteError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status
    const code = (err.response?.data as ApiError | undefined)?.error?.code
    if (code === "INVITATION_ACCEPTED") return "This invitation has already been used. Sign in instead."
    if (code === "INVITATION_EXPIRED") return "This invitation has expired. Ask your admin to resend it."
    if (code === "INVITATION_REVOKED") return "This invitation was revoked. Ask your admin to send a new one."
    if (status === 400 || status === 404) return "This invitation link is no longer valid."
    if (status === 409) return "An account already exists for this email. Try signing in instead."
  }
  return friendlyError(err)
}
