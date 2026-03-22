"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseStoredRevenueCurrency, type RevenueCurrency } from "@/lib/utils";

export type ProjectRevenueRow = { amount: number; currency: RevenueCurrency };

export function useProjectRevenues(projectId: string | null) {
  const [rows, setRows] = useState<ProjectRevenueRow[]>([]);
  const [loading, setLoading] = useState(!!projectId);

  const fetchRows = useCallback(async () => {
    if (!projectId) {
      setRows([]);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("revenues")
      .select("amount, currency")
      .eq("user_id", user.id)
      .eq("project_id", projectId);
    if (error) {
      setRows([]);
    } else {
      setRows(
        ((data ?? []) as Record<string, unknown>[]).map((r) => ({
          amount: Number(r.amount),
          currency: parseStoredRevenueCurrency(r.currency as string | null),
        }))
      );
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase || !projectId) return;
    const channel = supabase
      .channel(`revenues-proj-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "revenues", filter: `project_id=eq.${projectId}` },
        () => {
          fetchRows();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchRows]);

  return { revenueRows: rows, loading, refetch: fetchRows };
}
