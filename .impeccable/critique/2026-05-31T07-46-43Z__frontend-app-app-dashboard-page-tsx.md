---
target: frontend/app/(app)/dashboard/page.tsx
total_score: 26
p0_count: 0
p1_count: 3
timestamp: 2026-05-31T07-46-43Z
slug: frontend-app-app-dashboard-page-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Skeleton loading correct; failed reminders not surfaced as actionable state |
| 2 | Match System / Real World | 3 | Clear language; "Skipped" not explained; upcoming description misleads |
| 3 | User Control and Freedom | 3 | Read-only surface; View all links provide escape; no inline action on failures |
| 4 | Consistency and Standards | 3 | Tokens correct; px-4 in activity rows vs px-6 everywhere else |
| 5 | Error Prevention | 3 | No destructive actions; conditional rendering of admin CTA correct |
| 6 | Recognition Rather Than Recall | 3 | All data visible; semantic icons help |
| 7 | Flexibility and Efficiency | 2 | No refresh shortcut, no keyboard shortcut, no inline action on failures |
| 8 | Aesthetic and Minimalist Design | 3 | Clean; "Total" row in reminder stats redundant; ScrollText unused import |
| 9 | Error Recovery | 2 | if (!d) return null renders blank on API failure; no retry |
| 10 | Help and Documentation | 1 | No contextual help; "Skipped" undefined; no tooltip on any stat |
| **Total** | | **26/40** | **Acceptable** |

## Anti-Patterns Verdict
Detector: clean. LLM: "GOOD AFTERNOON" all-caps eyebrow is the main AI tell. Bell icon still present in reminder stats card after removal request. No gradient text, no nested cards, no glassmorphism.

## Priority Issues
- [P1] All-caps greeting eyebrow in PageHeader — absolute ban in DESIGN.md
- [P1] Bell icon survives in dashboard reminder stats card (line 330) after removal request
- [P1] Failed reminders have no call to action — red number in card with no link to fix it
- [P2] "Total" row in reminder stats is redundant (Sent+Failed+Skipped=Total)
- [P2] "No active plans yet." empty state in Revenue card has no CTA
- [P2] if (!d) return null in AdminDashboard renders blank space on API failure

## Minor Observations
- ScrollText imported but unused (line 10)
- px-4 in activity card rows vs px-6 elsewhere
- "Due within the next 7 days" description is misleading — API returns 30/7/1d milestone items
- Skeleton layout doesn't match AdminDashboard structure
