import type { CashFlowLine } from "@/lib/finance-analytics-types";

export function inCurrentMonth(dateStr: string): boolean {
  const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function inCalendarYear(dateStr: string, year: number): boolean {
  const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`);
  return d.getFullYear() === year;
}

export function cumulativeByDay(lines: CashFlowLine[]): { day: string; cum: number }[] {
  const byDay = new Map<string, number>();
  for (const l of lines) {
    const day = l.date.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + l.amountEur);
  }
  const sorted = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  let cum = 0;
  return sorted.map(([day, v]) => {
    cum += v;
    return { day, cum };
  });
}

/** Barres mensuelles à partir des lignes de trésorerie (toute année). */
export function monthlyCaFromCashFlowLines(
  lines: CashFlowLine[],
  year: number,
  monthLabel: (monthIndex: number) => string
): { month: string; caEur: number }[] {
  const byMonth = new Map<number, number>();
  for (const l of lines) {
    const d = new Date(l.date.includes("T") ? l.date : `${l.date}T12:00:00`);
    if (d.getFullYear() !== year) continue;
    const m = d.getMonth();
    byMonth.set(m, (byMonth.get(m) ?? 0) + l.amountEur);
  }
  return Array.from({ length: 12 }, (_, mi) => ({
    month: monthLabel(mi),
    caEur: byMonth.get(mi) ?? 0,
  }));
}
