"use client"

import { TenantsSidebar } from "@/components/layout/TenantsSidebar"

export default function TenantsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-full -mx-4 -my-6 sm:-mx-6 lg:-mx-8 lg:-my-8">
      <TenantsSidebar />
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </div>
    </div>
  )
}
