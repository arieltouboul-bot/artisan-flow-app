"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Expense, ExpenseCategory } from "@/types/database";

export interface ExpenseWithProject extends Expense {
  project_name: string | null;
}

function mapRow(row: Record<string, unknown>): ExpenseWithProject {
  const project = (row.project ?? row.projects) as Record<string, unknown> | null;
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    user_id: row.user_id as string,
    description: ((row.vendor as string) ?? (row.description as string)) ?? "",
    amount_ht: Number(row.amount_ht ?? 0),
    tva_rate: Number(row.tva_rate ?? 20),
    category: (row.category as ExpenseCategory) ?? "achat_materiel",
    date: ((row.invoice_date as string) ?? (row.date as string)) as string,
    created_at: row.created_at as string | undefined,
    project_name: project ? (project.name as string) : null,
    image_url: (row.image_url as string | null) ?? null,
    amount_ttc: row.amount_ttc != null ? Number(row.amount_ttc) : undefined,
  };
}

export function useAllExpenses() {
  const [expenses, setExpenses] = useState<ExpenseWithProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
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
      .select("id, project_id, user_id, description, vendor, amount_ht, tva_rate, category, date, invoice_date, created_at, image_url, amount_ttc, projects(name)")
      .eq("user_id", user.id)
      .order("date", { ascending: false });
    if (error) {
      setExpenses([]);
    } else {
      setExpenses(((data ?? []) as Record<string, unknown>[]).map(mapRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const updateExpense = useCallback(
    async (id: string, payload: { description?: string; amount_ht?: number; tva_rate?: number; date?: string }) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: "Non connecté" };
      const { error: updateError } = await supabase
        .from("expenses")
        .update({
          ...(payload.description !== undefined && { description: payload.description }),
          ...(payload.amount_ht !== undefined && { amount_ht: payload.amount_ht }),
          ...(payload.tva_rate !== undefined && { tva_rate: payload.tva_rate }),
          ...(payload.date !== undefined && { date: payload.date }),
        })
        .eq("id", id)
        .eq("user_id", user.id);
      if (updateError) return { error: updateError.message };
      await fetchExpenses();
      return {};
    },
    [fetchExpenses]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: "Non connecté" };
      const { error: delError } = await supabase.from("expenses").delete().eq("id", id).eq("user_id", user.id);
      if (delError) return { error: delError.message };
      await fetchExpenses();
      return {};
    },
    [fetchExpenses]
  );

  return { expenses, loading, refetch: fetchExpenses, updateExpense, deleteExpense };
}
