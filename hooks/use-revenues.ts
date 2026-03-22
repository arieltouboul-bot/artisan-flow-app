"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseStoredRevenueCurrency, type RevenueCurrency } from "@/lib/utils";

export type RevenueRow = {
  id: string;
  user_id: string;
  project_id: string;
  amount: number;
  /** Colonne Supabase : date (jour du revenu). Ne pas utiliser received_at. */
  date: string;
  currency: RevenueCurrency;
  notes: string | null;
  created_at?: string;
  project?: { id: string; name: string } | null;
};

const TABLE = "revenues";

function logRevenuesError(context: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[revenues] ${context}:`, msg, err);
}

export function useRevenues() {
  const [rows, setRows] = useState<RevenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenues = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase non configuré");
      setLoading(false);
      return;
    }
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRows([]);
        setLoading(false);
        return;
      }
      setError(null);
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from(TABLE)
        .select("id, user_id, project_id, amount, date, currency, notes, created_at, project:projects(id, name)")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (fetchError) {
        logRevenuesError("select", fetchError);
        setError(fetchError.message);
        setRows([]);
      } else {
        const raw = (data ?? []) as Record<string, unknown>[];
        setRows(
          raw.map((row) => {
            const pr = row.project as { id: string; name: string } | { id: string; name: string }[] | null | undefined;
            const project = Array.isArray(pr) ? pr[0] ?? null : pr ?? null;
            return {
              id: row.id as string,
              user_id: row.user_id as string,
              project_id: row.project_id as string,
              amount: Number(row.amount),
              date: String(row.date),
              currency: parseStoredRevenueCurrency(row.currency as string | null | undefined),
              notes: (row.notes as string | null) ?? null,
              created_at: row.created_at as string | undefined,
              project: project ? { id: project.id, name: project.name } : null,
            };
          })
        );
      }
    } catch (e) {
      logRevenuesError("fetchRevenues catch", e);
      setError(e instanceof Error ? e.message : String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRevenues();
  }, [fetchRevenues]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const ch = supabase
      .channel("revenues-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, () => {
        fetchRevenues();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fetchRevenues]);

  const insertRevenue = useCallback(
    async (payload: {
      project_id: string;
      amount: number;
      date: string;
      currency: RevenueCurrency;
      notes?: string | null;
      user_id: string;
    }) => {
      const supabase = createClient();
      if (!supabase) {
        console.error("[revenues] insert: Supabase client null");
        return { error: "Supabase non configuré" as const };
      }
      try {
        const insertPayload = {
          user_id: payload.user_id,
          project_id: payload.project_id,
          amount: payload.amount,
          date: payload.date,
          currency: payload.currency,
          notes: payload.notes?.trim() || null,
        };
        const { error: insertError } = await supabase.from(TABLE).insert(insertPayload);
        if (insertError) {
          logRevenuesError("insert", insertError);
          return { error: insertError.message };
        }
        await fetchRevenues();
        return { error: null };
      } catch (e) {
        logRevenuesError("insert catch", e);
        return { error: e instanceof Error ? e.message : String(e) };
      }
    },
    [fetchRevenues]
  );

  const updateRevenue = useCallback(
    async (
      id: string,
      payload: {
        project_id: string;
        amount: number;
        date: string;
        currency: RevenueCurrency;
        notes?: string | null;
      }
    ) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" as const };
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { error: "Not authenticated" as const };
        const { error: upErr } = await supabase
          .from(TABLE)
          .update({
            project_id: payload.project_id,
            amount: payload.amount,
            date: payload.date,
            currency: payload.currency,
            notes: payload.notes?.trim() || null,
          })
          .eq("id", id)
          .eq("user_id", user.id);
        if (upErr) {
          logRevenuesError("update", upErr);
          return { error: upErr.message };
        }
        await fetchRevenues();
        return { error: null };
      } catch (e) {
        logRevenuesError("update catch", e);
        return { error: e instanceof Error ? e.message : String(e) };
      }
    },
    [fetchRevenues]
  );

  const deleteRevenue = useCallback(
    async (id: string) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" as const };
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return { error: "Not authenticated" as const };
        const { error: delErr } = await supabase.from(TABLE).delete().eq("id", id).eq("user_id", user.id);
        if (delErr) {
          logRevenuesError("delete", delErr);
          return { error: delErr.message };
        }
        await fetchRevenues();
        return { error: null };
      } catch (e) {
        logRevenuesError("delete catch", e);
        return { error: e instanceof Error ? e.message : String(e) };
      }
    },
    [fetchRevenues]
  );

  return { rows, loading, error, refetch: fetchRevenues, insertRevenue, updateRevenue, deleteRevenue };
}
