export type OutstandingRow = {
  projectId: string;
  projectName: string;
  clientName: string;
  budgetEur: number;
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
};

export type MaterialBudgetAlert = {
  projectId: string;
  projectName: string;
  clientName: string;
  budgetMaterialsEur: number;
  spentMaterialsEur: number;
};

export type FinanceYtdMonth = { month: string; caEur: number };

export interface FinanceAnalytics {
  caMonthEur: number;
  caPrevMonthEur: number;
  caMonthMomPct: number | null;
  caYtdEur: number;
  companyMarginEur: number;
  companyMarginPct: number;
  totalOutstandingEur: number;
  outstandingRows: OutstandingRow[];
  projectMargins: ProjectMarginRow[];
  ytdByMonth: FinanceYtdMonth[];
  materialAlerts: MaterialBudgetAlert[];
}
