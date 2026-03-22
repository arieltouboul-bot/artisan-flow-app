"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project } from "@/types/database";
import { projectRestantDu } from "@/types/database";
import { amountInCurrencyToEur, type RevenueCurrency, parseStoredRevenueCurrency } from "@/lib/utils";
import { expenseLineTtc } from "@/lib/project-finance";

export type DashboardView = "all" | "impayes" | "ca_detail" | "marge";

export interface DashboardStats {
  caMensuel: number;
  caAnnuel: number;
  margeMensuelle: number;
  margeAnnuelle: number;
  tauxMarge: number;
  /** Total des contract_amount (tous projets) */
  totalContract: number;
  /** Total des material_costs (tous projets) */
  totalMaterialCosts: number;
  /** Marge bénéficiaire globale = totalContract - totalMaterialCosts */
  margeTotale: number;
  /** Pourcentage de marge moyen sur l'ensemble des chantiers */
  tauxMargeMoyen: number;
  /** Impayés = somme (contract_amount - amount_collected) pour tous les projets */
  facturesImpayees: number;
  nbProjetsImpayes: number;
  chartData: { month: string; ca: number; cout: number }[];
  /** Totaux bruts des encaissements directs (table revenus), par devise — mois civil en cours */
  revenueMonthByCurrency: Partial<Record<RevenueCurrency, number>>;
  /** Même chose sur l'année sélectionnée */
  revenueYearByCurrency: Partial<Record<RevenueCurrency, number>>;
  /** Encaissements année (EUR équivalent), aligné sur caAnnuel */
  totalEarnedYearEur: number;
  /** Charges : coûts matériaux (projets dont la date de référence tombe dans l'année) + dépenses enregistrées TTC dans l'année */
  totalExpensesYearEur: number;
  /** Bénéfice net = totalEarnedYearEur − totalExpensesYearEur */
  netProfitYearEur: number;
}

const MOIS: string[] = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sept",
  "Oct",
  "Nov",
  "Déc",
];

