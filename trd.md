# PayFlow — Technical Requirements Document
**v1.2 · Abhishek Ojha · 2026-05-28**

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Users & Roles](#2-users--roles)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [Architecture](#5-architecture)
6. [Data Model](#6-data-model)
7. [API Specification](#7-api-specification)
8. [Business Rules](#8-business-rules)
9. [Security](#9-security)
10. [Error Handling](#10-error-handling)
11. [Deployment & Config](#11-deployment--config)
12. [Observability](#12-observability)
13. [Assumptions & Constraints](#13-assumptions--constraints)
14. [Acceptance Criteria](#14-acceptance-criteria)

---

## 1. System Overview

PayFlow is a SaaS backend enabling companies (tenants) to manage customers, define recurring payment plans, and automatically send payment reminder emails. Each tenant is fully isolated with RBAC.

**Core capabilities:** JWT auth · tenant lifecycle · user management via invite · customer/product CRUD · recurring billing schedules · automated reminder emails · dashboard analytics · full audit log

**Architecture:** Two Spring Boot services — a core monolith (all business logic + PostgreSQL) and a notification service (email only). The monolith delegates all email delivery to the notification service via internal HTTP.

### Glossary

| Term | Definition |
|---|---|
| **Tenant** | A single business on the platform (e.g. "Acme Corp") with isolated data |
| **Cadence** | Payment frequency: `WEEKLY`, `MONTHLY`, `QUARTERLY`, `ANNUALLY` |
| **Billing Day** | Day of month (1–28) or week (1–7) on which payment is due |
| **Grace Days** | Days after due date before a payment is considered overdue |
| **OTP** | 6–8 digit one-time password for password reset |

---

## 2. Users & Roles

| Role | Scope | Description |
|---|---|---|
| `SUPER_ADMIN` | Global | Platform operator. Creates/manages tenants. No `tenant_id` in JWT. |
| `TENANT_ADMIN` | Single tenant | Manages users, customers, products, plans, invitations |
| `TENANT_USER` | Single tenant | Read-only access |

**Symbol key used in API table:** 🔴 SA = SUPER_ADMIN only · 🟡 TA = minimum role `TENANT_ADMIN` (`TENANT_ADMIN` or `SUPER_ADMIN`) · 🟢 TU = minimum role `TENANT_USER` (any authenticated tenant user: `TENANT_USER`, `TENANT_ADMIN`, or `SUPER_ADMIN`) · 🔓 = public

---

## 3. Functional Requirements

### 3.1 Authentication
| ID | Requirement |
|---|---|
| FR-001 | Login via email/password returns JWT access + refresh tokens |
| FR-002 | Refresh token rotates on every use |
| FR-003 | Password reset revokes all refresh tokens |
| FR-004 | Logout revokes the active session's refresh token |
| FR-005 | Password reset uses a 6–8 digit OTP (email delivery, 10-min expiry) |
| FR-006 | OTP verification returns a single-use reset token (10-min expiry) |
| FR-007 | New password must meet minimum strength and differ from current |
| FR-008 | Password reset request always returns `200` (no email enumeration) |
| FR-009 | Invited users complete setup via tokenised invite link |
| FR-010 | Invite acceptance requires `acceptTerms: true` and a valid password |
| FR-011 | A public token-validation endpoint returns invitation metadata (email, role, tenant name, expiry) if the token is valid and pending; returns specific error codes for expired, revoked, or accepted tokens |
| FR-012 | The accept-invite page validates the token on load and shows a tailored error screen (expired / revoked / already used / not found) before the user attempts to set a password |

### 3.2 Tenant Management
| ID | Requirement |
|---|---|
| FR-011 | SUPER_ADMIN creates tenants with a unique slug |
| FR-012 | SUPER_ADMIN lists/filters/searches all tenants |
| FR-013 | SUPER_ADMIN updates tenant name, email, timezone |
| FR-014 | SUPER_ADMIN suspends a tenant (blocks all logins) |
| FR-015 | SUPER_ADMIN archives a tenant (permanent, irreversible) |
| FR-016 | SUPER_ADMIN invites first TENANT_ADMIN for a new tenant |

### 3.3 User Management
| ID | Requirement |
|---|---|
| FR-017 | TENANT_ADMIN lists/filters/searches users within their tenant |
| FR-018 | TENANT_ADMIN changes a user's role (`TENANT_ADMIN` ↔ `TENANT_USER`) |
| FR-019 | TENANT_ADMIN disables a user (blocks login, preserves data) |
| FR-020 | TENANT_ADMIN permanently deletes a user record |
| FR-021 | An admin cannot disable or delete their own account |
| FR-022 | Any authenticated user can view their own profile |
| FR-023 | Any authenticated user can change their own password |

### 3.4 Invitations
| ID | Requirement |
|---|---|
| FR-024 | TENANT_ADMIN invites a user by email with an assigned role |
| FR-025 | Invite email must not belong to an existing active user in the tenant |
| FR-026 | Only one pending invitation per email per tenant at a time |
| FR-027 | Invitations expire after 7 days |
| FR-028 | TENANT_ADMIN can revoke a pending invitation |
| FR-029 | Resending an invitation revokes the old one and creates a new one |

### 3.5 Customers
| ID | Requirement |
|---|---|
| FR-030 | TENANT_ADMIN creates, updates, and deletes customers |
| FR-031 | A customer with ≥1 `ACTIVE` payment plans cannot be deleted |
| FR-032 | TENANT_USER can list and view customers |
| FR-033 | Customers support an optional timezone; falls back to tenant timezone |
| FR-034 | TENANT_ADMIN assigns/removes products from a customer |
| FR-035 | A product cannot be assigned to the same customer twice |
| FR-036 | TENANT_USER can list a customer's assigned products |

### 3.6 Products
| ID | Requirement |
|---|---|
| FR-037 | TENANT_ADMIN creates, updates, and deletes products |
| FR-038 | Product names must be unique within a tenant |
| FR-039 | A product assigned to any customer cannot be deleted |
| FR-040 | Products have status `ACTIVE` or `INACTIVE` |

### 3.7 Payment Plans
| ID | Requirement |
|---|---|
| FR-041 | TENANT_ADMIN creates a payment plan with cadence, billing day, amount, currency, grace days, and reminder lead days |
| FR-042 | `next_due_date` is auto-calculated on creation; recalculated when `billingDay` or `cadence` changes |
| FR-043 | TENANT_USER can list and view plans, filtered by customer or tenant-wide |
| FR-044 | Billing schedule changes fire a `PaymentPlanChangedEvent` |
| FR-045 | Plan status transitions follow the permitted state machine (BR-010) |
| FR-046 | Only a `CANCELLED` plan can be deleted |

### 3.8 Dashboard & Analytics
| ID | Requirement |
|---|---|
| FR-053 | Tenant users can view a dashboard with key metrics for their tenant |
| FR-054 | Dashboard shows summary counts: total customers, active/paused/cancelled plans, total products |
| FR-055 | Dashboard shows revenue overview: total billed amount grouped by currency across all `ACTIVE` plans |
| FR-056 | Dashboard shows reminder statistics: total sent, failed, and skipped for a configurable date range (default last 30 days) |
| FR-057 | Dashboard shows upcoming reminders due within the next 7 days |
| FR-058 | Dashboard shows overdue payments: `ACTIVE` plans where `next_due_date + grace_days < today` |
| FR-059 | Dashboard shows recent activity: last 10 audit log entries for the tenant (visible to `TENANT_ADMIN` only) |
| FR-060 | SUPER_ADMIN can view a platform-wide dashboard with tenant counts by status, total users, and aggregate reminder delivery stats |
| FR-061 | All dashboard queries respect tenant isolation; no cross-tenant data leakage |
| FR-062 | Dashboard data is computed on-demand from existing tables (no materialized views in v1) |

### 3.9 Reminders
| ID | Requirement |
|---|---|
| FR-047 | Daily batch job sends reminders where `next_due_date − reminder_days_before ≤ today` |
| FR-048 | Batch checks `reminder_history` to prevent duplicate sends |
| FR-049 | All delivery attempts logged as `SENT`, `FAILED`, or `SKIPPED` |
| FR-050 | TENANT_ADMIN can manually trigger the reminder batch for their tenant |
| FR-051 | TENANT_USER can view reminder history, filterable by customer, plan, status, date range |
| FR-052 | Reminder emails render dates in the customer's local timezone |

---

## 4. Non-Functional Requirements

| ID | Requirement |
|---|---|
| NFR-001 | List endpoints paginated; default 20, max 100 per page |
| NFR-002 | All queries filter by `tenant_id` — no cross-tenant data leakage |
| NFR-003 | Reminder batch runs exclusively (DB-level lock or single scheduler instance) |
| NFR-004 | Passwords hashed with BCrypt (work factor ≥ 12); tokens/OTPs stored as hashes only |
| NFR-005 | Sensitive fields (passwords, tokens) excluded from all logs |
| NFR-006 | Failed reminder sends retry up to 3 times before marking `FAILED` |
| NFR-007 | No secrets in source code — all config via environment variables or Vault |
| NFR-008 | API documented via OpenAPI 3.0 |

---

## 5. Architecture

### Components

**Core Monolith**

| Component | Responsibility |
|---|---|
| AuthService | JWT generation, refresh token rotation, OTP lifecycle |
| TenantService | Tenant CRUD, status transitions |
| UserService | User CRUD, role enforcement, soft-delete |
| InvitationService | Invitation creation, token hashing, expiry, resend |
| CustomerService | Customer CRUD, soft-delete guard |
| ProductService | Product CRUD, assignment guard |
| CustomerProductService | CustomerProduct CRUD, state machine, cadence scheduling |
| ReminderService | Batch execution, dedup check, notification dispatch, result logging |
| DashboardService | Aggregates metrics from customers, plans, reminders, and audit logs |
| AuditService | AuditLog writes for every state-changing operation |
| NotificationClient | HTTP client wrapper for the notification service |

**Notification Service**

| Component | Responsibility |
|---|---|
| EmailController | Accepts send requests from the monolith |
| TemplateEngine | Thymeleaf — renders HTML email templates from `src/main/resources/templates/email/` |
| SendGridClient | Delivers email via SendGrid HTTP API |

### Reminder Batch Flow

```
Scheduler (09:00 UTC)
  → ReminderService.sendRemindersBatch()
    → Load all ACTIVE tenants
    → For each tenant:
        → Resolve tenant timezone
        → Query CustomerProducts where due_date − reminder_days_before ≤ today
        → For each record:
            → Check reminder_history (dedup)
            → POST /internal/notify/reminder → Notification Service
            → Insert reminder_history (SENT / FAILED)
```

### Internal Notification API

| Method | Path | Description |
|---|---|---|
| `POST` | `/internal/notify/reminder` | Send payment reminder email |
| `POST` | `/internal/notify/invitation` | Send invitation email |

---

## 6. Data Model

### Entities

#### Tenant
| Field | Type | Constraints |
|---|---|---|
| `id` | BIGINT | PK |
| `name` | VARCHAR(100) | NOT NULL |
| `slug` | VARCHAR(50) | NOT NULL, UNIQUE |
| `company_email` | VARCHAR(255) | NOT NULL |
| `timezone` | VARCHAR(100) | NOT NULL, IANA |
| `status` | ENUM | `ACTIVE`, `SUSPENDED`, `ARCHIVED` |
| `created_at` / `updated_at` | TIMESTAMPTZ | NOT NULL |
| `archived_at` / `deleted_at` | TIMESTAMPTZ | NULLABLE |
| `deleted_by` | BIGINT | FK → users |

#### User
| Field | Type | Constraints |
|---|---|---|
| `id` | BIGINT | PK |
| `tenant_id` | BIGINT | FK → tenants, NULLABLE (SUPER_ADMIN) |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE |
| `password_hash` | VARCHAR | NOT NULL |
| `role` | ENUM | `SUPER_ADMIN`, `TENANT_ADMIN`, `TENANT_USER` |
| `status` | ENUM | `PENDING`, `ACTIVE`, `DISABLED`, `DELETED` |
| `email_verified_at` / `last_login_at` | TIMESTAMPTZ | NULLABLE |
| `created_at` / `updated_at` | TIMESTAMPTZ | NOT NULL |
| `created_by` / `deleted_by` | BIGINT | FK → users, NULLABLE |
| `deleted_at` | TIMESTAMPTZ | NULLABLE |

#### UserInvitation
| Field | Type | Constraints |
|---|---|---|
| `id` | BIGINT | PK |
| `tenant_id` | BIGINT | FK → tenants |
| `email` | VARCHAR(255) | NOT NULL |
| `role` | ENUM | `TENANT_ADMIN`, `TENANT_USER` |
| `invited_by_user_id` | BIGINT | FK → users |
| `token_hash` | VARCHAR | NOT NULL, UNIQUE |
| `status` | ENUM | `PENDING`, `ACCEPTED`, `EXPIRED`, `REVOKED` |
| `expires_at` / `accepted_at` / `created_at` | TIMESTAMPTZ | NOT NULL / NULLABLE / NOT NULL |

#### Customer
| Field | Type | Constraints |
|---|---|---|
| `id` | BIGINT | PK |
| `tenant_id` | BIGINT | FK → tenants, NOT NULL |
| `name` | VARCHAR(200) | NOT NULL |
| `email` | VARCHAR(255) | NOT NULL |
| `phone` | VARCHAR(20) | NULLABLE, E.164 |
| `timezone` | VARCHAR(100) | NULLABLE; falls back to tenant timezone |
| `notes` | TEXT | NULLABLE, max 1000 chars |
| `status` | ENUM | `ACTIVE`, `DELETED` |
| `created_at` / `updated_at` | TIMESTAMPTZ | NOT NULL |
| `created_by` / `deleted_by` | BIGINT | FK → users |
| `deleted_at` | TIMESTAMPTZ | NULLABLE |

#### Product
| Field | Type | Constraints |
|---|---|---|
| `id` | BIGINT | PK |
| `tenant_id` | BIGINT | FK → tenants |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE within tenant |
| `description` | VARCHAR(500) | NULLABLE |
| `status` | ENUM | `ACTIVE`, `INACTIVE`, `DELETED` |
| `created_at` / `updated_at` | TIMESTAMPTZ | NOT NULL |
| `created_by` / `deleted_by` | BIGINT | FK → users, NULLABLE |
| `deleted_at` | TIMESTAMPTZ | NULLABLE |

#### CustomerProduct
| Field | Type | Constraints |
|---|---|---|
| `id` | BIGINT | PK |
| `tenant_id` | BIGINT | FK → tenants, NOT NULL |
| `customer_id` | BIGINT | FK → customers, NOT NULL |
| `product_id` | BIGINT | FK → products, NOT NULL |
| `amount` | NUMERIC(14,2) | NOT NULL, positive |
| `currency` | VARCHAR(3) | NOT NULL, ISO 4217 |
| `cadence` | ENUM | `WEEKLY`, `MONTHLY`, `QUARTERLY`, `ANNUALLY` |
| `billing_day` | INTEGER | 1–28 (monthly) or 1–7 (weekly) |
| `reminder_days_before` | INTEGER | 1–30, default 3 |
| `status` | ENUM | `ACTIVE`, `PAUSED`, `CANCELLED` |
| `assigned_at` / `created_at` / `updated_at` | TIMESTAMPTZ | NOT NULL |
| `created_by` / `updated_by` / `deleted_by` | BIGINT | FK → users |
| `deleted_at` | TIMESTAMPTZ | NULLABLE |

#### ReminderHistory
| Field | Type | Constraints |
|---|---|---|
| `id` | BIGINT | PK |
| `tenant_id` | BIGINT | FK → tenants |
| `customer_id` | BIGINT | FK → customers |
| `customer_product_id` | BIGINT | FK → customer_products |
| `target_due_date` | DATE | NOT NULL |
| `scheduled_local_date` | DATE | NOT NULL |
| `status` | ENUM | `SENT`, `FAILED`, `SKIPPED` |
| `sent_at` | TIMESTAMPTZ | NULLABLE |
| `provider_message_id` | VARCHAR | NULLABLE |
| `failure_reason` | TEXT | NULLABLE |
| `created_at` | TIMESTAMPTZ | NOT NULL |

#### UserSession
| Field | Type | Constraints |
|---|---|---|
| `id` | BIGINT | PK |
| `user_id` | BIGINT | FK → users |
| `refresh_token_hash` | VARCHAR | NOT NULL, UNIQUE |
| `issued_at` / `expires_at` | TIMESTAMPTZ | NOT NULL |
| `revoked_at` | TIMESTAMPTZ | NULLABLE |
| `replaced_by_session_id` | BIGINT | FK → user_sessions, NULLABLE |
| `ip_address` | VARCHAR(45) | NULLABLE |
| `user_agent` | TEXT | NULLABLE |

#### AuditLog
| Field | Type | Constraints |
|---|---|---|
| `id` | BIGINT | PK |
| `tenant_id` | BIGINT | FK → tenants, NULLABLE (SUPER_ADMIN global actions) |
| `actor_id` | BIGINT | FK → users, NOT NULL |
| `action` | ENUM | `CREATE`, `UPDATE`, `DELETE`, `STATUS_CHANGE`, `LOGIN`, `LOGOUT`, `LOGIN_FAILED` |
| `resource_type` | VARCHAR(50) | NOT NULL |
| `resource_id` | BIGINT | NULLABLE |
| `old_value` / `new_value` | JSONB | NULLABLE — before/after snapshots |
| `user_agent` | TEXT | NULLABLE |
| `created_at` | TIMESTAMPTZ | NOT NULL |

### Relationships
```
Tenant ──< User
Tenant ──< Customer
Tenant ──< Product
Tenant ──< UserInvitation
Tenant ──< AuditLog
Customer >──< Product  (via customer_products)
CustomerProduct ──< ReminderHistory
User ──< UserSession
User ──< AuditLog (actor_id)
```

### Indexes
```sql
-- Tenant isolation
CREATE INDEX idx_customers_tenant_status         ON customers(tenant_id, status);
CREATE INDEX idx_products_tenant_status          ON products(tenant_id, status);
CREATE INDEX idx_customer_products_tenant_status ON customer_products(tenant_id, status);
CREATE INDEX idx_users_tenant_status             ON users(tenant_id, status);
CREATE INDEX idx_invitations_tenant_status       ON user_invitations(tenant_id, status);

-- Auth
CREATE INDEX idx_sessions_user_active ON user_sessions(user_id, revoked_at, expires_at);
CREATE INDEX idx_otp_user_expiry      ON password_reset_otps(user_id, expires_at);

-- Reminder batch dedup
CREATE INDEX idx_reminder_cp_date ON reminder_history(customer_product_id, scheduled_local_date);

-- Audit
CREATE INDEX idx_audit_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_actor_created  ON audit_logs(actor_id, created_at DESC);
CREATE INDEX idx_audit_resource       ON audit_logs(resource_type, resource_id, created_at DESC);
```

### Data Lifecycle

| Entity | Deletion behaviour |
|---|---|
| Tenant | Soft: `status → ARCHIVED`, `deleted_at` set |
| User | Soft: `status → DELETED`, `deleted_at` set |
| Customer | Soft: `status → DELETED`; blocked if active plans exist |
| Product | Soft: `status → DELETED`; blocked if assigned |
| CustomerProduct | Soft: `status → CANCELLED`, `deleted_at` set |
| ReminderHistory | Never deleted — permanent audit record |
| AuditLog | Immutable — no modify or delete via API |
| UserSession | Soft: `revoked_at` set on logout |

---

## 7. API Specification

**Base URL:** `https://api.app.com/api/v1`

**Auth header:** `Authorization: Bearer <access_token>` (all non-public endpoints)

**Conventions:** JSON · ISO 8601 UTC timestamps · numeric IDs · decimal strings for money · `PATCH` for partial updates

**Pagination params:** `page` (default 1) · `size` (default 20, max 100) · `sort` · `dir`

**Role inheritance for this section:** the `Role` column indicates the minimum required role. `TU` endpoints are accessible by `TENANT_USER`, `TENANT_ADMIN`, and `SUPER_ADMIN`. `TA` endpoints are accessible by `TENANT_ADMIN` and `SUPER_ADMIN`. `SA` endpoints are accessible only by `SUPER_ADMIN`.

```json
{ "data": [...], "pagination": { "page": 1, "size": 20, "total": 143, "totalPages": 8 } }
```

### Endpoint Index

| Method | Path | Minimum Role | Description |
|---|---|---|---|
| `POST` | `/auth/login` | 🔓 | Login |
| `POST` | `/auth/refresh` | 🔓 | Refresh access token |
| `POST` | `/auth/logout` | 🟢 TU | Logout |
| `GET`  | `/auth/invite/validate` | 🔓 | Validate invitation token; returns email, role, tenant name |
| `POST` | `/auth/accept-invite` | 🔓 | Accept invitation |
| `GET` | `/me` | 🟢 TU | Own profile |
| `POST` | `/tenants` | 🔴 SA | Create tenant |
| `GET` | `/tenants` | 🔴 SA | List tenants |
| `GET` | `/tenants/{tenantId}` | 🔴 SA | Get tenant |
| `PATCH` | `/tenants/{tenantId}` | 🔴 SA | Update tenant |
| `POST` | `/tenants/{tenantId}/suspend` | 🔴 SA | Suspend tenant |
| `POST` | `/tenants/{tenantId}/archive` | 🔴 SA | Archive tenant |
| `POST` | `/tenants/{tenantId}/invite-admin` | 🔴 SA | Invite first tenant admin |
| `POST` | `/tenants/{tenantId}/invite-user` | 🟡 TA, 🟢 TU | Invite tenant user |
| `GET` | `/tenants/{tenantId}/users` |  🟡 TA, 🟢 TU | List users |
| `GET` | `/tenants/{tenantId}/users/{userId}` |  🟡 TA, 🟢 TU| Get user |
| `PATCH` | `/tenants/{tenantId}/users/{userId}` | 🟡 TA | Update user role |
| `POST` | `/tenants/{tenantId}/users/{userId}/disable` | 🟡 TA | Disable user |
| `DELETE` | `/tenants/{tenantId}/users/{userId}` | 🟡 TA | Delete user |
| `POST` | `/tenants/{tenantId}/invitations` | 🟡 TA | Invite user |
| `GET` | `/tenants/{tenantId}/invitations` | 🟡 TA | List invitations |
| `POST` | `/tenants/{tenantId}/invitations/{id}/revoke` | 🟡 TA | Revoke invitation |
| `POST` | `/tenants/{tenantId}/invitations/{id}/resend` | 🟡 TA | Resend invitation |
| `POST` | `/tenants/{tenantId}/customers` | 🟡 TA | Create customer |
| `GET` | `/tenants/{tenantId}/customers` | 🟢 TU | List customers |
| `GET` | `/tenants/{tenantId}/customers/{customerId}` | 🟢 TU | Get customer |
| `PATCH` | `/tenants/{tenantId}/customers/{customerId}` | 🟡 TA | Update customer |
| `DELETE` | `/tenants/{tenantId}/customers/{customerId}` | 🟡 TA | Delete customer |
| `POST` | `/tenants/{tenantId}/products` | 🟡 TA | Create product |
| `GET` | `/tenants/{tenantId}/products` | 🟢 TU | List products |
| `GET` | `/tenants/{tenantId}/products/{productId}` | 🟢 TU | Get product |
| `PATCH` | `/tenants/{tenantId}/products/{productId}` | 🟡 TA | Update product |
| `DELETE` | `/tenants/{tenantId}/products/{productId}` | 🟡 TA | Delete product |
| `POST` | `/tenants/{tenantId}/customers/{customerId}/products` | 🟡 TA | Assign product to customer |
| `GET` | `/tenants/{tenantId}/customers/{customerId}/products` | 🟢 TU | List customer products |
| `GET` | `/tenants/{tenantId}/customers/{customerId}/products/{cpId}` | 🟢 TU | Get customer product |
| `PATCH` | `/tenants/{tenantId}/customers/{customerId}/products/{cpId}` | 🟡 TA | Update customer product |
| `PATCH` | `/tenants/{tenantId}/customers/{customerId}/products/{cpId}/status` | 🟡 TA | Change plan status |
| `DELETE` | `/tenants/{tenantId}/customers/{customerId}/products/{cpId}` | 🟡 TA | Delete customer product |
| `GET` | `/tenants/{tenantId}/customer-products` | 🟢 TU | List all plans tenant-wide |
| `GET` | `/tenants/{tenantId}/reminders` | 🟢 TU | List reminder history |
| `GET` | `/tenants/{tenantId}/reminders/{reminderId}` | 🟢 TU | Get reminder record |
| `POST` | `/tenants/{tenantId}/reminders/trigger` | 🟡 TA | Manually trigger reminder batch |
| `GET` | `/tenants/{tenantId}/audit-logs` | 🟡 TA | List audit log entries |
| `GET` | `/tenants/{tenantId}/audit-logs/{auditLogId}` | 🟡 TA | Get audit log entry |
| `GET` | `/tenants/{tenantId}/dashboard/summary` | 🟢 TU | Dashboard summary counts |
| `GET` | `/tenants/{tenantId}/dashboard/revenue` | 🟢 TU | Revenue overview by currency |
| `GET` | `/tenants/{tenantId}/dashboard/reminders` | 🟢 TU | Reminder delivery stats |
| `GET` | `/tenants/{tenantId}/dashboard/upcoming-reminders` | 🟢 TU | Upcoming reminders (next 7 days) |
| `GET` | `/tenants/{tenantId}/dashboard/overdue` | 🟢 TU | Overdue payment plans |
| `GET` | `/tenants/{tenantId}/dashboard/recent-activity` | 🟡 TA | Recent audit log activity |
| `GET` | `/admin/dashboard/summary` | 🔴 SA | Platform-wide dashboard |

---

---
# Revised endpoints
# Endpoint Index (Revised RBAC)

> **Role philosophy:**
> - 🔴 **SA (Super Admin)** — platform-level control only
> - 🟡 **TA (Tenant Admin)** — governance & high-stakes decisions only (user lifecycle, invitations, audit)
> - 🟢 **TU (Tenant User)** — all day-to-day operations (customers, products, plans, reminders)

---

## Auth

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/auth/login` | 🔓 | Login |
| `POST` | `/auth/refresh` | 🔓 | Refresh access token |
| `POST` | `/auth/logout` | 🟢 TU | Logout |
| `GET`  | `/auth/invite/validate` | 🔓 | Validate invitation token; returns email, role, tenant name |
| `POST` | `/auth/accept-invite` | 🔓 | Accept invitation |

---

## Identity

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/me` | 🟢 TU | Own profile |

---

## Tenant Management

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/tenants` | 🔴 SA | Create tenant |
| `GET` | `/tenants` | 🔴 SA | List tenants |
| `GET` | `/tenants/{tenantId}` | 🔴 SA | Get tenant |
| `PATCH` | `/tenants/{tenantId}` | 🔴 SA | Update tenant |
| `POST` | `/tenants/{tenantId}/suspend` | 🔴 SA | Suspend tenant |
| `POST` | `/tenants/{tenantId}/archive` | 🔴 SA | Archive tenant |

---

## Users & Invitations

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/tenants/{tenantId}/invite-admin` | 🔴 SA | Invite first tenant admin |
| `POST` | `/tenants/{tenantId}/invite-user` | 🟡 TA | Invite tenant user |
| `GET` | `/tenants/{tenantId}/users` | 🟢 TU | List users |
| `GET` | `/tenants/{tenantId}/users/{userId}` | 🟢 TU | Get user |
| `PATCH` | `/tenants/{tenantId}/users/{userId}` | 🟡 TA | Update user role |
| `POST` | `/tenants/{tenantId}/users/{userId}/disable` | 🟡 TA | Disable user |
| `DELETE` | `/tenants/{tenantId}/users/{userId}` | 🟡 TA | Delete user |
| `POST` | `/tenants/{tenantId}/invitations` | 🟡 TA | Invite user |
| `GET` | `/tenants/{tenantId}/invitations` | 🟡 TA | List invitations |
| `POST` | `/tenants/{tenantId}/invitations/{id}/revoke` | 🟡 TA | Revoke invitation |
| `POST` | `/tenants/{tenantId}/invitations/{id}/resend` | 🟡 TA | Resend invitation |

---

## Customers

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/tenants/{tenantId}/customers` | 🟢 TU | Create customer |
| `GET` | `/tenants/{tenantId}/customers` | 🟢 TU | List customers |
| `GET` | `/tenants/{tenantId}/customers/{customerId}` | 🟢 TU | Get customer |
| `PATCH` | `/tenants/{tenantId}/customers/{customerId}` | 🟢 TU | Update customer |
| `DELETE` | `/tenants/{tenantId}/customers/{customerId}` | 🟡 TA | Delete customer |

---

## Products

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/tenants/{tenantId}/products` | 🟢 TU | Create product |
| `GET` | `/tenants/{tenantId}/products` | 🟢 TU | List products |
| `GET` | `/tenants/{tenantId}/products/{productId}` | 🟢 TU | Get product |
| `PATCH` | `/tenants/{tenantId}/products/{productId}` | 🟢 TU | Update product |
| `DELETE` | `/tenants/{tenantId}/products/{productId}` | 🟡 TA | Delete product |

---

## Customer Products (Plans)

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/tenants/{tenantId}/customers/{customerId}/products` | 🟢 TU | Assign product to customer |
| `GET` | `/tenants/{tenantId}/customers/{customerId}/products` | 🟢 TU | List customer products |
| `GET` | `/tenants/{tenantId}/customers/{customerId}/products/{cpId}` | 🟢 TU | Get customer product |
| `PATCH` | `/tenants/{tenantId}/customers/{customerId}/products/{cpId}` | 🟢 TU | Update customer product |
| `PATCH` | `/tenants/{tenantId}/customers/{customerId}/products/{cpId}/status` | 🟢 TU | Change plan status |
| `DELETE` | `/tenants/{tenantId}/customers/{customerId}/products/{cpId}` | 🟡 TA | Delete customer product |
| `GET` | `/tenants/{tenantId}/customer-products` | 🟢 TU | List all plans tenant-wide |

---

## Reminders

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/tenants/{tenantId}/reminders` | 🟢 TU | List reminder history |
| `GET` | `/tenants/{tenantId}/reminders/{reminderId}` | 🟢 TU | Get reminder record |
| `POST` | `/tenants/{tenantId}/reminders/trigger` | 🟢 TU | Manually trigger reminder batch |

---

## Dashboard & Analytics

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/tenants/{tenantId}/dashboard/summary` | 🟢 TU | Summary counts (customers, plans by status, products) |
| `GET` | `/tenants/{tenantId}/dashboard/revenue` | 🟢 TU | Revenue overview grouped by currency |
| `GET` | `/tenants/{tenantId}/dashboard/reminders` | 🟢 TU | Reminder delivery stats (sent/failed/skipped) for a date range |
| `GET` | `/tenants/{tenantId}/dashboard/upcoming-reminders` | 🟢 TU | Reminders due within the next 7 days |
| `GET` | `/tenants/{tenantId}/dashboard/overdue` | 🟢 TU | Overdue payment plans |
| `GET` | `/tenants/{tenantId}/dashboard/recent-activity` | 🟡 TA | Last 10 audit log entries |
| `GET` | `/admin/dashboard/summary` | 🔴 SA | Platform-wide summary (tenants by status, total users, reminder stats) |

---

## Audit Logs

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/tenants/{tenantId}/audit-logs` | 🟡 TA | List audit log entries |
| `GET` | `/tenants/{tenantId}/audit-logs/{auditLogId}` | 🟡 TA | Get audit log entry |

---

## 8. Business Rules

### Authentication
| ID | Rule |
|---|---|
| BR-001 | `DISABLED` or `DELETED` users cannot log in → `403 ACCOUNT_DISABLED` |
| BR-002 | Users of a `SUSPENDED` or `ARCHIVED` tenant cannot log in → `403 TENANT_SUSPENDED` |
| BR-003 | `PENDING` users (invite not accepted) cannot log in → `403 EMAIL_NOT_VERIFIED` |
| BR-004 | OTPs valid 10 min; max 5 attempts → `429 OTP_MAX_ATTEMPTS` |
| BR-005 | Reset token (post-OTP) is single-use, valid 10 min |
| BR-006 | New password must differ from current → `400 SAME_PASSWORD` |
| BR-007 | Password reset revokes all existing refresh tokens |
| BR-008 | Refresh token rotation is atomic: old session revoked, new session created |

### Tenants
| ID | Rule |
|---|---|
| BR-009 | Slugs: globally unique, lowercase, alphanumeric + hyphens, 2–50 chars |
| BR-010 | Status transitions: `ACTIVE → SUSPENDED`, `ACTIVE → ARCHIVED`, `SUSPENDED → ACTIVE`. Archival is irreversible. |
| BR-011 | Suspended tenant data is preserved; only login is blocked |

### Users & Invitations
| ID | Rule |
|---|---|
| BR-012 | TENANT_ADMIN cannot disable or delete their own account |
| BR-013 | Only one `PENDING` invitation per email per tenant |
| BR-014 | Invitations expire after 7 days; expired invitations cannot be accepted |
| BR-015 | Resend revokes the current invitation and creates a fresh one |
| BR-016 | Only `PENDING` invitations can be revoked |
| BR-017 | `acceptTerms: true` is mandatory on invite acceptance |
| BR-018 | Soft-deleting a user sets `status = DELETED`; record is retained |
| BR-019a | Token validation: unknown token hash → `404 INVALID_TOKEN` |
| BR-019b | Token validation: `ACCEPTED` status → `400 INVITATION_ACCEPTED` |
| BR-019c | Token validation: `REVOKED` status → `400 INVITATION_REVOKED` |
| BR-019d | Token validation: `EXPIRED` status or `expires_at` in the past → `400 INVITATION_EXPIRED` |
| BR-019e | Token validation: `PENDING` and not expired → `200` with email, role, tenant name, expiry |

### Customers & Products
| ID | Rule |
|---|---|
| BR-019 | Customer with ≥1 `ACTIVE` plan cannot be deleted → `409 CUSTOMER_HAS_ACTIVE_PLANS` |
| BR-020 | Deleting a customer cascades soft-delete to all CustomerProduct records; ReminderHistory is retained |
| BR-021 | Same product cannot be assigned to the same customer twice → `409 PRODUCT_ALREADY_ASSIGNED` |
| BR-022 | Product with any non-cancelled CustomerProduct cannot be deleted → `409 PRODUCT_IN_USE` |
| BR-023 | Product names must be unique within a tenant |

### Payment Plans
| ID | Rule |
|---|---|
| BR-024 | Status machine: `ACTIVE ↔ PAUSED`, `ACTIVE → CANCELLED`, `PAUSED → CANCELLED`. `CANCELLED` is terminal. |
| BR-025 | Only `CANCELLED` plans can be deleted → `409 PLAN_MUST_BE_CANCELLED` |
| BR-026 | Changing `cadence` or `amount` fires `CustomerProductChangedEvent` |
| BR-027 | Amounts stored and transmitted as decimal strings (e.g. `"1500.00"`) |

### Reminders
| ID | Rule |
|---|---|
| BR-028 | Reminders only sent for `ACTIVE` plans; `PAUSED` and `CANCELLED` are skipped |
| BR-029 | Dedup check on `(customer_product_id, scheduled_local_date)` before every send |
| BR-030 | Scheduled date = next payment date − `reminder_days_before`, resolved in customer timezone |
| BR-031 | If `customer.timezone` is null, tenant timezone is used |
| BR-032 | Failed sends retry up to 3× with exponential backoff; final failure → `status = FAILED` |

### Dashboard
| ID | Rule |
|---|---|
| BR-033 | Dashboard summary counts only non-deleted entities (`status ≠ DELETED`) |
| BR-034 | Revenue overview sums `amount` from `ACTIVE` CustomerProduct records, grouped by `currency` |
| BR-035 | Reminder stats accept optional `from` and `to` query params (ISO 8601 dates); default range is last 30 days |
| BR-036 | Upcoming reminders returns plans where `next_due_date − reminder_days_before` falls within the next 7 calendar days (tenant timezone) |
| BR-037 | Overdue plans = `ACTIVE` plans where `next_due_date + grace_days < today` (tenant timezone) |
| BR-038 | Recent activity returns the 10 most recent AuditLog entries for the tenant, sorted by `created_at DESC` |
| BR-039 | Platform dashboard (SUPER_ADMIN) aggregates across all tenants; counts are real-time, not cached |
| BR-040 | All dashboard endpoints are read-only and do not emit AuditLog entries |

### Audit
| ID | Rule |
|---|---|
| BR-041 | Every state-changing operation emits an AuditLog with actor, action, resource, and before/after snapshots |
| BR-042 | Login (success/failure) and logout events are logged |
| BR-043 | AuditLog records are immutable — no modify or delete via API |
| BR-044 | Record deletions are themselves logged as `action = DELETE` |

---

## 9. Security

### Tokens
| ID | Requirement |
|---|---|
| SEC-001 | Access tokens: HS256 JWT, 15-min TTL |
| SEC-002 | Refresh tokens: HS256 JWT, 7-day TTL, stored server-side as a hash |
| SEC-003 | Invitation tokens (32 raw bytes) and OTPs stored as BCrypt hashes; raw values never persisted |
| SEC-004 | JWT secret loaded from env var `JWT_SECRET` |

**Access token payload:** `sub`, `email`, `role`, `tenant_id`, `iat`, `exp`  
**Refresh token payload:** `sub`, `session_id`, `iat`, `exp`

### Authorization
| ID | Requirement |
|---|---|
| SEC-005 | All non-public endpoints pass a Spring Security role check before controller execution |
| SEC-006 | JWT `tenant_id` must match path `{tenantId}`; SUPER_ADMINs are exempt |
| SEC-007 | Repository methods always filter by `tenantId` from the JWT — never from the request body |

### Data & Transport
| ID | Requirement |
|---|---|
| SEC-008 | All data in transit uses TLS 1.2+ |
| SEC-009 | Passwords hashed with BCrypt (work factor ≥ 12) |
| SEC-010 | Database stores only hashes — no raw tokens, OTPs, or passwords |
| SEC-011 | Sensitive fields excluded from all log output |
| SEC-016 | Every tenant-scoped query includes a `tenant_id` filter enforced at the repository layer |
| SEC-017 | Cross-tenant resource access returns `403 TENANT_MISMATCH` |
| SEC-018 | SUPER_ADMIN operations on tenant data are logged with the acting user's identity |

### Rate Limiting *(Phase 2)*
| Endpoint | Limit |
|---|---|
| `POST /auth/login` | 10 req/min per IP |
| `POST /auth/password-reset/request` | 5 req/min per IP |

---

## 10. Error Handling

### Standard Error Shape
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "path":"/api/v1/asdf",
    "message": "Human-readable description.",
    "details": [{ "field": "email", "issue": "Invalid email format" }],
    "requestId": "req-abc123",
    "timestamp": "2024-01-20T10:30:00Z"
  }
}
```
`details` only present on `400 VALIDATION_ERROR`.

### Error Code Reference
| HTTP | Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request field validation failed |
| 400 | `INVALID_CURRENT_PASSWORD` | Current password is wrong |
| 400 | `SAME_PASSWORD` | New password matches existing |
| 400 | `TERMS_NOT_ACCEPTED` | `acceptTerms` must be `true` |
| 400 | `INVALID_TOKEN` | Token not found |
| 400 | `INVITATION_ACCEPTED` | Invitation token has already been used |
| 400 | `INVITATION_REVOKED` | Invitation was revoked by an admin |
| 400 | `INVITATION_EXPIRED` | Invitation has passed its expiry date |
| 400 | `INVALID_STATUS_TRANSITION` | Status change not permitted |
| 401 | `UNAUTHORIZED` | Missing or invalid auth header |
| 401 | `TOKEN_EXPIRED` | Access token expired |
| 401 | `INVALID_CREDENTIALS` | Email or password incorrect |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 403 | `ACCOUNT_DISABLED` | User is disabled |
| 403 | `TENANT_SUSPENDED` | Tenant is suspended |
| 403 | `TENANT_MISMATCH` | JWT `tenant_id` ≠ path `tenantId` |
| 403 | `EMAIL_NOT_VERIFIED` | Invite not yet accepted |
| 404 | `NOT_FOUND` | Resource doesn't exist or isn't visible to this tenant |
| 409 | `SLUG_CONFLICT` | Tenant slug already taken |
| 409 | `USER_ALREADY_EXISTS` | Email already active in tenant |
| 409 | `INVITATION_ALREADY_PENDING` | Active invitation exists for this email |
| 409 | `INVITATION_NOT_PENDING` | Invitation cannot be revoked in current state |
| 409 | `CANNOT_DISABLE_SELF` | Admin cannot disable own account |
| 409 | `CANNOT_DELETE_SELF` | Admin cannot delete own account |
| 409 | `CUSTOMER_HAS_ACTIVE_PLANS` | Customer has active plans |
| 409 | `PRODUCT_IN_USE` | Product is assigned to customers |
| 409 | `PRODUCT_ALREADY_ASSIGNED` | Product already assigned to this customer |
| 409 | `PLAN_MUST_BE_CANCELLED` | Plan must be cancelled before deletion |
| 429 | `OTP_MAX_ATTEMPTS` | Too many failed OTP attempts |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

### Idempotency & Edge Cases
| Scenario | Behaviour |
|---|---|
| `POST /auth/logout` called twice | Safe — already-revoked sessions return 204 |
| Suspend already-suspended tenant | `409 INVALID_STATUS_TRANSITION` |
| Reminder batch duplicate send | Dedup on `(customer_product_id, scheduled_local_date)` |
| `POST /auth/password-reset/request` called twice | Always 200; new OTP issued, old invalidated |
| Invitation accepted after expiry | `400 INVALID_TOKEN` |
| Refresh token reused after rotation | `401 INVALID_TOKEN` |
| `billingDay` set to 29–31 | Rejected; capped at 28 |
| Customer has no timezone | Falls back to tenant timezone |
| Reminder batch fails for one tenant | Error logged; batch continues for remaining tenants |

---

## 11. Deployment & Config

### Environments
| Environment | Purpose | Database |
|---|---|---|
| `dev` | Local development | Local PostgreSQL (Docker) |
| `prod` | Production | Managed PostgreSQL (cloud, HA) |

### Environment Variables
| Variable | Description |
|---|---|
| `DB_URL` | PostgreSQL JDBC connection string |
| `DB_USER` / `DB_PASSWORD` | Database credentials |
| `JWT_SECRET` | JWT signing key (min 256-bit) |
| `JWT_ACCESS_EXPIRY` | Access token TTL in seconds (default: 900) |
| `JWT_REFRESH_EXPIRY` | Refresh token TTL in seconds (default: 604800) |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_USER` / `MAIL_PASSWORD` | SMTP config |
| `APP_URL` | Public URL (used in email links) |
| `SPRING_PROFILES_ACTIVE` | `dev` or `prod` |

### Docker
```dockerfile
FROM eclipse-temurin:21-jre-alpine
COPY target/app.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

### Scheduled Jobs
```java
@Scheduled(cron = "0 0 9 * * *")   // 09:00 UTC daily
public void sendDailyReminders() { reminderService.sendRemindersBatch(); }

@Scheduled(cron = "0 */5 * * * *") // Every 5 minutes
public void cleanupExpiredOtps() { authService.deleteExpiredOtps(); }
```

---

## 12. Observability

### Log Levels
| Level | Usage |
|---|---|
| `INFO` | Normal operation (plan updated, reminder sent, user logged in) |
| `WARN` | Recoverable issues (retry attempt, near-expiry token) |
| `ERROR` | Failures requiring attention (reminder failed after retries, DB exception) |
| `DEBUG` | Verbose diagnostics — disabled in production |

**Structured log format:** JSON with `timestamp`, `level`, `logger`, `message`, `planId`, `tenantId`, `userId`, `requestId`, `duration_ms`. Sensitive fields never logged.

### Health Endpoints
```
GET /actuator/health       → overall (used by load balancer)
GET /actuator/health/db    → database connectivity
GET /actuator/health/mail  → SMTP connectivity
GET /actuator/info         → build version and metadata
```

### Log Retention
| Stage | Retention |
|---|---|
| Hot storage | 30 days |
| Cold archive | 1 year, then purged |

---

## 13. Assumptions & Constraints

### Stack
| Layer | Technology |
|---|---|
| Backend | Spring Boot 3.x (Java 21) |
| Database | PostgreSQL with Spring Data JPA / Hibernate |
| Notifications | SMTP only — no SMS, push, or webhooks in v1 |
| Frontend | Separate Next.js app |
| Auth | JWT only |

### Known Limitations
- `billingDay` capped at 28; last-day-of-month semantics not supported in v1
- Reminder batch runs at a fixed UTC time; per-tenant send times not supported in v1
- No self-service tenant signup — SUPER_ADMIN only
- No payment gateway integration; reminder delivery only

### Out of Scope (v1)
Payment gateway integration · SMS/push notifications · OAuth2/SSO/SAML · self-service signup · white-labelling · in-app notifications · mobile apps

---

## 14. Acceptance Criteria

### Authentication
- [ ] Valid credentials → access + refresh tokens
- [ ] Expired access token → `401 TOKEN_EXPIRED`
- [ ] Disabled user → `403 ACCOUNT_DISABLED`
- [ ] Suspended tenant user → `403 TENANT_SUSPENDED`
- [ ] OTP expires after 10 min
- [ ] 5 failed OTP attempts → `429 OTP_MAX_ATTEMPTS`
- [ ] Password reset revokes all active refresh tokens
- [ ] Current password cannot be reused on reset

### Tenant Management
- [ ] SUPER_ADMIN creates tenant with unique slug
- [ ] Duplicate slug → `409 SLUG_CONFLICT`
- [ ] Suspending a tenant blocks all tenant user logins
- [ ] Archived tenant cannot be re-activated

### Users & Invitations
- [ ] Invite email sent within 60 seconds
- [ ] Invitation link expires after 7 days
- [ ] Duplicate invite to same email → rejected
- [ ] Admin cannot disable or delete own account
- [ ] Resending invitation invalidates previous token
- [ ] Valid pending token → `200` with email, role, tenant name
- [ ] Already-accepted token → `400 INVITATION_ACCEPTED`
- [ ] Revoked token → `400 INVITATION_REVOKED`
- [ ] Expired token → `400 INVITATION_EXPIRED`
- [ ] Unknown token → `404 INVALID_TOKEN`
- [ ] Accept-invite page shows spinner while validating
- [ ] Accept-invite page shows workspace name and role when token is valid
- [ ] Accept-invite page shows specific error screen for each invalid state without rendering the password form

### Customers & Products
- [ ] Customer with active plan cannot be deleted
- [ ] Assigned product cannot be deleted
- [ ] Same product cannot be assigned to same customer twice
- [ ] Customer timezone falls back to tenant timezone correctly

### Payment Plans
- [ ] Plan created with correct `next_due_date`
- [ ] Changing `billingDay` recalculates `next_due_date`
- [ ] Valid status transitions succeed; invalid → `409 INVALID_STATUS_TRANSITION`
- [ ] `CANCELLED` plan cannot transition further
- [ ] Only `CANCELLED` plans can be deleted

### Reminders
- [ ] Batch sends reminders where `next_due_date − reminder_days_before ≤ today`
- [ ] No duplicate reminder for same plan on same date
- [ ] Failed send retried up to 3× before recording `FAILED`
- [ ] Reminder history queryable by customer, plan, status, date range
- [ ] Manual trigger returns `202 Accepted`

### Dashboard & Analytics
- [ ] Summary endpoint returns correct counts for customers, plans (by status), and products
- [ ] Revenue endpoint returns total amounts grouped by currency for `ACTIVE` plans only
- [ ] Reminder stats endpoint returns sent/failed/skipped counts for the requested date range
- [ ] Reminder stats default to last 30 days when no date range is provided
- [ ] Upcoming reminders endpoint returns plans due within the next 7 days
- [ ] Overdue endpoint returns only `ACTIVE` plans past their due date + grace days
- [ ] Recent activity endpoint returns last 10 audit log entries (TENANT_ADMIN only)
- [ ] SUPER_ADMIN platform dashboard returns tenant counts by status and aggregate stats
- [ ] Dashboard endpoints do not leak cross-tenant data
- [ ] Dashboard endpoints do not create audit log entries
- [ ] Deleted entities are excluded from all dashboard counts

### Security
- [ ] JWT `tenant_id` ≠ path `tenantId` → `403 TENANT_MISMATCH`
- [ ] Tokens, OTPs, passwords never stored in plaintext
- [ ] Sensitive fields absent from logs

### Performance
- [ ] API P95 < 200ms under baseline load
- [ ] List endpoints paginated; no full-table scans

### Testing
- [ ] Unit test coverage ≥ 80% for all service-layer classes
- [ ] Integration tests: login, invite + accept, create plan, trigger reminder, status transitions
- [ ] E2E: create tenant → invite admin → invite user → create customer → create plan → trigger reminder → verify `reminder_history`
