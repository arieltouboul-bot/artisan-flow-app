"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface InventoryItem {
  id: string;
  user_id: string;
  name: string;
  unit_price_ht: number;
  stock_quantity: number;
  category: string;
  default_tva_rate: number;
  supplier_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

function mapRow(row: Record<string, unknown>): InventoryItem {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: (row.name as string) ?? "",
    unit_price_ht: Number(row.unit_price_ht ?? 0),
    stock_quantity: Number(row.stock_quantity ?? 0),
    category: (row.category as string) ?? "",
    default_tva_rate: Number(row.default_tva_rate ?? 20),
    supplier_id: (row.supplier_id as string | null) ?? null,
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  };
}

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("inventory")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setItems([]);
    } else {
      setItems(((data ?? []) as Record<string, unknown>[]).map(mapRow));
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const addItem = useCallback(
    async (payload: { name: string; unit_price_ht: number; stock_quantity: number; category: string; default_tva_rate: number; supplier_id?: string | null }) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: "Non connecté" };
      const row: Record<string, unknown> = {
        user_id: user.id,
        name: payload.name.trim(),
        unit_price_ht: payload.unit_price_ht,
        stock_quantity: payload.stock_quantity ?? 0,
        category: payload.category.trim() || "",
        default_tva_rate: payload.default_tva_rate ?? 20,
        updated_at: new Date().toISOString(),
      };
      if (payload.supplier_id != null && payload.supplier_id !== "") row.supplier_id = payload.supplier_id;
      const { error: insertError } = await supabase.from("inventory").insert(row);
      if (insertError) return { error: insertError.message };
      await fetchItems();
      return {};
    },
    [fetchItems]
  );

  const updateItem = useCallback(
    async (id: string, payload: Partial<{ name: string; unit_price_ht: number; stock_quantity: number; category: string; default_tva_rate: number; supplier_id?: string | null }>) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { error: updateError } = await supabase
        .from("inventory")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (updateError) return { error: updateError.message };
      await fetchItems();
      return {};
    },
    [fetchItems]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      const supabase = createClient();
      if (!supabase) return;
      await supabase.from("inventory").delete().eq("id", id);
      await fetchItems();
    },
    [fetchItems]
  );

  return { items, loading, error, addItem, updateItem, deleteItem, refetch: fetchItems };
}
