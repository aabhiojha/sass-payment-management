export const CADENCE_LABELS: Record<string, string> = {
  WEEKLY:       "Weekly",
  FORTNIGHT:    "Fortnightly",
  MONTHLY:      "Monthly",
  QUARTERLY:    "Quarterly",
  SEMIANNUALLY: "Semiannually",
  ANNUALLY:     "Annually",
};

const CADENCE_COLORS: Record<string, { bg: string; text: string }> = {
  WEEKLY:       { bg: "#fee2e2", text: "#b91c1c" },
  FORTNIGHT:    { bg: "#ffedd5", text: "#c2410c" },
  MONTHLY:      { bg: "#dbeafe", text: "#1d4ed8" },
  QUARTERLY:    { bg: "#ede9fe", text: "#6d28d9" },
  SEMIANNUALLY: { bg: "#ccfbf1", text: "#0f766e" },
  ANNUALLY:     { bg: "#dcfce7", text: "#15803d" },
};

export function cadenceLabel(c: string): string {
  return CADENCE_LABELS[c] ?? c;
}

export function cadenceBadgeStyle(c: string): { backgroundColor: string; color: string } {
  const color = CADENCE_COLORS[c] ?? { bg: "#f3f4f6", text: "#6b7280" };
  return { backgroundColor: color.bg, color: color.text };
}

/** Returns a new date offset from `date` by one billing cycle of `cadence`. */
export function addCadence(date: Date | string, cadence: string): Date {
  const d = new Date(date);
  switch (cadence) {
    case "WEEKLY":       d.setDate(d.getDate() + 7); break;
    case "FORTNIGHT":    d.setDate(d.getDate() + 14); break;
    case "MONTHLY":      d.setMonth(d.getMonth() + 1); break;
    case "QUARTERLY":    d.setMonth(d.getMonth() + 3); break;
    case "SEMIANNUALLY": d.setMonth(d.getMonth() + 6); break;
    case "ANNUALLY":     d.setFullYear(d.getFullYear() + 1); break;
  }
  return d;
}