function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Date du projet pour les calculs : start_date si dispo, sinon created_at */
function getProjectDate(p: Project): Date | null {
  if (p.start_date) {
    const d = new Date(p.start_date);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (p.created_at) {
    const d = new Date(p.created_at);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/** Coerce to number; null/undefined → null for type, 0 used in calculations. */
function toNum(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function mapProjectRow(row: Record<string, unknown>): Project {
  const client = row.client as Record<string, unknown> | null;
  return {
    id: row.id as string,
    name: row.name as string,
    client_id: row.client_id as string,
    client: client
      ? {
          id: client.id as string,
          name: client.name as string,
          email: (client.email as string) ?? null,
          phone: (client.phone as string) ?? null,
          address: (client.address as string) ?? null,
          contract_amount: toNum(client.contract_amount),
          material_costs: toNum(client.material_costs),
          amount_collected: toNum(client.amount_collected),
          created_at: client.created_at as string | undefined,
        }
      : undefined,
    status: (row.status as Project["status"]) ?? "en_preparation",
    address: (row.address as string) ?? null,
    start_date: (row.start_date as string) ?? null,
    end_date: (row.end_date as string) ?? null,
    started_at: (row.started_at as string) ?? null,
    ended_at: (row.ended_at as string) ?? null,
    notes: (row.notes as string) ?? null,
    contract_amount: toNum(row.contract_amount),
    material_costs: toNum(row.material_costs),
    amount_collected: toNum(row.amount_collected),
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

interface TransactionRow {
  project_id: string;
  amount: number;
  payment_date: string;
}

interface RevenueDashboardRow {
  amount: number;
  date: string;
  currency: string | null;
}

interface DashboardExpenseRow {
  amount_ht: number;
  tva_rate: number;
  amount_ttc?: number | null;
  date: string;
  invoice_date?: string | null;
}

/** Gestion des null/undefined : traiter comme 0 pour les totaux. */
function num(v: number | null | undefined): number {
  return v == null || Number.isNaN(Number(v)) ? 0 : Number(v);
}

/** CA par mois : project_transactions + table revenues (colonne date). */
function computeStats(
  projects: Project[],
  transactions: TransactionRow[],
  revenues: RevenueDashboardRow[],
  expenses: DashboardExpenseRow[],
  selectedYear: number
): DashboardStats {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const yearStart = new Date(selectedYear, 0, 1);
  const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59);
  const monthStart = new Date(currentYear, currentMonth, 1);
  const revenueMonthByCurrency: Partial<Record<RevenueCurrency, number>> = {};
  const revenueYearByCurrency: Partial<Record<RevenueCurrency, number>> = {};

  // Frais matériaux : somme de tous les material_costs (null/undefined → 0)
  const totalMaterialCosts = projects.reduce((sum, p) => sum + num(p.material_costs), 0);
  // Total contrats
  const totalContract = projects.reduce((sum, p) => sum + num(p.contract_amount), 0);
  // Marge totale : somme de (contract_amount - material_costs)
  const margeTotale = projects.reduce(
    (sum, p) => sum + (num(p.contract_amount) - num(p.material_costs)),
    0
  );
  // Impayés : somme de (contract_amount - amount_collected), plancher 0
  const facturesImpayees = projects.reduce(
    (sum, p) => sum + Math.max(0, num(p.contract_amount) - num(p.amount_collected)),
    0
  );
  const nbProjetsImpayes = projects.filter(
    (p) => Math.max(0, num(p.contract_amount) - num(p.amount_collected)) > 0
  ).length;

  const tauxMargeMoyen = totalContract > 0 ? Math.round((margeTotale / totalContract) * 100) : 0;

  const byMonth = new Map<string, { ca: number; cout: number }>();
  for (let m = 1; m <= 12; m++) {
    const key = `${selectedYear}-${String(m).padStart(2, "0")}`;
    byMonth.set(key, { ca: 0, cout: 0 });
  }

  let caAnnuel = 0;
  let caMensuel = 0;
  const addCashToMonth = (paymentDateStr: string, amt: number) => {
    const d = new Date(paymentDateStr.includes("T") ? paymentDateStr : `${paymentDateStr}T12:00:00`);
    if (Number.isNaN(d.getTime())) return;
    if (d < yearStart || d > yearEnd) return;
    const key = getMonthKey(d);
    const cell = byMonth.get(key) ?? { ca: 0, cout: 0 };
    cell.ca += amt;
    byMonth.set(key, cell);
    caAnnuel += amt;
    if (selectedYear === currentYear && d >= monthStart) caMensuel += amt;
  };

  for (const tx of transactions) {
    addCashToMonth(tx.payment_date, num(tx.amount as number));
  }

  for (const rev of revenues) {
    const cur = parseStoredRevenueCurrency(rev.currency);
    const eurEq = amountInCurrencyToEur(num(rev.amount), cur);
    addCashToMonth(rev.date, eurEq);

    const d = new Date(rev.date.includes("T") ? rev.date : `${rev.date}T12:00:00`);
    if (!Number.isNaN(d.getTime())) {
      const raw = num(rev.amount);
      if (selectedYear === currentYear && d >= monthStart) {
        revenueMonthByCurrency[cur] = (revenueMonthByCurrency[cur] ?? 0) + raw;
      }
      if (d >= yearStart && d <= yearEnd) {
        revenueYearByCurrency[cur] = (revenueYearByCurrency[cur] ?? 0) + raw;
      }
    }
  }

  let margeAnnuelle = 0;
  let margeMensuelle = 0;
  for (const p of projects) {
    const projectDate = getProjectDate(p);
    const contract = num(p.contract_amount);
    const costs = num(p.material_costs);
    const marge = contract - costs;
    if (projectDate && projectDate >= yearStart && projectDate <= yearEnd) {
      const key = getMonthKey(projectDate);
      const cell = byMonth.get(key) ?? { ca: 0, cout: 0 };
      cell.cout += costs;
      byMonth.set(key, cell);
      margeAnnuelle += marge;
      if (selectedYear === currentYear && projectDate >= monthStart) margeMensuelle += marge;
    }
  }

  const chartData = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const key = `${selectedYear}-${String(m).padStart(2, "0")}`;
    const cell = byMonth.get(key) ?? { ca: 0, cout: 0 };
    return { month: MOIS[i], ca: cell.ca, cout: cell.cout };
  });

  const tauxMarge = caAnnuel > 0 ? Math.round((margeAnnuelle / caAnnuel) * 100) : 0;

  let totalExpensesYear = 0;
  for (const p of projects) {
    const projectDate = getProjectDate(p);
    if (projectDate && projectDate >= yearStart && projectDate <= yearEnd) {
      totalExpensesYear += num(p.material_costs);
    }
  }
  for (const ex of expenses) {
    const dStr = ex.invoice_date || ex.date;
    if (!dStr) continue;
    const d = new Date(dStr.includes("T") ? dStr : `${dStr}T12:00:00`);
    if (Number.isNaN(d.getTime()) || d < yearStart || d > yearEnd) continue;
    totalExpensesYear += expenseLineTtc(ex);
  }
  const netProfitYear = caAnnuel - totalExpensesYear;

  return {
    caMensuel,
    caAnnuel,
    margeMensuelle,
    margeAnnuelle,
    tauxMarge,
    totalContract,
    totalMaterialCosts,
    margeTotale,
    tauxMargeMoyen,
    facturesImpayees,
    nbProjetsImpayes,
    chartData,
    revenueMonthByCurrency,
    revenueYearByCurrency,
    totalEarnedYearEur: caAnnuel,
    totalExpensesYearEur: totalExpensesYear,
    netProfitYearEur: netProfitYear,
  };
}

export function useDashboardStats(selectedYear?: number) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [revenues, setRevenues] = useState<RevenueDashboardRow[]>([]);
  const [expenseRows, setExpenseRows] = useState<DashboardExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const year = selectedYear ?? new Date().getFullYear();

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase non configuré");
      setLoading(false);
      return;
    }
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setProjects([]);
      setTransactions([]);
      setRevenues([]);
      setExpenseRows([]);
      setLoading(false);
      return;
    }
    const { data: projectsData, error: fetchError } = await supabase
      .from("projects")
      .select("id, name, client_id, status, address, start_date, end_date, notes, contract_amount, material_costs, amount_collected, created_at, updated_at, user_id, started_at, ended_at, client:clients(id, name, email, phone, address, contract_amount, material_costs, amount_collected, created_at)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
      setProjects([]);
      setTransactions([]);
      setRevenues([]);
      setExpenseRows([]);
      setLoading(false);
      return;
    }
    const raw = (projectsData ?? []) as Record<string, unknown>[];
    const projectList = raw.map(mapProjectRow);
    setProjects(projectList);

    const projectIds = projectList.map((p) => p.id);
    if (projectIds.length === 0) {
      setTransactions([]);
    } else {
      const { data: txData } = await supabase
        .from("project_transactions")
        .select("project_id, amount, payment_date")
        .in("project_id", projectIds);
      setTransactions(((txData ?? []) as TransactionRow[]));
    }

    const { data: revData, error: revErr } = await supabase
      .from("revenues")
      .select("amount, date, currency")
      .eq("user_id", user.id);
    if (revErr) {
      console.error("[dashboard] revenues fetch:", revErr.message, revErr);
      setRevenues([]);
    } else {
      setRevenues((revData ?? []) as RevenueDashboardRow[]);
    }

    const { data: expData, error: expErr } = await supabase
      .from("expenses")
      .select("amount_ht, tva_rate, amount_ttc, date, invoice_date")
      .eq("user_id", user.id);
    if (expErr) {
      console.error("[dashboard] expenses fetch:", expErr.message, expErr);
      setExpenseRows([]);
    } else {
      setExpenseRows((expData ?? []) as DashboardExpenseRow[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel("dashboard-stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "project_transactions" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "revenues" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => {
        fetchData();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Rafraîchissement quand la page redevient visible (onglet ou mobile)
  useEffect(() => {
    const onVisibility = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchData();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [fetchData]);

  const stats = computeStats(projects, transactions, revenues, expenseRows, year);
  const projectsImpayes = projects.filter((p) => projectRestantDu(p) > 0);

  return {
    stats,
    projects,
    projectsImpayes,
    loading,
    error,
    refetch: fetchData,
  };
}
