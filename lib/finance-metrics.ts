import { amountInCurrencyToEur, parseStoredRevenueCurrency } from "@/lib/utils";

function num(v: number | null | undefined): number {
  return v == null || Number.isNaN(Number(v)) ? 0 : Number(v);
}

/** Encaissements (EUR) sur une période : transactions + lignes `revenues` converties en EUR. */
export function caInRangeEur(
  transactions: { amount: number; payment_date: string }[],
  revenues: { amount: number; date: string; currency: string | null }[],
  start: Date,
  end: Date
): number {
  let s = 0;
  for (const tx of transactions) {
    const d = new Date(tx.payment_date.includes("T") ? tx.payment_date : `${tx.payment_date}T12:00:00`);
    if (!Number.isNaN(d.getTime()) && d >= start && d <= end) s += num(tx.amount);
  }
  for (const r of revenues) {
    const d = new Date(r.date.includes("T") ? r.date : `${r.date}T12:00:00`);
    if (!Number.isNaN(d.getTime()) && d >= start && d <= end) {
      s += amountInCurrencyToEur(num(r.amount), parseStoredRevenueCurrency(r.currency));
    }
  }
  return s;
}
