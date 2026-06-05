# Product

## Register

product

## Users

Finance and billing administrators at small SaaS companies. Non-technical users who
manage customer subscriptions, assign products and pricing plans, and track renewal
reminders. They work in the tool daily: creating customers, reviewing plan status,
checking what's about to expire, and ensuring emails went out. They understand billing
concepts but are not developers; the interface must surface the right information
without asking them to interpret raw data.

## Product Purpose

PayNext is a multi-tenant billing and subscription management platform. It lets
operators track customers, products, and recurring plans across tenant accounts, and
automatically sends renewal reminders at 30, 7, and 1 day before plan expiry. It
replaces spreadsheets and ad-hoc email chains with a structured, auditable system.

Success looks like: a billing admin can open the app, see which plans are expiring this
week, confirm reminders were sent, spot any failures, and take action on individual
plans, all within one session without needing to ask a developer.

## Brand Personality

Precise, Trusted, Clean.

The interface projects confidence through accuracy and restraint. Every label says
exactly what it means. Status is always visible. Nothing decorative competes with data.
The tone is that of a good accountant: reliable, unhurried, never loud.

## Anti-references

- Generic SaaS cream/indigo: off-white backgrounds, rounded card grids, indigo primary
  buttons. This aesthetic signals "AI-generated template" to anyone in the space and
  undercuts trust. PayNext should feel considered and specific, not assembled.
- Legacy accounting software (QuickBooks era): high-density, low-contrast, cluttered
  with chrome. Functional but exhausting.
- Bright consumer fintech (Revolut, Wise): gradient heroes, bold color blocks, playful
  copy. Wrong register for a B2B back-office tool.

## Design Principles

1. **Status is always legible.** Plan health, reminder state, and customer status must
   be readable at a glance, without hunting through detail pages. Surface exceptions
   (failed reminders, cancelled plans, overdue renewals) where users will naturally
   look.

2. **Clarity over decoration.** Every visual element earns its place by reducing
   cognitive load, not by looking polished. Tables and lists over card grids. Labels
   that say what they mean. No decorative icons.

3. **Density matched to task.** List pages are dense and scannable. Detail pages
   breathe. Dialogs are focused. Match information density to what the user is doing,
   not to a single global density preference.

4. **Errors and edge cases are first-class.** Billing mistakes are expensive. Failed
   reminders, overdue plans, and missing data must be clearly flagged, not hidden in
   muted text or buried in detail views.

5. **Audit confidence.** Users need to trust that what they see reflects the true
   system state. Show when things were last updated, who made changes, and what the
   system did automatically (auto-cancelled plans, sent reminders). Visibility builds
   trust.

## Accessibility & Inclusion

WCAG 2.1 AA. Keyboard navigation for all interactive elements. Sufficient contrast for
body and muted text. Reduced-motion alternatives for all animations. Screen reader
support for table data and status indicators.
