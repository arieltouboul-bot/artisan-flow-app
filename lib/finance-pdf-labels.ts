/**
 * Libellés PDF export finance — langue app (profil / UI) ou navigateur en secours.
 */
import type { Language } from "@/lib/translations";

export type FinancePdfLocale = "fr" | "en";

export function pdfLocaleFromNavigator(): FinancePdfLocale {
  if (typeof navigator === "undefined") return "en";
  const primary = (navigator.language || (navigator.languages && navigator.languages[0]) || "en").toLowerCase();
  if (primary.startsWith("fr")) return "fr";
  if (navigator.languages?.some((l) => l.toLowerCase().startsWith("fr"))) return "fr";
  return "en";
}

/** Préfère la langue de l’interface (paramètres utilisateur). */
export function pdfLocaleFromAppLanguage(language: Language): FinancePdfLocale {
  return language === "fr" ? "fr" : "en";
}

export type FinancePdfLabels = {
  title: string;
  generatedOn: string;
  amountsEurNote: string;
  kpis: string;
  cashMonth: string;
  prevMonth: string;
  mom: string;
  momNa: string;
  ytd: string;
  totalRevenue: string;
  totalCosts: string;
  netMargin: string;
  totalOutstanding: string;
  tableOutstandingHead: [string, string, string, string];
  tableMarginHead: [string, string, string, string];
  footerNote: string;
};

const FR: FinancePdfLabels = {
  title: "Synthèse financière (comptabilité)",
  generatedOn: "Généré le",
  amountsEurNote: "montants en équivalent EUR sauf mention",
  kpis: "Indicateurs",
  cashMonth: "Encaissements (mois en cours)",
  prevMonth: "Mois précédent (référence)",
  mom: "vs mois préc.",
  momNa: "n/d",
  ytd: "Cumul année (1er janv. — aujourd’hui)",
  totalRevenue: "Total revenus (équivalent EUR)",
  totalCosts: "Total charges chantier (matériaux saisis + lignes dépenses)",
  netMargin: "Marge nette (revenus − charges)",
  totalOutstanding: "Total impayés (contrat − encaissements)",
  tableOutstandingHead: ["Client / projet", "Budget EUR", "Encaissé (total) EUR", "Solde EUR"],
  tableMarginHead: ["Marge par projet", "CA EUR", "Marge EUR", "Marge %"],
  footerNote:
    "Impayé = contrat moins encaissements (transactions + lignes revenus, EUR). Marge = revenus et dépenses matériel/outillage enregistrés.",
};

const EN: FinancePdfLabels = {
  title: "Financial summary (accounting)",
  generatedOn: "Generated on",
  amountsEurNote: "amounts in EUR equivalent unless noted",
  kpis: "KPIs",
  cashMonth: "Cash collected (current month)",
  prevMonth: "Previous month (reference)",
  mom: "vs previous month",
  momNa: "n/a",
  ytd: "Year-to-date (1 Jan — today)",
  totalRevenue: "Total revenue (EUR equivalent)",
  totalCosts: "Total project costs (materials field + expense lines)",
  netMargin: "Net margin (revenue − costs)",
  totalOutstanding: "Total outstanding (contract − collected)",
  tableOutstandingHead: ["Client / project", "Budget EUR", "Paid (total) EUR", "Balance EUR"],
  tableMarginHead: ["Project margin", "Revenue EUR", "Margin EUR", "Margin %"],
  footerNote:
    "Outstanding = contract minus collections (transactions + revenue rows, EUR equivalent). Margin uses recorded revenues and material/tool expenses.",
};

export function getFinancePdfLabels(locale: FinancePdfLocale): FinancePdfLabels {
  return locale === "fr" ? FR : EN;
}
