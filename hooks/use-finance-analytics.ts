"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Expense } from "@/types/database";
import type {
  CashFlowLine,
  FinanceAnalytics,
  FinanceYtdMonth,
  MaterialBudgetAlert,
  OutstandingRow,
  ProjectMarginRow,
} from "@/lib/finance-analytics-types";

export type {
  CashFlowLine,
  FinanceAnalytics,
  FinanceYtdMonth,
  MaterialBudgetAlert,
  OutstandingRow,
  ProjectMarginRow,
} from "@/lib/finance-analytics-types";

import { caInRangeEur } from "@/lib/finance-metrics";
import {
  projectNetProfitEur,
  sumMaterialToolExpensesTtc,
  totalProjectExpensesEur,
  totalProjectRevenueEur,
} from "@/lib/project-finance";
import { mapProjectRow } from "@/hooks/use-projects";
import { amountInCurrencyToEur, parseStoredRevenueCurrency } from "@/lib/utils";

function num(v: number | null | undefined): number {
  return v == null || Number.isNaN(Number(v)) ? 0 : Number(v);
}

function emptyAnalytics(): FinanceAnalytics {
  return {
    caMonthEur: 0,
    caPrevMonthEur: 0,
    caMonthMomPct: null,
    caYtdEur: 0,
    companyTotalRevenueEur: 0,
    companyTotalExpensesEur: 0,
    companyMarginEur: 0,
    companyMarginPct: 0,
    totalOutstandingEur: 0,
    outstandingRows: [],
    projectMargins: [],
    ytdByMonth: [],
    materialAlerts: [],
    cashFlowLines: [],
  };
}

