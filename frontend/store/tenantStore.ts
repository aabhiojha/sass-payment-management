"use client"

import { create } from "zustand"

interface TenantState {
  tenantId: number | null
  tenantName: string | null
  set: (id: number | null, name?: string | null) => void
}

export const useTenantStore = create<TenantState>((set) => ({
  tenantId: null,
  tenantName: null,
  set: (tenantId, tenantName = null) => set({ tenantId, tenantName }),
}))
