# Database Schema Short

PayNest is a multi-tenant SaaS payment/subscription app. Tenants own users, customers, products, product plans, customer subscriptions, reminders, and invitations. Super admins also manage platform plans assigned to tenants.

## Main Tables

| Table | Purpose |
|---|---|
| `tenants` | Tenant companies/accounts. |
| `users` | Login users with tenant, role, and status. |
| `user_sessions` | Refresh-token sessions. |
| `user_invitations` | Invite tokens for tenant admins/users. |
| `audit_logs` | Actor/action/resource change history. |
| `products` | Tenant product catalog. |
| `product_plans` | Price/billing options for products. |
| `customers` | Tenant customer records. |
| `customer_products` | Customer subscriptions to products/plans. |
| `reminders` | Reminder send/failure records for subscriptions. |
| `platform_plans` | Platform-level SaaS plans. |
| `tenant_platform_plans` | Platform plan assigned to a tenant. |

## Core Relationships

- `tenants` has many `users`, `customers`, `products`, `product_plans`, `customer_products`, `reminders`, `user_invitations`, and `tenant_platform_plans`.
- `products` has many `product_plans`.
- `customers` has many `customer_products`.
- `customer_products` links `customers`, `products`, optional `product_plans`, and many `reminders`.
- `platform_plans` has many `tenant_platform_plans`.
- `users` create audit logs, sessions, invitations, and lifecycle actions such as delete/suspend/archive.

## Functionality

The schema supports tenant isolation, user authentication, invitations, product and plan management, customer subscription tracking, renewal reminders, audit history, and platform-plan billing for tenants.
