"use client"

import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios"
import { useAuthStore } from "@/store/authStore"
import type { ApiError } from "@/types/api"

const baseURL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8090/api/v1"

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

type Pending = (token: string) => void

let isRefreshing = false
let waitQueue: Pending[] = []

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined
    const url = original?.url ?? ""
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/accept-invite") ||
      url.includes("/auth/invite/validate")

    if (!original || error.response?.status !== 401 || original._retry || isAuthEndpoint) {
      return Promise.reject(error)
    }
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waitQueue.push((token) => {
          if (!original.headers) original.headers = {} as any
          original.headers.Authorization = `Bearer ${token}`
          api(original).then(resolve).catch(reject)
        })
      })
    }
    original._retry = true
    isRefreshing = true
    try {
      const refreshToken =
        typeof window !== "undefined"
          ? localStorage.getItem("refreshToken")
          : null
      if (!refreshToken) throw new Error("no-refresh-token")
      const { data } = await axios.post(`${baseURL}/auth/refresh`, {
        refreshToken,
      })
      useAuthStore.getState().setAccessToken(data.accessToken)
      localStorage.setItem("refreshToken", data.refreshToken)
      waitQueue.forEach((cb) => cb(data.accessToken))
      waitQueue = []
      if (!original.headers) original.headers = {} as any
      original.headers.Authorization = `Bearer ${data.accessToken}`
      return api(original)
    } catch (err) {
      waitQueue = []
      useAuthStore.getState().clear()
      if (typeof window !== "undefined") {
        localStorage.removeItem("refreshToken")
        document.cookie = "session_hint=; max-age=0; path=/"
        if (!window.location.pathname.startsWith("/login")) {
          window.location.href = "/login"
        }
      }
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  }
)

export function extractApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined
    return data?.error?.message ?? error.message ?? "Something went wrong."
  }
  if (error instanceof Error) return error.message
  return "Something went wrong."
}

export const ERROR_MAP: Record<string, string> = {
  INVALID_CREDENTIALS: "Invalid email or password.",
  ACCOUNT_DISABLED: "Your account has been disabled. Contact your admin.",
  TENANT_SUSPENDED: "This organisation's account is currently suspended.",
  TOKEN_EXPIRED: "Your session has expired. Please log in again.",
  INVITATION_ALREADY_PENDING: "An invitation is already pending for this email.",
  PRODUCT_ALREADY_ASSIGNED:
    "This product is already assigned to the customer.",
  CUSTOMER_HAS_ACTIVE_PLANS:
    "Cancel all active plans before deleting this customer.",
  PRODUCT_IN_USE: "Remove all plan assignments before deleting this product.",
  INVALID_STATUS_TRANSITION: "This status change is not allowed.",
  SLUG_CONFLICT: "A tenant with that name already exists.",
}

export function friendlyError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined
    const code = data?.error?.code
    if (code && ERROR_MAP[code]) return ERROR_MAP[code]
    return data?.error?.message ?? error.message ?? "Something went wrong."
  }
  return extractApiError(error)
}
