"use client"

import { useAuthStore } from "@/store/authStore"
import { authApi } from "@/lib/api/auth"
import { useRouter } from "next/navigation"
import type { AuthResponse } from "@/types/api"

function setSessionHint() {
  document.cookie = "session_hint=1; path=/; max-age=86400; samesite=lax"
}

function clearSessionHint() {
  document.cookie = "session_hint=; max-age=0; path=/"
}

async function hydrateUser(res: AuthResponse) {
  const setAuth = useAuthStore.getState().setAuth
  // Persist tokens first so the /me call carries the access token.
  setAuth(res.accessToken, {
    userId: res.userId,
    email: res.email,
    role: res.role,
    tenantId: (res as { tenantId?: number | null }).tenantId ?? null,
  })
  // Login response doesn't include tenantId — call /me to resolve it.
  if (res.role !== "SUPER_ADMIN") {
    try {
      const me = await authApi.me()
      setAuth(res.accessToken, {
        userId: me.id,
        email: me.email,
        role: (me.role as AuthResponse["role"]) ?? res.role,
        tenantId: me.tenantId ?? null,
      })
    } catch {
      // /me failed — keep partial auth state; downstream guards handle it.
    }
  }
}

export function useAuth() {
  const router = useRouter()
  const { user, accessToken, clear } = useAuthStore()

  async function login(email: string, password: string) {
    const res = await authApi.login(email, password)
    localStorage.setItem("refreshToken", res.refreshToken)
    setSessionHint()
    await hydrateUser(res)
  }

  async function logout() {
    const refreshToken = localStorage.getItem("refreshToken")
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken)
      } catch {
        // ignore
      }
    }
    localStorage.removeItem("refreshToken")
    clearSessionHint()
    clear()
    router.replace("/login")
  }

  return {
    user,
    accessToken,
    isAuthenticated: Boolean(accessToken && user),
    login,
    logout,
  }
}
