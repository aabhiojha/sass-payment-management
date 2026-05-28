"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { Sidebar } from "@/components/layout/Sidebar"
import { TopBar } from "@/components/layout/TopBar"
import { MobileNav } from "@/components/layout/MobileNav"
import { useAuthStore } from "@/store/authStore"
import { authApi } from "@/lib/api/auth"
import type { Role } from "@/types/api"

function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true)
      return
    }
    const unsub = useAuthStore.persist.onFinishHydration(() =>
      setHydrated(true)
    )
    return unsub
  }, [])
  return hydrated
}

// Rehydrate the store when another tab writes to localStorage (login/logout).
function useCrossTabSync() {
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "auth-user") {
        useAuthStore.persist.rehydrate()
      }
    }
    window.addEventListener("storage", handler)
    return () => window.removeEventListener("storage", handler)
  }, [])
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const hydrated = useAuthHydrated()
  useCrossTabSync()
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const setAuth = useAuthStore((s) => s.setAuth)

  const needsTenantHydration =
    hydrated && !!user && user.role !== "SUPER_ADMIN" && user.tenantId == null

  useQuery({
    queryKey: ["me", user?.userId],
    queryFn: async () => {
      const me = await authApi.me()
      const token = useAuthStore.getState().accessToken
      if (token && user) {
        setAuth(token, {
          userId: me.id,
          email: me.email,
          role: (me.role as Role) ?? user.role,
          tenantId: me.tenantId ?? null,
        })
      }
      return me
    },
    enabled: needsTenantHydration && !!accessToken,
    staleTime: 60_000,
    retry: 0,
  })

  useEffect(() => {
    if (!hydrated) return
    if (!user) {
      // Auth store has nothing — user is logged out or localStorage was cleared.
      // Clear any stale session_hint cookie so middleware doesn't bounce us
      // back here from /login.
      if (typeof document !== "undefined") {
        document.cookie = "session_hint=; max-age=0; path=/"
      }
      router.replace("/login")
    }
  }, [hydrated, user, router])

  if (!hydrated) {
    return <AuthBootstrap label="Loading workspace…" />
  }

  if (!user) {
    return <AuthBootstrap label="Redirecting…" />
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <TopBar />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function AuthBootstrap({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <p className="text-sm">{label}</p>
      </div>
    </div>
  )
}
