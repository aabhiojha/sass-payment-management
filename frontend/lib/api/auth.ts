import { api } from "@/lib/axios"
import type { AuthResponse, UserResponse } from "@/types/api"

export interface InviteTokenValidation {
  email: string
  role: string
  tenantName: string
  expiresAt: string
}

export const authApi = {
  login: (email: string, password: string) =>
    api
      .post<AuthResponse>("/auth/login", { email, password })
      .then((r) => r.data),

  refresh: (refreshToken: string) =>
    api
      .post<AuthResponse>("/auth/refresh", { refreshToken })
      .then((r) => r.data),

  logout: (refreshToken: string) =>
    api.post("/auth/logout", { refreshToken }).then((r) => r.data),

  acceptInvite: (token: string, password: string) =>
    api
      .post<AuthResponse>("/auth/accept-invite", { token, password })
      .then((r) => r.data),

  me: () => api.get<UserResponse>("/me").then((r) => r.data),

  validateInviteToken: (token: string) =>
    api
      .get<InviteTokenValidation>("/auth/invite/validate", { params: { token } })
      .then((r) => r.data),
}
