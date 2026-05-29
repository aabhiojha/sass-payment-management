import { titleCase } from "@/lib/utils"
import type { AuditLogResponse } from "@/types/api"

export const RESOURCE_LABELS: Record<string, string> = {
  CUSTOMER_PRODUCT: "Plan",
  USER: "Team member",
  TENANT: "Organisation",
  CUSTOMER: "Customer",
  PRODUCT: "Product",
}

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
}

function humanValue(key: string, value: string): string {
  if (key === "role") return ROLE_LABELS[value] ?? value
  if (key === "status") return STATUS_LABELS[value] ?? value
  return value
}

function extractResourceName(log: Pick<AuditLogResponse, "oldValue" | "newValue">): string | null {
  try {
    const obj = log.newValue ? JSON.parse(log.newValue) : log.oldValue ? JSON.parse(log.oldValue) : null
    return obj?.name ?? obj?.email ?? null
  } catch {
    return null
  }
}

export function describeEvent(log: Pick<AuditLogResponse, "actorEmail" | "action" | "resourceType" | "resourceId" | "oldValue" | "newValue">): string {
  const actor = log.actorEmail.split("@")[0]
  const resource = (RESOURCE_LABELS[log.resourceType] ?? titleCase(log.resourceType)).toLowerCase()
  const name = extractResourceName(log)
  const ref = name ? `${resource} "${name}"` : resource
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

export function describeChange(log: Pick<AuditLogResponse, "oldValue" | "newValue">): string | null {
  try {
    const oldObj = log.oldValue ? JSON.parse(log.oldValue) : null
    const newObj = log.newValue ? JSON.parse(log.newValue) : null
    if (!oldObj && !newObj) return null
    const keys = Array.from(new Set([...Object.keys(oldObj ?? {}), ...Object.keys(newObj ?? {})]))
    const parts = keys.map((key) => {
      const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ")
      const oldVal = oldObj?.[key]
      const newVal = newObj?.[key]
      if (oldVal !== undefined && newVal !== undefined && oldVal !== newVal) {
        return `${label}: ${humanValue(key, String(oldVal))} → ${humanValue(key, String(newVal))}`
      }
      if (newVal !== undefined) return `${label}: ${humanValue(key, String(newVal))}`
      return null
    }).filter(Boolean)
    return parts.length > 0 ? parts.join(" · ") : null
  } catch {
    return null
  }
}
