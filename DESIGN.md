---
name: PayNext
description: Multi-tenant billing and subscription management platform for finance teams.
colors:
  primary: "#4F46E5"
  primary-dark: "#7B72F0"
  accent-tint: "#EEEFFE"
  accent-ink: "#2D21BA"
  background: "#F7F9FD"
  surface: "#FFFFFF"
  surface-raised: "#F1F2F5"
  ink: "#0F172A"
  ink-muted: "#6B7280"
  border: "#E2E4E9"
  destructive: "#E02222"
  success: "#22A866"
  warning: "#F59E0B"
  info: "#0B7ED4"
  dark-background: "#161A22"
  dark-surface: "#1E2330"
  dark-border: "#363C48"
typography:
  display:
    fontFamily: "Space Grotesk, ui-sans-serif, system-ui"
    fontSize: "clamp(1.5rem, 3vw, 2.25rem)"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Space Grotesk, ui-sans-serif, system-ui"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Space Grotesk, ui-sans-serif, system-ui"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
rounded:
  sm: "8px"
  md: "10px"
  lg: "12px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  "2xl": "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "#4338CA"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  input-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  card-default:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  badge-success:
    backgroundColor: "#DCFCE7"
    textColor: "#166534"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-warning:
    backgroundColor: "#FEF9C3"
    textColor: "#854D0E"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-destructive:
    backgroundColor: "#FEE2E2"
    textColor: "#991B1B"
    rounded: "{rounded.full}"
    padding: "2px 8px"
---

# Design System: PayNext

## 1. Overview

**Creative North Star: "The Clean Ledger"**

PayNext is a working surface, not a showpiece. The design system reflects that: every
element earns its place by making data clearer, not by making the interface more
attractive. The ideal screen feels like a well-kept spreadsheet, which is to say, the
structure disappears and the content speaks. There is no decoration without information,
no chrome without function.

The palette is cool, low-saturation, and deliberately understated. Color is used for
status communication (active, paused, failed, cancelled) and for primary actions only.
The indigo primary anchors the eye on interactive elements without competing with data.
Surfaces are white or near-white with subtle blue-gray tint; the dark mode mirrors this
logic: charcoal grounds, not black holes.

This system explicitly rejects the generic SaaS aesthetic: off-white backgrounds,
indigo-primary rounded card grids, and gradient text all belong to the same 2023
template; PayNext should feel chosen, not generated. It also rejects legacy accounting
software density (cluttered, low-contrast, exhausting) and consumer fintech flash
(gradient heroes, playful copy, wrong register for B2B billing).

**Key Characteristics:**
- Data density varies by context: list pages are scannable, detail pages breathe, dialogs are focused.
- Status is always visible; exceptions surface where users naturally look.
- Two-font system: Space Grotesk for structural headings, Inter for body and data.
- Flat at rest, shadow on elevation; structural not decorative.
- Divider lists over nested cards. Tables over card grids.
- Theme-aware: the system maintains the same design logic in light and dark mode.

## 2. Colors: The Working Palette

A restrained palette built around a single indigo accent. Color carries meaning; it is not decoration.

