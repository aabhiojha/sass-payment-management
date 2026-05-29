"use client"

import { useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTenantStore } from "@/store/tenantStore"
import { useRole } from "@/hooks/useRole"
import { tenantsApi } from "@/lib/api/tenants"

export default function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { tenantId: string }
}) {
  const setTenant = useTenantStore((s) => s.set)
  const { isSuperAdmin } = useRole()
  const id = Number(params.tenantId)

  const { data: tenant } = useQuery({
    queryKey: ["tenant", id],
    queryFn: () => tenantsApi.get(id),
    enabled: isSuperAdmin,
    staleTime: 60_000,
  })

  useEffect(() => {
    setTenant(id, tenant?.name ?? null)
    return () => {
      if (!isSuperAdmin) setTenant(null)
    }
  }, [id, tenant?.name, setTenant, isSuperAdmin])

  return <>{children}</>
}
