import type { Expense, ExpenseCategory } from "@/types/database";
import { amountInCurrencyToEur, parseStoredRevenueCurrency, type RevenueCurrency } from "@/lib/utils";

/** Montant TTC d'une ligne de dépense. */
export function expenseLineTtc(e: {
  amount_ht: number;
  tva_rate: number;
  amount_ttc?: number | null;
}): number {
  if (e.amount_ttc != null && !Number.isNaN(Number(e.amount_ttc))) return Number(e.amount_ttc);
  return Number(e.amount_ht) * (1 + (Number(e.tva_rate) || 0) / 100);
}

/** Matériaux + outillage (location / équipement) — catégories suivies. */
export const MATERIAL_AND_TOOL_CATEGORIES: ExpenseCategory[] = ["achat_materiel", "location"];

export function isMaterialOrToolCategory(c: ExpenseCategory): boolean {
  return MATERIAL_AND_TOOL_CATEGORIES.includes(c);
}

/** Dépenses chantier (hors champ matériaux) : uniquement matériel & location en TTC. */
export function sumMaterialToolExpensesTtc(expenses: Expense[]): number {
  return expenses.filter((e) => isMaterialOrToolCategory(e.category)).reduce((s, e) => s + expenseLineTtc(e), 0);
}

/**
 * Total dépenses pour Profit = matériaux saisis sur le projet + dépenses matériel/location (TTC).
 * Les autres catégories (main d’œuvre, sous-traitance) sont exclues de ce calcul « matériaux + outils ».
 */
export function totalProjectExpensesEur(materialCostsField: number, expenses: Expense[]): number {
  const mc = Number(materialCostsField) || 0;
  return mc + sumMaterialToolExpensesTtc(expenses);
}

/** Somme uniquement des lignes `revenues` (équiv. EUR) — utilisée pour la progression vs budget. */
export function sumRevenueRowsEur(
  revenueRows: { amount: number; currency: RevenueCurrency | string }[]
): number {
  return revenueRows.reduce((s, r) => {
    const cur = parseStoredRevenueCurrency(String(r.currency));
    return s + amountInCurrencyToEur(Number(r.amount) || 0, cur);
  }, 0);
}

export function totalProjectRevenueEur(
  transactions: { amount: number }[],
  revenueRows: { amount: number; currency: RevenueCurrency | string }[]
): number {
  const txSum = transactions.reduce((s, x) => s + (Number(x.amount) || 0), 0);
  return txSum + sumRevenueRowsEur(revenueRows);
}

export function projectNetProfitEur(
  materialCostsField: number,
  expenses: Expense[],
  transactions: { amount: number }[],
  revenueRows: { amount: number; currency: RevenueCurrency | string }[]
): number {
  const rev = totalProjectRevenueEur(transactions, revenueRows);
  const exp = totalProjectExpensesEur(materialCostsField, expenses);
  return rev - exp;
}

/** Écart budget (contrat) vs encaissements totaux (revenus). */
export function balanceDueVsBudget(contractAmount: number, totalRevenueEur: number): number {
  const c = Number(contractAmount) || 0;
  return Math.max(0, c - totalRevenueEur);
}
