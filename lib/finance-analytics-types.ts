export type OutstandingRow = {
  projectId: string;
  projectName: string;
  clientName: string;
  budgetEur: number;
  /** Encaissements totaux EUR (transactions + lignes revenus). */
  paidEur: number;
  balanceEur: number;
};

export type ProjectMarginRow = {
  projectId: string;
  projectName: string;
  clientName: string;
  revenueEur: number;
  expensesEur: number;
  marginEur: number;
  marginPct: number;
  /** Champ matériaux projet (EUR) — pour recalcul marge en édition. */
  materialCostsFieldEur: number;
  /** Dépenses matériel/outillage issues des lignes `expenses` (TTC EUR). */
  expenseLinesTtcEur: number;
};

export type MaterialBudgetAlert = {
  projectId: string;
  projectName: string;
  clientName: string;
  budgetMaterialsEur: number;
  spentMaterialsEur: number;
};

export type FinanceYtdMonth = { month: string; caEur: number };

/** Ligne pour listes détaillées (modales mois / année). */
export type CashFlowLine = {
  id: string;
  kind: "transaction" | "revenue";
  date: string;
  projectId: string;
  projectName: string;
  amountEur: number;
  amountOriginal: number;
  currency: string;
};

export interface FinanceAnalytics {
  caMonthEur: number;
  caPrevMonthEur: number;
  caMonthMomPct: number | null;
  caYtdEur: number;
  /** Somme des revenus (transactions + lignes revenus), équivalent EUR — entreprise. */
  companyTotalRevenueEur: number;
  /** Somme des « coûts » projet : matériaux saisis + dépenses matériel/location TTC. */
  companyTotalExpensesEur: number;
  companyMarginEur: number;
  companyMarginPct: number;
  totalOutstandingEur: number;
  /** Solde dû (EUR) par projet : contrat − encaissements — aligné carte + listes. */
  projectBalanceDueEurById: Record<string, number>;
  outstandingRows: OutstandingRow[];
  projectMargins: ProjectMarginRow[];
  ytdByMonth: FinanceYtdMonth[];
  materialAlerts: MaterialBudgetAlert[];
  /** Toutes les lignes d’encaissement pour filtres période dans les modales. */
  cashFlowLines: CashFlowLine[];
}
