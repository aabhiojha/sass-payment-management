"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { Role } from "@/types/api"

export interface AuthUser {
  userId: number
  email: string
  fullName: string | null
  role: Role
  tenantId: number | null
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  setAuth: (token: string, user: AuthUser) => void
  setAccessToken: (token: string) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clear: () => set({ user: null, accessToken: null }),
    }),
    {
      name: "auth-user",
      storage:
        typeof window !== "undefined"
          ? createJSONStorage(() => localStorage)
          : undefined,
      partialize: (s) => ({ user: s.user, accessToken: s.accessToken }),
    }
  )
)
