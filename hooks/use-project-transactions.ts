"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProjectTransaction } from "@/types/database";

function mapRow(row: Record<string, unknown>): ProjectTransaction {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    amount: Number(row.amount),
    payment_date: row.payment_date as string,
    payment_method: (row.payment_method as string) ?? null,
    created_at: row.created_at as string | undefined,
  };
}

export function useProjectTransactions(projectId: string | null) {
  const [transactions, setTransactions] = useState<ProjectTransaction[]>([]);
  const [loading, setLoading] = useState(!!projectId);

  const fetchTransactions = useCallback(async () => {
    if (!projectId) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("project_transactions")
      .select("*")
      .eq("project_id", projectId)
      .order("payment_date", { ascending: false });
    if (error) {
      setTransactions([]);
    } else {
      setTransactions(((data ?? []) as Record<string, unknown>[]).map(mapRow));
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = useCallback(
    async (amount: number, paymentDate: string, paymentMethod: string) => {
      if (!projectId || amount <= 0) return { error: "Données invalides" };
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };

      const { error: insertError } = await supabase.from("project_transactions").insert({
        project_id: projectId,
        amount,
        payment_date: paymentDate,
        payment_method: paymentMethod || null,
      });

      if (insertError) return { error: insertError.message };

      await fetchTransactions();
      return { error: null };
    },
    [projectId, fetchTransactions]
  );

  return { transactions, loading, addTransaction, refetch: fetchTransactions };
}
