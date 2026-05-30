import { titleCase } from "@/lib/utils"
import type { AuditLogResponse } from "@/types/api"

export const RESOURCE_LABELS: Record<string, string> = {
  CUSTOMER_PRODUCT: "Plan",
  USER: "Team member",
  TENANT: "Organisation",
  CUSTOMER: "Customer",
  PRODUCT: "Product",
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  status: "Status",
  role: "Role",
  price: "Price",
  currency: "Currency",
  billingCadence: "Billing cadence",
  customPrice: "Custom price",
  startsAt: "Start date",
  endsAt: "End date",
  notes: "Notes",
  description: "Description",
  productId: "Product",
  customerId: "Customer",
  planId: "Plan",
  fullName: "Full name",
}

const SKIP_KEYS = new Set([
  "id", "tenantId", "deletedAt", "deletedBy", "createdAt", "updatedAt",
  "tenant", "passwordHash", "accessToken", "refreshToken",
])

const ROLE_LABELS: Record<string, string> = {
  TENANT_USER: "Member",
  TENANT_ADMIN: "Admin",
  SUPER_ADMIN: "Super Admin",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  DISABLED: "Disabled",
  ARCHIVED: "Archived",
  DELETED: "Deleted",
  PENDING: "Pending",
  PAUSED: "Paused",
  CANCELLED: "Cancelled",
  INACTIVE: "Inactive",
}

const CADENCE_LABELS: Record<string, string> = {
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
  WEEKLY: "Weekly",
  DAILY: "Daily",
  ONE_TIME: "One-time",
  QUARTERLY: "Quarterly",
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return "—"
  const str = String(value)
  if (key === "role") return ROLE_LABELS[str] ?? str
  if (key === "status") return STATUS_LABELS[str] ?? str
  if (key === "billingCadence") return CADENCE_LABELS[str] ?? titleCase(str)
  if (key === "customerId" || key === "productId" || key === "planId") return `#${str}`
  if (str.match(/^\d{4}-\d{2}-\d{2}T/)) {
    try {
      return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date(str))
    } catch { return str }
  }
  return str
}

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim()
}

function extractResourceName(log: Pick<AuditLogResponse, "oldValue" | "newValue">): string | null {
  try {
    const obj = log.newValue ? JSON.parse(log.newValue) : log.oldValue ? JSON.parse(log.oldValue) : null
    return obj?.name ?? obj?.email ?? null
  } catch {
    return null
  }
}

export function describeEvent(
  log: Pick<AuditLogResponse, "actorEmail" | "action" | "resourceType" | "resourceId" | "oldValue" | "newValue">
): string {
  const actor = log.actorEmail.split("@")[0]
  const resourceLabel = (RESOURCE_LABELS[log.resourceType] ?? titleCase(log.resourceType)).toLowerCase()
  const name = extractResourceName(log)
  const ref = name ? `${resourceLabel} "${name}"` : resourceLabel

  switch (log.action) {
    case "CREATE":        return `${actor} created ${ref}`
    case "UPDATE":        return `${actor} updated ${ref}`
    case "DELETE":        return `${actor} deleted ${ref}`
    case "STATUS_CHANGE": return `${actor} changed ${ref} status`
    case "LOGIN":         return `${actor} signed in`
    case "LOGOUT":        return `${actor} signed out`
    case "LOGIN_FAILED":  return `${actor} failed to sign in`
    default:              return `${actor} performed ${(log.action as string).toLowerCase().replace(/_/g, " ")} on ${ref}`
  }
}

export function describeChange(
  log: Pick<AuditLogResponse, "action" | "oldValue" | "newValue">
): string | null {
  try {
    const oldObj = log.oldValue ? JSON.parse(log.oldValue) : null
    const newObj = log.newValue ? JSON.parse(log.newValue) : null
    if (!oldObj && !newObj) return null

    const isUpdate = log.action === "UPDATE" || log.action === "STATUS_CHANGE"

    const allKeys = Array.from(
      new Set([...Object.keys(oldObj ?? {}), ...Object.keys(newObj ?? {})])
    ).filter((k) => !SKIP_KEYS.has(k))

    const parts: string[] = []
    for (const key of allKeys) {
      const oldVal = oldObj?.[key]
      const newVal = newObj?.[key]
      if (oldVal === newVal) continue
      const label = fieldLabel(key)

      if (isUpdate && oldVal !== undefined && newVal !== undefined) {
        parts.push(`${label}: ${formatValue(key, oldVal)} → ${formatValue(key, newVal)}`)
      } else if (newVal !== undefined) {
        parts.push(`${label}: ${formatValue(key, newVal)}`)
      } else if (oldVal !== undefined) {
        parts.push(`${label}: ${formatValue(key, oldVal)}`)
      }
    }

    return parts.length > 0 ? parts.join(" · ") : null
  } catch {
    return null
  }
}
