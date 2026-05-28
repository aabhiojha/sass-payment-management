# Endpoint Access Matrix

Source of truth: extracted from `@PreAuthorize` annotations and `SecurityConfig` in `backend/core-monolith` (and `backend/notification-service` for internal endpoints).

## Role legend

| Symbol | Role | Notes |
|---|---|---|
| 🔓 | Public | No authentication required (`permitAll`) |
| 🔒 | Authenticated | Any logged-in user (no role restriction) |
| 🟢 TU | `TENANT_USER` (minimum) | Inherits to `TENANT_ADMIN` and `SUPER_ADMIN` |
| 🟡 TA | `TENANT_ADMIN` (minimum) | Inherits to `SUPER_ADMIN` |
| 🔴 SA | `SUPER_ADMIN` only | Platform-level access |

> Tenant-scoped endpoints (`/api/v1/tenants/{tenantId}/...`) also enforce tenant isolation: a `TENANT_ADMIN`/`TENANT_USER` may only act on `{tenantId}` matching their own tenant. `SUPER_ADMIN` bypasses this check.

---

## Global security defaults

Set in `SecurityConfig`:

- `/v3/api-docs/**`, `/swagger-ui/**`, `/swagger-ui.html` → 🔓
- `/api/v1/auth/**` → 🔓
- Everything else → 🔒 (JWT bearer required)

---

## Authentication — `/api/v1/auth`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/v1/auth/login` | 🔓 | Authenticate with email + password; returns access + refresh tokens |
| POST | `/api/v1/auth/refresh` | 🔓 | Exchange a valid refresh token for a new token pair |
| POST | `/api/v1/auth/accept-invite` | 🔓 | Set a password and activate account using an invitation token |
| POST | `/api/v1/auth/logout` | 🔓 | Revoke the provided refresh token |

## Identity — `/api/v1/me`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/v1/me` | 🔒 | Get own profile |

---

## Tenants (platform admin) — `/api/v1/tenants`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/v1/tenants` | 🔴 SA | Create tenant |
| GET | `/api/v1/tenants` | 🔴 SA | List tenants |
| GET | `/api/v1/tenants/{tenantId}` | 🔴 SA | Get tenant |
| PATCH | `/api/v1/tenants/{tenantId}` | 🔴 SA | Update tenant |
| POST | `/api/v1/tenants/{tenantId}/suspend` | 🔴 SA | Suspend tenant |
| POST | `/api/v1/tenants/{tenantId}/archive` | 🔴 SA | Archive tenant |

## Users (per tenant) — `/api/v1/tenants/{tenantId}/users`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/v1/tenants/{tenantId}/users` | 🟢 TU | List tenant users |
| GET | `/api/v1/tenants/{tenantId}/users/{userId}` | 🟢 TU | Get user |
| PATCH | `/api/v1/tenants/{tenantId}/users/{userId}` | 🟡 TA | Update user role |
| POST | `/api/v1/tenants/{tenantId}/users/{userId}/disable` | 🟡 TA | Disable user (blocks login) |
| DELETE | `/api/v1/tenants/{tenantId}/users/{userId}` | 🟡 TA | Delete user |

## Invitations — `/api/v1/tenants/{tenantId}`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/v1/tenants/{tenantId}/invite-admin` | 🔴 SA | Invite a first tenant admin |
| POST | `/api/v1/tenants/{tenantId}/invite-user` | 🟢 TU† | Invite a tenant user |
| GET | `/api/v1/tenants/{tenantId}/invitations` | 🟢 TU | List invitations |
| POST | `/api/v1/tenants/{tenantId}/invitations/{invitationId}/revoke` | 🟢 TU† | Revoke a pending invitation |
| POST | `/api/v1/tenants/{tenantId}/invitations/{invitationId}/resend` | 🟢 TU† | Resend an invitation (rotates the token) |

> **† Note:** these are currently annotated `hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')` in the source, but per TRD FR-024 → FR-029 they should be admin-only. The frontend already restricts the UI accordingly.

## Customers — `/api/v1/tenants/{tenantId}/customers`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/v1/tenants/{tenantId}/customers` | 🟢 TU† | Create customer |
| GET | `/api/v1/tenants/{tenantId}/customers` | 🟢 TU | List customers |
| GET | `/api/v1/tenants/{tenantId}/customers/{customerId}` | 🟢 TU | Get customer |
| PATCH | `/api/v1/tenants/{tenantId}/customers/{customerId}` | 🟢 TU† | Update customer |
| DELETE | `/api/v1/tenants/{tenantId}/customers/{customerId}` | 🟡 TA | Delete customer (blocked if active plans) |

> **† Note:** create/update endpoints currently allow `TENANT_USER`, but per TRD FR-030 (`TENANT_ADMIN creates, updates, and deletes customers`) and FR-032 (`TENANT_USER can list and view customers`), these should be `TENANT_ADMIN` only. The frontend hides the mutating UI for `TENANT_USER`.

## Products — `/api/v1/tenants/{tenantId}/products`

