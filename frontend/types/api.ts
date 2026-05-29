export type Role = "SUPER_ADMIN" | "TENANT_ADMIN" | "TENANT_USER"

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  userId: number
  email: string
  role: Role
  fullName?: string | null
  tenantId?: number | null
}

export interface UserResponse {
  id: number
  tenantId: number | null
  email: string
  fullName: string | null
  role: Role
  status: "ACTIVE" | "DISABLED" | "PENDING"
  createdAt: string
  updatedAt: string
}

export interface TenantResponse {
  id: number
  name: string
  slug: string
  companyEmail: string
  timezone: string
  status: "ACTIVE" | "SUSPENDED" | "ARCHIVED"
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CustomerResponse {
  id: number
  tenantId: number
  name: string
  email: string
  phone: string | null
  address: string | null
  notes: string | null
  status: "ACTIVE" | "DELETED"
  createdAt: string
  updatedAt: string
}

export type BillingCadence = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY"

export interface ProductResponse {
  id: number
  tenantId: number
  name: string
  description: string | null
  price: number
  currency: string
  billingCadence: BillingCadence
  status: "ACTIVE" | "INACTIVE" | "DELETED"
  createdAt: string
  updatedAt: string
}

export interface CustomerProductResponse {
  id: number
  tenantId: number
  customerId: number
  customerName: string
  productId: number
  productName: string
  status: "ACTIVE" | "PAUSED" | "CANCELLED"
  startsAt: string
  endsAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface ReminderResponse {
  id: number
  tenantId: number
  customerProductId: number
  customerId: number
  customerName: string
  productId: number
  productName: string
  status: "SENT" | "FAILED" | "SKIPPED"
  sentAt: string | null
  errorMessage: string | null
  createdAt: string
}

export interface InvitationResponse {
  id: number
  tenantId: number
  email: string
  role: "TENANT_ADMIN" | "TENANT_USER"
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"
  expiresAt: string
  createdAt: string
}

export interface AuditLogResponse {
  id: number
  actorId: number
  actorEmail: string
  action:
    | "CREATE"
    | "UPDATE"
    | "DELETE"
    | "STATUS_CHANGE"
    | "LOGIN"
    | "LOGOUT"
    | "LOGIN_FAILED"
  resourceType: string
  resourceId: number | null
  oldValue: string | null
  newValue: string | null
  userAgent: string | null
  createdAt: string
}

export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  pageNumber: number
  pageSize: number
}

// Raw shape returned by the backend (Spring HATEOAS PagedModel)
export interface RawPage<T> {
  content: T[]
  page?: {
    size: number
    number: number
    totalElements: number
    totalPages: number
  }
  // Legacy/fallback Spring Page shape
  pageable?: { pageNumber: number; pageSize: number }
  totalElements?: number
  totalPages?: number
}

export interface ApiError {
  error: {
    code: string
    path: string
    message: string
    details?: { field: string; issue: string }[]
    requestId: string
    timestamp: string
  }
}

// Request shapes
export interface CreateTenantRequest {
  name: string
  companyEmail: string
  timezone: string
}

export interface CreateCustomerRequest {
  name: string
  email: string
  phone?: string
  address?: string
  notes?: string
}

export interface CreateProductRequest {
  name: string
  description?: string
  price: number
  currency: string
  billingCadence: BillingCadence
}

export interface AssignProductRequest {
  productId: number
  startsAt?: string
  endsAt?: string
  notes?: string
}

// Dashboard types

export interface TenantSummary {
  totalCustomers: number
  totalProducts: number
  activePlans: number
  pausedPlans: number
  cancelledPlans: number
}

export interface CurrencyTotal {
  currency: string
  totalAmount: number
  planCount: number
}

export interface RevenueByCurrency {
  totals: CurrencyTotal[]
}

export interface ReminderStats {
  from: string
  to: string
  sent: number
  failed: number
  skipped: number
  total: number
}

export interface UpcomingReminder {
  customerProductId: number
  customerName: string
  customerEmail: string
  productName: string
  currency: string
  amount: number
  endsAt: string
}

export interface OverduePlan {
  customerProductId: number
  customerName: string
  customerEmail: string
  productName: string
  currency: string
  amount: number
  endsAt: string
}

export interface AdminSummary {
  activeTenants: number
  suspendedTenants: number
  archivedTenants: number
  totalUsers: number
  remindersSent: number
  remindersFailed: number
  remindersSkipped: number
}