export function useFinanceAnalytics() {
  const [data, setData] = useState<FinanceAnalytics>(emptyAnalytics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase non configuré");
      setLoading(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setData(emptyAnalytics());
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const { data: projData, error: pErr } = await supabase
        .from("projects")
        .select("*, client:clients(id, name, email, phone, address, contract_amount, material_costs, amount_collected, created_at)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (pErr) throw new Error(pErr.message);
      const projects = ((projData ?? []) as Record<string, unknown>[]).map(mapProjectRow);

      const projectIds = projects.map((p) => p.id);
      const tx: { project_id: string; amount: number; payment_date: string }[] = [];
      const txRowsFull: { id: string; project_id: string; amount: number; payment_date: string }[] = [];
      if (projectIds.length) {
        const { data: txData } = await supabase
          .from("project_transactions")
          .select("id, project_id, amount, payment_date")
          .in("project_id", projectIds);
        for (const row of txData ?? []) {
          const r = row as { id: string; project_id: string; amount: number; payment_date: string };
          tx.push({ project_id: r.project_id, amount: Number(r.amount), payment_date: r.payment_date });
          txRowsFull.push(r);
        }
      }

      const { data: revData } = await supabase
        .from("revenues")
        .select("id, project_id, amount, date, currency")
        .eq("user_id", user.id);
      const revenues = (revData ?? []) as {
        id: string;
        project_id: string;
        amount: number;
        date: string;
        currency: string | null;
      }[];

      const { data: expData } = await supabase
        .from("expenses")
        .select("id, project_id, user_id, description, amount_ht, tva_rate, category, date, amount_ttc")
        .eq("user_id", user.id);
      const allExpensesRaw = (expData ?? []) as Record<string, unknown>[];
      const mapExpense = (row: Record<string, unknown>): Expense => ({
        id: row.id as string,
        project_id: row.project_id as string,
        user_id: user.id,
        description: (row.description as string) ?? "",
        amount_ht: Number(row.amount_ht ?? 0),
        tva_rate: Number(row.tva_rate ?? 20),
        category: row.category as Expense["category"],
        date: row.date as string,
        amount_ttc: row.amount_ttc != null ? Number(row.amount_ttc) : undefined,
      });
      const expensesByProject = new Map<string, Expense[]>();
      for (const row of allExpensesRaw) {
        const e = mapExpense(row);
        if (!e.project_id) continue;
        const list = expensesByProject.get(e.project_id) ?? [];
        list.push(e);
        expensesByProject.set(e.project_id, list);
      }

      const revByProject = new Map<string, { amount: number; currency: string }[]>();
      for (const r of revenues) {
        const list = revByProject.get(r.project_id) ?? [];
        list.push({ amount: Number(r.amount), currency: r.currency ?? "EUR" });
        revByProject.set(r.project_id, list);
      }

      const txByProject = new Map<string, { amount: number }[]>();
      for (const t of tx) {
        const list = txByProject.get(t.project_id) ?? [];
        list.push({ amount: Number(t.amount) });
        txByProject.set(t.project_id, list);
      }

      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();

      const startMonth = new Date(y, m, 1, 0, 0, 0, 0);
      const endMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);
      const startPrev = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const endPrev = new Date(y, m, 0, 23, 59, 59, 999);

      const caMonthEur = caInRangeEur(tx, revenues, startMonth, endMonth);
      const caPrevMonthEur = caInRangeEur(tx, revenues, startPrev, endPrev);
      let caMonthMomPct: number | null = null;
      if (caPrevMonthEur > 1e-6) {
        caMonthMomPct = ((caMonthEur - caPrevMonthEur) / caPrevMonthEur) * 100;
      } else if (caMonthEur > 0) {
        caMonthMomPct = 100;
      }

      const ytdStart = new Date(y, 0, 1, 0, 0, 0, 0);
      const endToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      const caYtdEur = caInRangeEur(tx, revenues, ytdStart, endToday);

      const ytdByMonth: FinanceYtdMonth[] = [];
      for (let mi = 0; mi <= m; mi++) {
        const sm = new Date(y, mi, 1);
        const em = new Date(y, mi + 1, 0, 23, 59, 59, 999);
        const monthEnd = mi === m ? endToday : em;
        const label = sm.toLocaleString("en-GB", { month: "short" });
        ytdByMonth.push({
          month: label,
          caEur: caInRangeEur(tx, revenues, sm, monthEnd),
        });
      }

      let companyMarginEur = 0;
      let companyTotalExpensesEur = 0;
      const projectMargins: ProjectMarginRow[] = [];
      const outstandingRows: OutstandingRow[] = [];
      const materialAlerts: MaterialBudgetAlert[] = [];

      for (const p of projects) {
        const pTx = txByProject.get(p.id) ?? [];
        const pRev = revByProject.get(p.id) ?? [];
        const pEx = expensesByProject.get(p.id) ?? [];
        const revEur = totalProjectRevenueEur(pTx, pRev);
        const marginEur = projectNetProfitEur(num(p.material_costs), pEx, pTx, pRev);
        companyMarginEur += marginEur;
        companyTotalExpensesEur += totalProjectExpensesEur(num(p.material_costs), pEx);

        const clientName = p.client?.name ?? "—";
        const marginPct = revEur !== 0 ? (marginEur / Math.abs(revEur)) * 100 : 0;
        projectMargins.push({
          projectId: p.id,
          projectName: p.name,
          clientName,
          revenueEur: revEur,
          expensesEur: totalProjectExpensesEur(num(p.material_costs), pEx),
          marginEur,
          marginPct: Number.isFinite(marginPct) ? marginPct : 0,
        });

        /** Budget contrat − encaissements totaux (transactions + lignes revenus), équivalent EUR. */
        const collectedEur = totalProjectRevenueEur(pTx, pRev);
        const budgetEur = num(p.contract_amount);
        const balanceEur = Math.max(0, budgetEur - collectedEur);
        if (balanceEur > 0.005) {
          outstandingRows.push({
            projectId: p.id,
            projectName: p.name,
            clientName,
            budgetEur,
            paidEur: collectedEur,
            balanceEur,
          });
        }

        const matBudget = num(p.material_costs);
        const spentLines = sumMaterialToolExpensesTtc(pEx);
        if (matBudget > 0 && spentLines > matBudget + 0.01) {
          materialAlerts.push({
            projectId: p.id,
            projectName: p.name,
            clientName,
            budgetMaterialsEur: matBudget,
            spentMaterialsEur: spentLines,
          });
        }
      }

      outstandingRows.sort((a, b) => {
        const c = a.clientName.localeCompare(b.clientName, undefined, { sensitivity: "base" });
        if (c !== 0) return c;
        return b.balanceEur - a.balanceEur;
      });
      projectMargins.sort((a, b) => Math.abs(b.marginEur) - Math.abs(a.marginEur));

      const companyTotalRevenueEur = projects.reduce((s, p) => {
        const pTx = txByProject.get(p.id) ?? [];
        const pRev = revByProject.get(p.id) ?? [];
        return s + totalProjectRevenueEur(pTx, pRev);
      }, 0);
      const companyMarginPct = companyTotalRevenueEur > 0 ? (companyMarginEur / companyTotalRevenueEur) * 100 : 0;

      const totalOutstandingEur = outstandingRows.reduce((s, r) => s + r.balanceEur, 0);

      const projectNameById = new Map(projects.map((p) => [p.id, p.name]));
      const cashFlowLines: CashFlowLine[] = [];
      for (const t of txRowsFull) {
        const d = t.payment_date.includes("T") ? t.payment_date.slice(0, 10) : t.payment_date;
        cashFlowLines.push({
          id: `tx-${t.id}`,
          kind: "transaction",
          date: d,
          projectId: t.project_id,
          projectName: projectNameById.get(t.project_id) ?? "—",
          amountEur: Number(t.amount),
          amountOriginal: Number(t.amount),
          currency: "EUR",
        });
      }
      for (const r of revenues) {
        const cur = parseStoredRevenueCurrency(r.currency);
        const amt = Number(r.amount);
        const eur = amountInCurrencyToEur(amt, cur);
        const d = r.date.includes("T") ? r.date.slice(0, 10) : r.date;
        cashFlowLines.push({
          id: `rev-${r.id}`,
          kind: "revenue",
          date: d,
          projectId: r.project_id,
          projectName: projectNameById.get(r.project_id) ?? "—",
          amountEur: eur,
          amountOriginal: amt,
          currency: cur,
        });
      }
      cashFlowLines.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setData({
        caMonthEur,
        caPrevMonthEur,
        caMonthMomPct,
        caYtdEur,
        companyTotalRevenueEur,
        companyTotalExpensesEur,
        companyMarginEur,
        companyMarginPct,
        totalOutstandingEur,
        outstandingRows,
        projectMargins,
        ytdByMonth,
        materialAlerts,
        cashFlowLines,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(emptyAnalytics());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const ch = supabase
      .channel("finance-analytics")
      .on("postgres_changes", { event: "*", schema: "public", table: "revenues" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "project_transactions" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => fetchAll())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchAll]);

  return { data, loading, error, refetch: fetchAll };
}