Class-level annotation: `hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')` (applies to every endpoint below unless overridden).

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/v1/tenants/{tenantId}/products` | 🟢 TU† | Create product |
| GET | `/api/v1/tenants/{tenantId}/products` | 🟢 TU | List products (optional `?status=` filter) |
| GET | `/api/v1/tenants/{tenantId}/products/{productId}` | 🟢 TU | Get product |
| PATCH | `/api/v1/tenants/{tenantId}/products/{productId}` | 🟢 TU† | Update product |
| GET | `/api/v1/tenants/{tenantId}/products/{productId}/customers` | 🟢 TU | List customers assigned to a product |
| DELETE | `/api/v1/tenants/{tenantId}/products/{productId}` | 🟢 TU† | Soft delete product |

> **† Note:** create/update/delete are currently TU-accessible at the controller level. Per TRD FR-037 these should be `TENANT_ADMIN` only. The frontend gates the UI to admin.

## Customer Products (plans, per-customer scope) — `/api/v1/tenants/{tenantId}/customers/{customerId}/products`

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `…/customers/{customerId}/products` | 🟢 TU† | Assign a product to the customer |
| GET | `…/customers/{customerId}/products` | 🟢 TU | List the customer's plans |
| GET | `…/customers/{customerId}/products/{cpId}` | 🟢 TU | Get a single plan |
| PATCH | `…/customers/{customerId}/products/{cpId}` | 🟢 TU† | Update plan fields (notes, dates) |
| PATCH | `…/customers/{customerId}/products/{cpId}/status` | 🟢 TU† | Change plan status (ACTIVE/PAUSED/CANCELLED) |
| DELETE | `…/customers/{customerId}/products/{cpId}` | 🟡 TA | Soft-delete plan (only when CANCELLED) |

> **† Note:** per TRD FR-034 / FR-041 / FR-045 the create/update/status-change endpoints should be `TENANT_ADMIN` only. Currently TU-accessible at the controller level; frontend hides the UI.

## Customer Products (tenant-wide list) — `/api/v1/tenants/{tenantId}/customer-products`

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/v1/tenants/{tenantId}/customer-products` | 🟢 TU | List all plans tenant-wide |

## Reminders — `/api/v1/tenants/{tenantId}/reminders`

Class-level annotation: `hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')`.

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/v1/tenants/{tenantId}/reminders` | 🟢 TU | List reminder history |
| GET | `/api/v1/tenants/{tenantId}/reminders/{reminderId}` | 🟢 TU | Get a single reminder record |
| POST | `/api/v1/tenants/{tenantId}/reminders/trigger` | 🟢 TU† | Manually trigger reminder batch |

> **† Note:** per TRD FR-050 `trigger` should be `TENANT_ADMIN` only. Currently TU-accessible at the controller; the frontend hides the trigger button for TU.

## Tenant Dashboard — `/api/v1/tenants/{tenantId}/dashboard`

Class-level annotation: `hasAnyRole('SUPER_ADMIN', 'TENANT_ADMIN', 'TENANT_USER')`.

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/v1/tenants/{tenantId}/dashboard/summary` | 🟢 TU | Customer/product/plan counts |
| GET | `/api/v1/tenants/{tenantId}/dashboard/revenue` | 🟢 TU | Active-plan revenue grouped by currency |
| GET | `/api/v1/tenants/{tenantId}/dashboard/reminders` | 🟢 TU | Reminder delivery stats over a window |
| GET | `/api/v1/tenants/{tenantId}/dashboard/upcoming-reminders` | 🟢 TU | Plans due in the next N days |
| GET | `/api/v1/tenants/{tenantId}/dashboard/overdue` | 🟢 TU | Active plans past their end date |
| GET | `/api/v1/tenants/{tenantId}/dashboard/recent-activity` | 🟡 TA | Last 10 audit log entries |

## Platform Dashboard — `/api/v1/admin/dashboard`

Class-level annotation: `hasRole('SUPER_ADMIN')`.

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/v1/admin/dashboard/summary` | 🔴 SA | Platform-wide tenant + reminder aggregates |

## Audit Logs — `/api/v1/audit-logs`

Class-level annotation: `hasRole('SUPER_ADMIN')`.

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/v1/audit-logs` | 🔴 SA | Filterable platform-wide audit log search |

---

## Internal (Notification Service) — `/internal/notify`

Not exposed publicly — called server-to-server from `core-monolith` to `notification-service`. No `@PreAuthorize` (relies on network isolation).

| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/internal/notify/invitation-user` | internal | Send a user-invitation email |
| POST | `/internal/notify/invitation-admin` | internal | Send an admin-invitation email |
| POST | `/internal/notify/reminder` | internal | Send a payment reminder email |

---

## Discrepancies between controller annotations and the TRD

The following endpoints are annotated more permissively than the TRD requires. The frontend already restricts the corresponding UI, but the backend annotations should be tightened to defence-in-depth:

| Endpoint | Current annotation | TRD-mandated role |
|---|---|---|
| `POST /tenants/{id}/invite-user` | `TU+` | `TA+` (FR-024) |
| `POST /tenants/{id}/invitations/{id}/revoke` | `TU+` | `TA+` (FR-028) |
| `POST /tenants/{id}/invitations/{id}/resend` | `TU+` | `TA+` (FR-029) |
| `POST /tenants/{id}/customers` | `TU+` | `TA+` (FR-030) |
| `PATCH /tenants/{id}/customers/{id}` | `TU+` | `TA+` (FR-030) |
| `POST /tenants/{id}/products` | `TU+` | `TA+` (FR-037) |
| `PATCH /tenants/{id}/products/{id}` | `TU+` | `TA+` (FR-037) |
| `DELETE /tenants/{id}/products/{id}` | `TU+` | `TA+` (FR-037) |
| `POST /tenants/{id}/customers/{id}/products` (assign) | `TU+` | `TA+` (FR-034) |
| `PATCH /tenants/{id}/customers/{id}/products/{id}` | `TU+` | `TA+` (FR-041) |
| `PATCH /tenants/{id}/customers/{id}/products/{id}/status` | `TU+` | `TA+` (FR-045) |
| `POST /tenants/{id}/reminders/trigger` | `TU+` | `TA+` (FR-050) |