### Primary
- **Control Indigo** (#4F46E5): The one saturated color in the system. Used exclusively for primary
  actions (buttons, active nav indicator, links), focus rings, and interactive state.
  Lightens to #7B72F0 in dark mode. Its rarity is the point.

### Secondary
- **Accent Tint** (#EEEFFE): Very light indigo wash. Used for accent badge backgrounds and
  selected state fills. Never as a body background.
- **Accent Ink** (#2D21BA): Dark indigo. Used for accent-foreground text on accent-tint surfaces.

### Tertiary
- **Destructive Red** (#E02222): Status color for errors, cancelled plans, and destructive actions.
- **Success Green** (#22A866): Status color for active plans, sent reminders, healthy states.
- **Warning Amber** (#F59E0B): Status color for paused states and items needing attention.
- **Info Blue** (#0B7ED4): Informational badges and contextual hints.

### Neutral
- **Working White** (#F7F9FD): Application background. A hair of blue-gray tint, not cream.
- **Surface White** (#FFFFFF): Card and panel background. Sits above the background.
- **Raised Surface** (#F1F2F5): Secondary background, hover states, muted pill backgrounds.
- **Ink Black** (#0F172A): Body text, headings, high-contrast labels.
- **Ink Muted** (#6B7280): Secondary text, timestamps, placeholder copy, table row subtext.
- **Border Gray** (#E2E4E9): Dividers, input strokes, card borders.
- **Dark Ground** (#161A22): Dark mode application background.
- **Dark Surface** (#1E2330): Dark mode card background. 4 lightness points above ground.
- **Dark Border** (#363C48): Dark mode dividers and input strokes.

### Named Rules
**The One Accent Rule.** The indigo primary appears on ≤10% of any given screen at once.
It lives on the active nav pill, the primary button, and focus rings. If something else
wants to be indigo, it should not be: use ink or a status color instead.

**The Status-Only Rule.** Red, green, amber, and blue are reserved for status communication.
Never use them decoratively. A green background that doesn't mean "active" misleads the
user about system state.

## 3. Typography

**Display / Heading Font:** Space Grotesk (with ui-sans-serif, system-ui fallback)
**Body / Data Font:** Inter (with ui-sans-serif, system-ui fallback)

**Character:** Space Grotesk carries structural weight: headings, page titles, key
numbers, and navigation labels. Inter handles everything the user reads in flow: table
cells, form inputs, descriptions, timestamps. The pairing is deliberately contrasted
(geometric with humanist), not matched. Don't substitute one for the other.

### Hierarchy
- **Display** (Space Grotesk, 600, clamp 1.5–2.25rem, lh 1.1, ls -0.02em): Page titles,
  modal headings, hero copy. `text-wrap: balance`. Used once per screen.
- **Headline** (Space Grotesk, 600, 1.25rem, lh 1.25, ls -0.01em): Card section titles,
  sidebar section labels. Used sparingly; avoid stacking two headlines.
- **Title** (Space Grotesk, 600, 1rem, lh 1.4): Column headers in tight toolbars, dialog
  subheadings.
- **Body** (Inter, 400, 0.875rem, lh 1.6): All running text, table cell content,
  descriptions, form helper text. Cap line length at 65–75ch.
- **Label** (Inter, 500, 0.75rem, lh 1.4): Form labels, badge text, table headers
  (lowercase only; no all-caps labels), status chips.

### Named Rules
**The No All-Caps Rule.** Labels and badges stay lowercase. All-caps is reserved for
abbreviations only (e.g. "USD", "NPR", "ACTIVE"). Sentence-case labels read faster in
data-dense views.

**The Single Display Rule.** One Space Grotesk display heading per screen. If a second
heading competes, it should be a title, not a headline. Stacked bold headings signal
poor hierarchy.

## 4. Elevation

PayNext is flat by default. Most surfaces sit at the same visual plane; depth is
communicated through background-color difference (surface on background) and border
strokes, not shadows. Shadows appear only when a surface is elevated in response to an
interaction or as a structural signal.

### Shadow Vocabulary
- **Structural** (`shadow-soft`: `0 1px 0 0 hsl(border/0.6), 0 1px 2px -1px hsl(fg/0.04), 0 4px 12px -4px hsl(fg/0.06)`):
  Used on cards in dense contexts. Very low opacity; barely perceptible. Signals a
  contained boundary without competing with content.
- **Elevated** (`shadow-pop`: `0 1px 0 0 hsl(border/0.6), 0 6px 16px -6px hsl(fg/0.12), 0 16px 32px -12px hsl(fg/0.10)`):
  Used on dialogs, popovers, and the login card. The primary shadow for surfaces that
  float above the page.

### Named Rules
**The Flat-By-Default Rule.** Application surfaces (sidebar, topbar, list cards, table
rows) carry no shadow at rest. `shadow-soft` is the maximum for an inline card.
`shadow-pop` is reserved for modals and login panels. If a third shadow level is needed,
the layout is too complex.

## 5. Components

### Buttons
Confident and direct. Solid fills, clear affordances, no ambiguity.
- **Shape:** Gently curved (12px radius, `rounded-lg`)
- **Primary:** `bg-primary text-white`, `h-10 px-4`. Hover: `bg-primary/90` + lifted shadow.
  Active: `scale-[0.98]`. Loading: Loader2 spinner prefix replaces icon.
- **Outline:** `border border-input bg-background`. Hover: `bg-secondary`. Use for secondary
  actions alongside a primary button.
- **Ghost:** No background or border at rest. Hover: `bg-secondary`. Use for toolbar icon
  actions and inline row actions.
- **Destructive:** `bg-destructive text-white`. Used for irreversible actions only; always
  confirm before acting.
- **Soft:** `bg-accent text-accent-foreground`. Use for non-urgent accent actions.
- **Sizes:** `xs` (28px), `sm` (32px), `default` (40px), `lg` (44px), `icon` (36px square).

### Inputs / Fields
- **Style:** `border border-input bg-background rounded-lg`, `h-10 px-3`. Same radius as buttons.
- **Focus:** `ring-2 ring-ring ring-offset-2`. The indigo ring is the only focus treatment;
  never change focus ring color.
- **Icon prefix:** Left-aligned icon at 12px from edge, `text-muted-foreground`. Input
  gets `pl-9` to compensate. Password toggle icon sits at right edge.
- **Error:** `text-destructive text-xs` below the field. Never inside the field.

### Cards / Containers
- **Corner Style:** `rounded-xl` (16px) for standalone cards; `rounded-lg` (12px) for
  inline containers and dialogs.
- **Background:** `bg-card` (white); never a tinted or colored background.
- **Shadow:** `shadow-soft` for inline cards; `shadow-pop` for modals and the login panel.
- **Border:** `border border-border` on standalone cards. No border on table-embedded sections.
- **Internal structure:** `CardHeader` with `border-b border-border` for toolbar rows.
  Content via `CardContent px-0 pb-0` when using `divide-y divide-border` lists inside.
- **Nested cards are forbidden.** A card inside a card means the design is wrong.

### Tables
The primary display pattern for list data. Not cards.
- **Header:** `TableHead` at `text-xs text-muted-foreground` with `font-medium`.
- **Row hover:** `TableRow hover:bg-secondary/40` (built into shadcn base).
- **Cell density:** `px-4 py-3` default. Action columns right-aligned.
- **Status badges** in their own column, never mixed with text content.
- **Mobile fallback:** `divide-y divide-border` list cards, not a scrolling table.

### Status Badges
- **Shape:** `rounded-full`, `px-2 py-0.5 text-xs font-medium`.
- **Roles:** Success green (ACTIVE, SENT), Warning amber (PAUSED), Destructive red
  (CANCELLED, FAILED, DELETED), Neutral (INACTIVE, PENDING).
- **Never** use color as the only signal; always include the text label.

### Navigation
- **Sidebar:** `64px` wide at desktop, `hidden md:flex`. Nav items: `rounded-lg` hover
  bg, `text-muted-foreground` default, `text-foreground` hover, `text-primary` active.
- **Active indicator:** 2px `bg-primary` vertical pill, absolutely positioned at left
  edge of the active item, centered vertically. Not a left-border stripe.
- **Mobile:** Sheet drawer, opens via hamburger in topbar. Closes on route change.
- **Topbar:** Sticky, `h-16`, `backdrop-blur-md bg-background/80`. Tenant picker at left
  (superadmin only). Theme toggle + profile dropdown at right.

### Divider Lists
The preferred pattern for key-value detail views (customer detail, profile, product info).
- `divide-y divide-border` on the container.
- Each row: `flex items-baseline justify-between px-6 py-3`.
- Label: `text-xs text-muted-foreground w-24 shrink-0`.
- Value: `text-sm` right-aligned.
- No border on the container itself; the parent card provides the boundary.

## 6. Do's and Don'ts

### Do:
- **Do** use `divide-y divide-border` lists for key-value detail views. They read faster
  than nested cards and scale better on mobile.
- **Do** put status (ACTIVE, PAUSED, CANCELLED, SENT, FAILED) in a dedicated badge column.
  Never embed status in a text string like "Plan is active".
- **Do** use the sidebar active indicator: 2px `bg-primary` left pill on the active nav item.
  Not a full-row highlight, not a left-border stripe wider than 1px.
- **Do** surface failure states prominently. Failed reminders and cancelled plans should
  be in the visible list, not hidden behind a filter the user must know to apply.
- **Do** match density to the task: toolbar rows use `h-8 text-xs` controls; page-level
  actions use `h-10`.
- **Do** reduce motion: every `animate-fade-in` animation needs a
  `@media (prefers-reduced-motion: reduce)` that drops it to an instant appearance.
- **Do** use Space Grotesk for structural headings and Inter for everything the user reads.
  Never swap them.

### Don't:
- **Don't** use a cream, sand, or warm-tinted body background. The background is #F7F9FD
  (cool blue-gray). Warm-neutral backgrounds signal generic AI-generated SaaS templates,
  which is exactly what PayNext should not look like.
- **Don't** use gradient text (`background-clip: text` with a gradient). Decorative and
  meaningless. Use a single solid color; vary weight or size for emphasis.
- **Don't** build identical card grids (icon + heading + body text, repeated). This is the
  SaaS landing-page template reflex. Use tables for list data; use divider lists for details.
- **Don't** put a `border-left` wider than 1px as a colored accent stripe on cards or list
  items. Use a full border, a background tint, or the active nav pill pattern instead.
- **Don't** use color decoratively. Red means failed or destructive. Green means active or
  success. Amber means paused or attention. Blue means informational. Color out of these
  roles misleads users about system state.
- **Don't** stack two bold Space Grotesk headings. If a second element competes, it should
  be a body-size title, not a headline.
- **Don't** use all-caps for labels or badge text in sentences. Reserve uppercase for
  abbreviations (USD, NPR, ACTIVE as a badge value is the exception; "Annual plan" as a
  label is not).
- **Don't** nest cards. A `Card` inside a `Card` means the layout is wrong. Flatten with
  divider lists or section headers.
- **Don't** use `shadow-pop` on inline elements. It belongs on dialogs and the login panel.
  Inline cards get `shadow-soft` or no shadow.
- **Don't** use the indigo primary on more than ~10% of any given screen. Status colors
  (success, warning, destructive) are not substitutes; they carry meaning.
