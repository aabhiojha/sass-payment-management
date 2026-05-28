# Frontend Implementation Guide
**PayFlow — Frontend Specification v1.0**

---

## Table of Contents
1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Environment & Configuration](#3-environment--configuration)
4. [Authentication Architecture](#4-authentication-architecture)
5. [Role-Based Access & Routing](#5-role-based-access--routing)
6. [Page Inventory](#6-page-inventory)
7. [API Reference](#7-api-reference)
8. [State Management](#8-state-management)
9. [HTTP Client Setup](#9-http-client-setup)
10. [Form Handling & Validation](#10-form-handling--validation)
11. [Error Handling](#11-error-handling)
12. [Pagination Pattern](#12-pagination-pattern)
13. [Component Patterns](#13-component-patterns)

---

## 1. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Next.js 14** (App Router) | SSR + client components, built-in routing, middleware for auth guards |
| Language | **TypeScript** | Type-safety for all API contracts |
| Styling | **Tailwind CSS** + **shadcn/ui** | Utility-first; shadcn gives accessible, unstyled primitives |
| State | **Zustand** | Minimal; enough for auth store + tenant context |
| Data fetching | **TanStack Query v5** | Caching, background refresh, pagination, mutations with optimistic updates |
| Forms | **React Hook Form** + **Zod** | Zero re-renders on typing; Zod schemas mirror backend validation rules |
| HTTP | **Axios** | Interceptors for token injection and 401 auto-refresh |
| Tables | **TanStack Table v8** | Headless; pairs with shadcn table components |
| Date display | **date-fns** | Format ISO timestamps; respect tenant timezone |
| Icons | **Lucide React** | Consistent with shadcn |

---

## 2. Project Structure

```
frontend/
├── app/
│   ├── (auth)/                    # Route group — no auth guard
│   │   ├── login/page.tsx
│   │   └── accept-invite/page.tsx
│   ├── (app)/                     # Route group — requires auth
│   │   ├── layout.tsx             # Checks auth, renders sidebar
│   │   ├── dashboard/page.tsx
│   │   ├── tenants/               # SA only
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [tenantId]/page.tsx
│   │   └── [tenantId]/            # Tenant-scoped pages
│   │       ├── layout.tsx         # Sets active tenantId in store
│   │       ├── users/
│   │       ├── invitations/
│   │       ├── customers/
│   │       │   └── [customerId]/
│   │       │       └── products/
│   │       ├── products/
│   │       ├── plans/             # Tenant-wide customer-products view
│   │       ├── reminders/
│   │       └── audit-logs/
│   ├── layout.tsx                 # Root layout, QueryClientProvider, theme
│   └── middleware.ts              # Redirect unauthenticated to /login
├── components/
│   ├── ui/                        # shadcn primitives (auto-generated)
│   ├── layout/                    # Sidebar, TopBar, PageHeader
│   ├── auth/                      # LoginForm, ProtectedRoute
│   ├── tenants/                   # TenantTable, TenantForm, StatusBadge
│   ├── users/                     # UserTable, RoleSelector, UserActions
│   ├── customers/                 # CustomerForm, CustomerTable
│   ├── products/                  # ProductForm, CadenceBadge
│   ├── plans/                     # PlanTable, PlanStatusMachine
│   ├── reminders/                 # ReminderTable, StatusPill
│   └── shared/                    # Pagination, ConfirmDialog, ErrorBanner
├── lib/
│   ├── api/                       # One file per resource (axios calls)
│   │   ├── auth.ts
│   │   ├── tenants.ts
│   │   ├── users.ts
│   │   ├── invitations.ts
│   │   ├── customers.ts
│   │   ├── products.ts
│   │   ├── plans.ts
│   │   ├── reminders.ts
│   │   └── audit.ts
│   ├── axios.ts                   # Configured Axios instance + interceptors
│   ├── queryClient.ts             # TanStack QueryClient singleton
│   └── utils.ts                   # formatDate, formatCurrency, cn()
├── store/
│   ├── authStore.ts               # Zustand: user, accessToken, actions
│   └── tenantStore.ts             # Zustand: activeTenantId
├── hooks/
│   ├── useAuth.ts
│   ├── useTenant.ts
│   └── useRole.ts                 # hasRole(), isAtLeast()
├── types/
│   └── api.ts                     # All request/response TypeScript types
└── middleware.ts                  # Next.js middleware for route protection
```

---

## 3. Environment & Configuration

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
```

The access token is kept **in memory only** (Zustand store). The refresh token is stored in an **httpOnly cookie** via the backend `Set-Cookie` header (configure the backend to set it), or alternatively in `localStorage` with the understanding that it is already a hashed value server-side. Do not store the raw access token in `localStorage`.

> **Note:** The current backend returns `refreshToken` in the JSON response body. Until the backend is updated to use httpOnly cookies, store the refresh token in `sessionStorage` (tab-scoped, cleared on close) rather than `localStorage`.

---

## 4. Authentication Architecture

### Flow

```
1. User POSTs /auth/login
   → Receive { accessToken, refreshToken, userId, email, role }
   → Store accessToken in memory (Zustand)
   → Store refreshToken in sessionStorage
   → Store { userId, email, role, tenantId } decoded from JWT

2. Every request
   → Axios request interceptor attaches: Authorization: Bearer <accessToken>

3. On 401 response
   → Axios response interceptor calls POST /auth/refresh
   → On success: update accessToken in store, retry original request
   → On failure: clear store, redirect to /login

4. Logout
   → POST /auth/logout with { refreshToken }
   → Clear Zustand store + sessionStorage
   → Redirect to /login
```

### `store/authStore.ts`

```typescript
import { create } from 'zustand'

interface AuthUser {
  userId: number
  email: string
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'TENANT_USER'
  tenantId: number | null
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  setAuth: (token: string, user: AuthUser) => void
  setAccessToken: (token: string) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clear: () => set({ user: null, accessToken: null }),
}))
```

### `lib/axios.ts`

```typescript
import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let waitQueue: Array<(token: string) => void> = []

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    if (isRefreshing) {
      return new Promise((resolve) => {
        waitQueue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(api(original))
        })
      })
    }
    original._retry = true
    isRefreshing = true
    try {
      const refreshToken = sessionStorage.getItem('refreshToken')
      const { data } = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
        { refreshToken }
      )
      useAuthStore.getState().setAccessToken(data.accessToken)
      sessionStorage.setItem('refreshToken', data.refreshToken)
      waitQueue.forEach((cb) => cb(data.accessToken))
      waitQueue = []
      original.headers.Authorization = `Bearer ${data.accessToken}`
      return api(original)
    } catch {
      useAuthStore.getState().clear()
      sessionStorage.removeItem('refreshToken')
      window.location.href = '/login'
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)
```

### Next.js Middleware (`middleware.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/accept-invite']

export function middleware(req: NextRequest) {
  const isPublic = PUBLIC_PATHS.some((p) => req.nextUrl.pathname.startsWith(p))
  // Access token is in memory — use a lightweight presence cookie set on login
  const loggedIn = req.cookies.has('session_hint')
  if (!isPublic && !loggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }
  return NextResponse.next()
}

export const config = { matcher: ['/((?!_next|favicon.ico|api).*)'] }
```

> Set a non-sensitive `session_hint=1` cookie (no token value, just presence indicator) on successful login so middleware can detect auth state without reading the actual token.

---

## 5. Role-Based Access & Routing

### Role Hierarchy

| Role | Numeric Level | Tenant-scoped |
|---|---|---|
| `SUPER_ADMIN` | 3 | No (no tenantId in JWT) |
| `TENANT_ADMIN` | 2 | Yes |
| `TENANT_USER` | 1 | Yes |

### `hooks/useRole.ts`

```typescript
import { useAuthStore } from '@/store/authStore'

const LEVELS = { TENANT_USER: 1, TENANT_ADMIN: 2, SUPER_ADMIN: 3 } as const

export function useRole() {
  const role = useAuthStore((s) => s.user?.role)
  return {
    role,
    isSuperAdmin: role === 'SUPER_ADMIN',
    isTenantAdmin: role === 'TENANT_ADMIN',
    isAtLeast: (min: keyof typeof LEVELS) =>
      role ? LEVELS[role] >= LEVELS[min] : false,
  }
}
```

### Route-Level Guards (example)

```tsx
// app/(app)/tenants/page.tsx — SA only
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/serverSession'

export default async function TenantsPage() {
  const session = await getServerSession()
  if (session?.role !== 'SUPER_ADMIN') redirect('/dashboard')
  // ...
}
```

For client components use the `useRole()` hook to conditionally render UI elements (delete buttons, admin tabs, etc).

---

## 6. Page Inventory

### Public Pages

| Route | Component | Description |
|---|---|---|
| `/login` | `LoginForm` | Email + password; redirects to `/dashboard` on success |
| `/accept-invite?token=<tok>` | `AcceptInviteForm` | Reads `token` from query param; sets password; auto-logs in |

### Authenticated Pages

| Route | Min Role | Page | Key Features |
|---|---|---|---|
| `/dashboard` | TU | Dashboard | Quick stats (customer count, active plans, pending reminders) |
| `/tenants` | SA | Tenant list | Paginated table; search; status filter; create button |
| `/tenants/new` | SA | Create tenant | Form + invite first admin in one flow |
| `/tenants/[tenantId]` | SA | Tenant detail | View/edit; suspend/archive actions |
| `/[tenantId]/users` | TU | User list | Paginated; role badge; TA actions: disable, delete, role change |
| `/[tenantId]/invitations` | TA | Invitations | Pending list; revoke / resend; create new |
| `/[tenantId]/customers` | TU | Customer list | Search by name/email; create (TU+); delete (TA) |
| `/[tenantId]/customers/new` | TU | Create customer | |
| `/[tenantId]/customers/[customerId]` | TU | Customer detail | Info + assigned plans tab |
| `/[tenantId]/customers/[customerId]/products/new` | TU | Assign product | Dropdown of active products; dates; notes |
| `/[tenantId]/products` | TU | Product list | Search; status filter; create (TU+); delete (TA) |
| `/[tenantId]/products/new` | TU | Create product | Name, price, currency, cadence |
| `/[tenantId]/products/[productId]` | TU | Product detail | Edit; status toggle (ACTIVE/INACTIVE) |
| `/[tenantId]/plans` | TU | All plans (tenant-wide) | Flat list across all customers; status filter |
| `/[tenantId]/reminders` | TU | Reminder history | Filter by status; manual trigger button (TA) |
| `/[tenantId]/audit-logs` | TA | Audit log | Actor, action, resource, before/after diff viewer |
| `/me` | TU | My profile | Read-only; role/status display |

---

## 7. API Reference

**Base URL:** `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:8080/api/v1`)

All authenticated endpoints require: `Authorization: Bearer <accessToken>`

All list endpoints accept: `?page=0&size=20&sort=createdAt&direction=DESC`

Paginated list response shape:
```json
{
  "content": [...],
  "pageable": { "pageNumber": 0, "pageSize": 20 },
  "totalElements": 143,
  "totalPages": 8,
  "last": false
}
```

---

### Auth

#### POST `/auth/login`
**Public**

Request:
```json
{ "email": "admin@corp.com", "password": "secret" }
```

Response `200`:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "userId": 1,
  "email": "admin@corp.com",
  "role": "TENANT_ADMIN"
}
```

Errors: `401 INVALID_CREDENTIALS`, `403 ACCOUNT_DISABLED`, `403 TENANT_SUSPENDED`

---

#### POST `/auth/refresh`
**Public**

Request:
```json
{ "refreshToken": "eyJ..." }
```

Response `200`: same shape as login response.

Errors: `401 UNAUTHORIZED` (expired/invalid/revoked)

---

#### POST `/auth/logout`
**Min role: TU**

Request:
```json
{ "refreshToken": "eyJ..." }
```

Response `204 No Content`

---

#### POST `/auth/accept-invite`
**Public**

Request:
```json
{ "token": "raw-invite-token", "password": "newPassword1!" }
```

Response `200`: same shape as login response (auto-logs in).

Errors: `400 INVALID_TOKEN`, `400` (expired), `409 USER_ALREADY_EXISTS`

---

### Identity

#### GET `/me`
**Min role: TU**

Response `200`:
```json
{
  "id": 1,
  "tenantId": 5,
  "email": "user@corp.com",
  "role": "TENANT_ADMIN",
  "status": "ACTIVE",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

### Tenants

#### POST `/tenants`
**Min role: SA**

Request:
```json
{ "name": "Acme Corp", "companyEmail": "billing@acme.com", "timezone": "America/New_York" }
```

Response `200`:
```json
{
  "id": 1,
  "name": "Acme Corp",
  "slug": "acme-corp",
  "companyEmail": "billing@acme.com",
  "timezone": "America/New_York",
  "status": "ACTIVE",
  "archivedAt": null,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

Errors: `409 SLUG_CONFLICT`

---

#### GET `/tenants`
**Min role: SA** — Returns `Page<TenantResponse>`

---

#### GET `/tenants/{tenantId}`
**Min role: SA** — Returns `TenantResponse`

---

#### PATCH `/tenants/{tenantId}`
**Min role: SA**

Request (all fields optional):
```json
{ "name": "New Name", "companyEmail": "new@corp.com", "timezone": "UTC" }
```

Response `200`: `TenantResponse`

---

#### POST `/tenants/{tenantId}/suspend`
**Min role: SA** — No body. Response `200`: `TenantResponse` with `status: "SUSPENDED"`

Errors: `409 INVALID_STATUS_TRANSITION`

---

#### POST `/tenants/{tenantId}/archive`
**Min role: SA** — No body. Response `200`: `TenantResponse` with `status: "ARCHIVED"`. Irreversible.

---

### Users & Invitations

#### POST `/tenants/{tenantId}/invite-admin`
**Min role: SA**

Request: `{ "email": "admin@corp.com" }`

Response `200`:
```json
{
  "id": 10,
  "tenantId": 1,
  "email": "admin@corp.com",
  "role": "TENANT_ADMIN",
  "status": "PENDING",
  "expiresAt": "2024-01-08T00:00:00Z",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

Errors: `404` (tenant not found), `400` (tenant not active), `409 INVITATION_ALREADY_PENDING`

---

#### POST `/tenants/{tenantId}/invite-user`
**Min role: TA**

Request: `{ "email": "user@corp.com" }`

Response `200`: `InvitationResponse` with `role: "TENANT_USER"`

---

#### GET `/tenants/{tenantId}/users`
**Min role: TU** — Returns `Page<UserResponse>`

---

#### GET `/tenants/{tenantId}/users/{userId}`
**Min role: TU** — Returns `UserResponse`

---

#### PATCH `/tenants/{tenantId}/users/{userId}`
**Min role: TA**

Request: `{ "role": "TENANT_ADMIN" }` — Allowed values: `TENANT_ADMIN`, `TENANT_USER`

Response `200`: `UserResponse`

Errors: `400` (SUPER_ADMIN role rejected), `404`

---

#### POST `/tenants/{tenantId}/users/{userId}/disable`
**Min role: TA** — No body. Response `200`: `UserResponse` with `status: "DISABLED"`

---

#### DELETE `/tenants/{tenantId}/users/{userId}`
**Min role: TA** — Response `204 No Content`

---

#### GET `/tenants/{tenantId}/invitations`
**Min role: TA** — Returns `Page<InvitationResponse>`

---

#### POST `/tenants/{tenantId}/invitations/{id}/revoke`
**Min role: TA** — No body. Response `200`: `InvitationResponse` with `status: "REVOKED"`

Errors: `404`, `400` (already revoked)

---

#### POST `/tenants/{tenantId}/invitations/{id}/resend`
**Min role: TA** — No body. Response `200`: `InvitationResponse` (new token, new expiresAt)

Errors: `400` (not in PENDING state)

---

### Customers

#### POST `/tenants/{tenantId}/customers`
**Min role: TU**

Request:
```json
{
  "name": "Bob Smith",
  "email": "bob@example.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "notes": "VIP customer"
}
```

Response `200`:
```json
{
  "id": 10,
  "tenantId": 1,
  "name": "Bob Smith",
  "email": "bob@example.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "notes": "VIP customer",
  "status": "ACTIVE",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

Errors: `404` (tenant not found), `409` (email conflict)

---

#### GET `/tenants/{tenantId}/customers`
**Min role: TU** — Returns `Page<CustomerResponse>`

---

#### GET `/tenants/{tenantId}/customers/{customerId}`
**Min role: TU** — Returns `CustomerResponse`

---

#### PATCH `/tenants/{tenantId}/customers/{customerId}`
**Min role: TU**

Request (all fields optional):
```json
{ "name": "Robert Smith", "email": "robert@example.com", "phone": null, "address": null, "notes": null }
```

Response `200`: `CustomerResponse`

Errors: `404`, `409` (email conflict)

---

#### DELETE `/tenants/{tenantId}/customers/{customerId}`
**Min role: TA** — Response `204 No Content`

Errors: `404`, `409 CUSTOMER_HAS_ACTIVE_PLANS`

---

### Products

#### POST `/tenants/{tenantId}/products`
**Min role: TU**

Request:
```json
{
  "name": "Pro Plan",
  "description": "Full access",
  "price": 49.99,
  "currency": "USD",
  "billingCadence": "MONTHLY"
}
```

`billingCadence` values: `WEEKLY` | `MONTHLY` | `QUARTERLY` | `ANNUALLY`

Response `200`:
```json
{
  "id": 20,
  "tenantId": 1,
  "name": "Pro Plan",
  "description": "Full access",
  "price": 49.99,
  "currency": "USD",
  "billingCadence": "MONTHLY",
  "status": "ACTIVE",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

Errors: `404` (tenant), `409` (name conflict)

---

#### GET `/tenants/{tenantId}/products`
**Min role: TU** — Returns `Page<ProductResponse>`

---

#### GET `/tenants/{tenantId}/products/{productId}`
**Min role: TU** — Returns `ProductResponse`

---

#### PATCH `/tenants/{tenantId}/products/{productId}`
**Min role: TU**

Request (all fields optional):
```json
{
  "name": "Pro Plan v2",
  "description": null,
  "price": 59.99,
  "currency": "USD",
  "billingCadence": "MONTHLY",
  "status": "INACTIVE"
}
```

`status` values: `ACTIVE` | `INACTIVE` | `DELETED`

Response `200`: `ProductResponse`

---

#### DELETE `/tenants/{tenantId}/products/{productId}`
**Min role: TA** — Response `204 No Content`

Errors: `409 PRODUCT_IN_USE`

---

### Customer Products (Plans)

#### POST `/tenants/{tenantId}/customers/{customerId}/products`
**Min role: TU**

Request:
```json
{
  "productId": 20,
  "startsAt": "2024-02-01T00:00:00Z",
  "endsAt": "2025-02-01T00:00:00Z",
  "notes": "Annual plan, renewable"
}
```

`startsAt` defaults to now if omitted. `endsAt` must be after `startsAt` if both provided.

Response `200`:
```json
{
  "id": 30,
  "tenantId": 1,
  "customerId": 10,
  "customerName": "Bob Smith",
  "productId": 20,
  "productName": "Pro Plan",
  "status": "ACTIVE",
  "startsAt": "2024-02-01T00:00:00Z",
  "endsAt": "2025-02-01T00:00:00Z",
  "notes": "Annual plan, renewable",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

Errors: `404` (customer or product), `409 PRODUCT_ALREADY_ASSIGNED`, `400` (endsAt before startsAt)

---

#### GET `/tenants/{tenantId}/customers/{customerId}/products`
**Min role: TU** — Returns `Page<CustomerProductResponse>`

---

#### GET `/tenants/{tenantId}/customers/{customerId}/products/{cpId}`
**Min role: TU** — Returns `CustomerProductResponse`

---

#### PATCH `/tenants/{tenantId}/customers/{customerId}/products/{cpId}`
**Min role: TU**

Request (all fields optional):
```json
{ "startsAt": "2024-03-01T00:00:00Z", "endsAt": "2025-03-01T00:00:00Z", "notes": "Updated" }
```

Response `200`: `CustomerProductResponse`

---

#### PATCH `/tenants/{tenantId}/customers/{customerId}/products/{cpId}/status`
**Min role: TU**

Request: `{ "status": "PAUSED" }`

Valid `status` values and transitions:
- `ACTIVE → PAUSED`
- `ACTIVE → CANCELLED`
- `PAUSED → ACTIVE`
- `PAUSED → CANCELLED`
- `CANCELLED` is terminal — no further transitions

Response `200`: `CustomerProductResponse`

Errors: `409 INVALID_STATUS_TRANSITION`

---

#### DELETE `/tenants/{tenantId}/customers/{customerId}/products/{cpId}`
**Min role: TA** — Response `204 No Content`

---

#### GET `/tenants/{tenantId}/customer-products`
**Min role: TU** — Returns `Page<CustomerProductResponse>` (all plans across all customers for this tenant)

---

### Reminders

#### GET `/tenants/{tenantId}/reminders`
**Min role: TU** — Returns `Page<ReminderResponse>`

Response item shape:
```json
{
  "id": 1,
  "tenantId": 1,
  "customerProductId": 30,
  "customerId": 10,
  "customerName": "Bob Smith",
  "productId": 20,
  "productName": "Pro Plan",
  "status": "SENT",
  "sentAt": "2024-01-15T08:00:00Z",
  "errorMessage": null,
  "createdAt": "2024-01-15T08:00:00Z"
}
```

`status` values: `SENT` | `FAILED` | `SKIPPED`

---

#### GET `/tenants/{tenantId}/reminders/{reminderId}`
**Min role: TU** — Returns `ReminderResponse`

---

#### POST `/tenants/{tenantId}/reminders/trigger`
**Min role: TU**

No body. Triggers the reminder batch for this tenant immediately.

Response `200`: `List<ReminderResponse>` — one entry per plan processed.

---

### Audit Logs

#### GET `/tenants/{tenantId}/audit-logs`
**Min role: TA** — Returns `Page<AuditLogResponse>`

Response item shape:
```json
{
  "id": 1,
  "actorId": 2,
  "actorEmail": "admin@corp.com",
  "action": "CREATE",
  "resourceType": "CUSTOMER",
  "resourceId": 10,
  "oldValue": null,
  "newValue": "{\"name\":\"Bob Smith\"}",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2024-01-01T12:00:00Z"
}
```

`action` values: `CREATE` | `UPDATE` | `DELETE` | `STATUS_CHANGE` | `LOGIN` | `LOGOUT` | `LOGIN_FAILED`

---

#### GET `/tenants/{tenantId}/audit-logs/{auditLogId}`
**Min role: TA** — Returns `AuditLogResponse`

---

## 8. State Management

Use Zustand for **global, cross-component state only**:

```
authStore       → user, accessToken (set on login, cleared on logout)
tenantStore     → activeTenantId (set by [tenantId] layout)
```

Use **TanStack Query** for all server state (lists, detail views, mutations). Do not duplicate server data in Zustand.

### Query Key Conventions

```typescript
// customers
['customers', tenantId]                           // list
['customers', tenantId, customerId]               // detail
['customers', tenantId, customerId, 'products']   // customer's plans
['products', tenantId]
['plans', tenantId]                               // tenant-wide
['reminders', tenantId]
['audit-logs', tenantId]
['users', tenantId]
['invitations', tenantId]
['tenants']                                       // SA only
['tenants', tenantId]
```

### Mutation + Cache Invalidation

```typescript
const createCustomer = useMutation({
  mutationFn: (data: CreateCustomerRequest) =>
    api.customers.create(tenantId, data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['customers', tenantId] })
  },
})
```

---

## 9. HTTP Client Setup

### `types/api.ts` (key types)

```typescript
export interface AuthResponse {
  accessToken: string
  refreshToken: string
  userId: number
  email: string
  role: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'TENANT_USER'
}

export interface UserResponse {
  id: number
  tenantId: number | null
  email: string
  role: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface TenantResponse {
  id: number
  name: string
  slug: string
  companyEmail: string
  timezone: string
  status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
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
  status: 'ACTIVE' | 'DELETED'
  createdAt: string
  updatedAt: string
}

export interface ProductResponse {
  id: number
  tenantId: number
  name: string
  description: string | null
  price: number
  currency: string
  billingCadence: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'
  status: 'ACTIVE' | 'INACTIVE' | 'DELETED'
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
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED'
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
  status: 'SENT' | 'FAILED' | 'SKIPPED'
  sentAt: string | null
  errorMessage: string | null
  createdAt: string
}

export interface InvitationResponse {
  id: number
  tenantId: number
  email: string
  role: 'TENANT_ADMIN' | 'TENANT_USER'
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED'
  expiresAt: string
  createdAt: string
}

export interface AuditLogResponse {
  id: number
  actorId: number
  actorEmail: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED'
  resourceType: string
  resourceId: number | null
  oldValue: string | null
  newValue: string | null
  userAgent: string | null
  createdAt: string
}

export interface Page<T> {
  content: T[]
  pageable: { pageNumber: number; pageSize: number }
  totalElements: number
  totalPages: number
  last: boolean
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
```

### `lib/api/customers.ts` (example pattern)

```typescript
import { api } from '@/lib/axios'
import type { CustomerResponse, CreateCustomerRequest, Page } from '@/types/api'

export const customersApi = {
  list: (tenantId: number, page = 0, size = 20) =>
    api.get<Page<CustomerResponse>>(`/tenants/${tenantId}/customers`, {
      params: { page, size },
    }).then((r) => r.data),

  get: (tenantId: number, customerId: number) =>
    api.get<CustomerResponse>(`/tenants/${tenantId}/customers/${customerId}`)
       .then((r) => r.data),

  create: (tenantId: number, data: CreateCustomerRequest) =>
    api.post<CustomerResponse>(`/tenants/${tenantId}/customers`, data)
       .then((r) => r.data),

  update: (tenantId: number, customerId: number, data: Partial<CreateCustomerRequest>) =>
    api.patch<CustomerResponse>(`/tenants/${tenantId}/customers/${customerId}`, data)
       .then((r) => r.data),

  delete: (tenantId: number, customerId: number) =>
    api.delete(`/tenants/${tenantId}/customers/${customerId}`),
}
```

---

## 10. Form Handling & Validation

Use React Hook Form + Zod. Mirror backend validation constraints exactly.

### Example: Create Customer

```typescript
import { z } from 'zod'

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(50).optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
})

export type CreateCustomerRequest = z.infer<typeof createCustomerSchema>
```

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

function CustomerForm({ tenantId }: { tenantId: number }) {
  const form = useForm<CreateCustomerRequest>({
    resolver: zodResolver(createCustomerSchema),
  })
  const mutation = useMutation({ mutationFn: (d) => customersApi.create(tenantId, d) })

  return (
    <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))}>
      {/* fields */}
    </form>
  )
}
```

### Validation Rules Summary

| Field | Rule |
|---|---|
| `email` | Valid email format |
| `password` (accept-invite) | Min 8 characters |
| `role` (update user) | `TENANT_ADMIN` or `TENANT_USER` only; SUPER_ADMIN rejected |
| `currency` | Exactly 3 characters (ISO 4217) |
| `price` | Greater than 0 |
| `billingCadence` | `WEEKLY` \| `MONTHLY` \| `QUARTERLY` \| `ANNUALLY` |
| `endsAt` | Must be after `startsAt` if provided |
| `plan status` | Must follow state machine (see §7) |

---

## 11. Error Handling

### Error Response Shape

All non-2xx responses follow:
```json
{
  "error": {
    "code": "CUSTOMER_HAS_ACTIVE_PLANS",
    "path": "/api/v1/tenants/1/customers/10",
    "message": "Customer has active plans and cannot be deleted.",
    "details": [],
    "requestId": "req-abc123",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### Global Error Handler

```typescript
// In axios interceptor or TanStack Query's onError
function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined
    return data?.error?.message ?? 'An unexpected error occurred.'
  }
  return 'An unexpected error occurred.'
}
```

### Error Code → User Message Mapping

| Code | User-facing message |
|---|---|
| `INVALID_CREDENTIALS` | Invalid email or password. |
| `ACCOUNT_DISABLED` | Your account has been disabled. Contact your admin. |
| `TENANT_SUSPENDED` | This organisation's account is currently suspended. |
| `TOKEN_EXPIRED` | Your session has expired. Please log in again. |
| `INVITATION_ALREADY_PENDING` | An invitation is already pending for this email. |
| `PRODUCT_ALREADY_ASSIGNED` | This product is already assigned to the customer. |
| `CUSTOMER_HAS_ACTIVE_PLANS` | Cancel all active plans before deleting this customer. |
| `PRODUCT_IN_USE` | Remove all plan assignments before deleting this product. |
| `INVALID_STATUS_TRANSITION` | This status change is not allowed. |
| `SLUG_CONFLICT` | A tenant with that name already exists. |
| `VALIDATION_ERROR` | Show per-field `details` inline on the form. |

---

## 12. Pagination Pattern

The backend returns Spring `Page<T>` — page numbers are **0-indexed**.

```typescript
// hooks/usePagination.ts
import { useState } from 'react'

export function usePagination(defaultSize = 20) {
  const [page, setPage] = useState(0)
  const [size] = useState(defaultSize)
  return { page, size, setPage, nextPage: () => setPage((p) => p + 1), prevPage: () => setPage((p) => p - 1) }
}
```

```tsx
function CustomerList({ tenantId }: { tenantId: number }) {
  const { page, size, setPage } = usePagination()
  const { data } = useQuery({
    queryKey: ['customers', tenantId, page],
    queryFn: () => customersApi.list(tenantId, page, size),
  })

  return (
    <>
      <Table rows={data?.content ?? []} />
      <Pagination
        page={data?.pageable.pageNumber ?? 0}
        totalPages={data?.totalPages ?? 0}
        onPageChange={setPage}
      />
    </>
  )
}
```

---

## 13. Component Patterns

### Status Badge

Map enum strings to colours:

| Status | Color |
|---|---|
| `ACTIVE` | green |
| `PENDING` | yellow |
| `PAUSED` | blue |
| `SUSPENDED` | orange |
| `CANCELLED` / `REVOKED` / `DISABLED` | red |
| `ARCHIVED` / `DELETED` | gray |
| `SENT` | green |
| `FAILED` | red |
| `SKIPPED` | gray |

### Confirm Dialog

Wrap any destructive action (delete customer, suspend tenant, cancel plan) in a `ConfirmDialog` component that requires the user to type the resource name or click a second time.

### Role-Gated Render

```tsx
function ActionMenu({ userId }: { userId: number }) {
  const { isAtLeast } = useRole()
  return (
    <DropdownMenu>
      <DropdownMenuItem>View</DropdownMenuItem>
      {isAtLeast('TENANT_ADMIN') && (
        <DropdownMenuItem>Disable</DropdownMenuItem>
      )}
    </DropdownMenu>
  )
}
```

### Tenant Context

The `[tenantId]` layout sets the active tenant in Zustand. Any nested page reads it without needing prop drilling:

```typescript
// store/tenantStore.ts
export const useTenantStore = create<{ tenantId: number | null; set: (id: number) => void }>(
  (set) => ({ tenantId: null, set: (tenantId) => set({ tenantId }) })
)
```

```tsx
// app/(app)/[tenantId]/layout.tsx
'use client'
export default function TenantLayout({ children, params }: { children: React.ReactNode; params: { tenantId: string } }) {
  const setTenant = useTenantStore((s) => s.set)
  useEffect(() => { setTenant(Number(params.tenantId)) }, [params.tenantId])
  return <>{children}</>
}
```

### Date Formatting

```typescript
import { format, formatDistanceToNow } from 'date-fns'

export const formatDate = (iso: string) => format(new Date(iso), 'MMM d, yyyy')
export const formatDateTime = (iso: string) => format(new Date(iso), 'MMM d, yyyy HH:mm')
export const timeAgo = (iso: string) => formatDistanceToNow(new Date(iso), { addSuffix: true })
```

When displaying reminder dates or plan end dates, respect the customer's or tenant's timezone using `date-fns-tz`:

```typescript
import { formatInTimeZone } from 'date-fns-tz'
formatInTimeZone(new Date(endsAt), tenant.timezone, 'MMM d, yyyy')
```

---

## Quick Reference — RBAC Summary

| Feature | TENANT_USER | TENANT_ADMIN | SUPER_ADMIN |
|---|---|---|---|
| View own profile | ✓ | ✓ | ✓ |
| List/view users | ✓ | ✓ | ✓ |
| Disable/delete/role-change users | | ✓ | ✓ |
| Send invitations | | ✓ | ✓ |
| Create/update customers & products | ✓ | ✓ | ✓ |
| Delete customers & products | | ✓ | ✓ |
| Assign/update plans | ✓ | ✓ | ✓ |
| Delete plans | | ✓ | ✓ |
| Trigger reminders | ✓ | ✓ | ✓ |
| View audit logs | | ✓ | ✓ |
| Create/manage tenants | | | ✓ |
| Invite first tenant admin | | | ✓ |
