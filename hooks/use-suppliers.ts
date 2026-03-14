"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  address: string;
  category: string;
  created_at?: string;
}

function mapRow(row: Record<string, unknown>): Supplier {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: (row.name as string) ?? "",
    phone: (row.phone as string) ?? "",
    address: (row.address as string) ?? "",
    category: (row.category as string) ?? "",
    created_at: row.created_at as string | undefined,
  };
}

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setSuppliers([]);
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSuppliers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("suppliers")
      .select("*")
      .eq("user_id", user.id)
      .order("name", { ascending: true });
    if (fetchError) {
      setError(fetchError.message);
      setSuppliers([]);
    } else {
      setSuppliers(((data ?? []) as Record<string, unknown>[]).map(mapRow));
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const addSupplier = useCallback(
    async (payload: { name: string; phone: string; address: string; category: string }) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: "Non connecté" };
      const { error: insertError } = await supabase.from("suppliers").insert({
        user_id: user.id,
        name: payload.name.trim(),
        phone: (payload.phone ?? "").trim(),
        address: (payload.address ?? "").trim(),
        category: (payload.category ?? "").trim(),
      });
      if (insertError) return { error: insertError.message };
      await fetchSuppliers();
      return {};
    },
    [fetchSuppliers]
  );

  const deleteSupplier = useCallback(
    async (id: string) => {
      const supabase = createClient();
      if (!supabase) return;
      await supabase.from("suppliers").delete().eq("id", id);
      await fetchSuppliers();
    },
    [fetchSuppliers]
  );

  return { suppliers, loading, error, addSupplier, deleteSupplier, refetch: fetchSuppliers };
}
