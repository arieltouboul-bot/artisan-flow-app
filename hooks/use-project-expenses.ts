"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Expense, ExpenseCategory } from "@/types/database";

function mapRow(row: Record<string, unknown>): Expense {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    user_id: row.user_id as string,
    description: (row.description as string) ?? "",
    amount_ht: Number(row.amount_ht ?? 0),
    tva_rate: Number(row.tva_rate ?? 20),
    category: (row.category as ExpenseCategory) ?? "achat_materiel",
    date: row.date as string,
    created_at: row.created_at as string | undefined,
  };
}

export const EXPENSE_CATEGORY_ORDER: ExpenseCategory[] = [
  "achat_materiel",
  "location",
  "main_oeuvre",
  "sous_traitance",
];

export function useProjectExpenses(projectId: string | null) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(!!projectId);

  const fetchExpenses = useCallback(async () => {
    if (!projectId) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setExpenses([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    if (error) {
      setExpenses([]);
    } else {
      setExpenses(((data ?? []) as Record<string, unknown>[]).map(mapRow));
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const addExpense = useCallback(
    async (payload: {
      description: string;
      amount_ht: number;
      tva_rate: number;
      category: ExpenseCategory;
      date: string;
    }) => {
      if (!projectId || payload.amount_ht < 0) return { error: "Données invalides" };
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: "Non connecté" };

      const { error: insertError } = await supabase.from("expenses").insert({
        project_id: projectId,
        user_id: user.id,
        description: payload.description.trim() || "",
        amount_ht: payload.amount_ht,
        tva_rate: payload.tva_rate,
        category: payload.category,
        date: payload.date,
      });

      if (insertError) return { error: insertError.message };
      await fetchExpenses();
      return {};
    },
    [projectId, fetchExpenses]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      const supabase = createClient();
      if (!supabase) return;
      await supabase.from("expenses").delete().eq("id", id);
      await fetchExpenses();
    },
    [fetchExpenses]
  );

  const totalHT = expenses.reduce((s, e) => s + e.amount_ht, 0);
  const totalTvaRecuperable = expenses.reduce((s, e) => s + e.amount_ht * (e.tva_rate / 100), 0);

  return {
    expenses,
    loading,
    addExpense,
    deleteExpense,
    refetch: fetchExpenses,
    totalHT,
    totalTvaRecuperable,
  };
}
