"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MaterialCatalogItem } from "@/types/database";

function mapRow(row: Record<string, unknown>): MaterialCatalogItem {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    name: row.name as string,
    unit: (row.unit as string) ?? "m2",
    price_per_unit: Number(row.price_per_unit) ?? 0,
    category: (row.category as string) ?? null,
    created_at: row.created_at as string | undefined,
  };
}

export function useMaterialCatalog() {
  const [items, setItems] = useState<MaterialCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error: e } = await supabase
      .from("material_catalog")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    if (e) {
      setError(e.message);
      setItems([]);
    } else {
      setItems(((data ?? []) as Record<string, unknown>[]).map(mapRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return { items, loading, error, refetch: fetchItems };
}
