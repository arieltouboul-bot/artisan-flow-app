"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export type RevenueRow = {
  id: string;
  user_id: string;
  project_id: string;
  amount: number;
  received_at: string;
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
        .select("id, user_id, project_id, amount, received_at, notes, created_at, project:projects(id, name)")
        .eq("user_id", user.id)
        .order("received_at", { ascending: false });

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
              received_at: String(row.received_at),
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

  const insertRevenue = useCallback(
    async (payload: {
      project_id: string;
      amount: number;
      received_at: string;
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
          received_at: payload.received_at,
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

  return { rows, loading, error, refetch: fetchRevenues, insertRevenue };
}
