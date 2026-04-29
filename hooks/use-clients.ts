"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "../lib/supabase/client";
import type { Client } from "@/types/database";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasSupabaseEnv =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const fetchClients = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setError(
        hasSupabaseEnv
          ? "Initialisation Supabase en attente. Redémarrez le serveur de développement."
          : "Supabase non configuré (variables NEXT_PUBLIC_SUPABASE_* manquantes dans .env.local)"
      );
      setLoading(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setClients([]);
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("clients")
      .select(
        "id, name, email, phone, address, contract_amount, material_costs, amount_collected, created_at, user_id"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
      setClients([]);
    } else {
      setClients((data as Client[]) ?? []);
    }
    setLoading(false);
  }, [hasSupabaseEnv]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel("clients-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => {
          fetchClients();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClients]);

  const updateClient = useCallback(
    async (
      id: string,
      payload: Partial<{
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        contract_amount: number;
        material_costs: number;
        amount_collected: number;
      }>
    ) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const toUpdate: Record<string, unknown> = {};
      if (payload.name !== undefined) toUpdate.name = payload.name.trim();
      if (payload.email !== undefined) toUpdate.email = payload.email?.trim() || null;
      if (payload.phone !== undefined) toUpdate.phone = payload.phone?.trim() || null;
      if (payload.address !== undefined) toUpdate.address = payload.address?.trim() || null;
      if (payload.contract_amount !== undefined) toUpdate.contract_amount = payload.contract_amount;
      if (payload.material_costs !== undefined) toUpdate.material_costs = payload.material_costs;
      if (payload.amount_collected !== undefined) toUpdate.amount_collected = payload.amount_collected;
      if (Object.keys(toUpdate).length === 0) return {};
      const { error: updateError } = await supabase.from("clients").update(toUpdate).eq("id", id);
      if (updateError) return { error: updateError.message };
      await fetchClients();
      return {};
    },
    [fetchClients]
  );

  return { clients, loading, error, refetch: fetchClients, updateClient };
}

