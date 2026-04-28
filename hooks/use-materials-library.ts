"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MaterialRow } from "@/lib/floor-plan/types";

/**
 * Liste les matériaux visibles pour l’utilisateur (catalogue global `user_id` NULL + entrées perso).
 */
export function useMaterialsLibrary(enabled: boolean = true) {
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const materialsById = useMemo(() => {
    const m = new Map<string, MaterialRow>();
    for (const r of materials) m.set(r.id, r);
    return m;
  }, [materials]);

  const reload = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setError("Supabase non configuré");
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("materials_library")
      .select("id,user_id,name,category,unit,avg_price_ht,dtu_reference,installation_notice")
      .order("name", { ascending: true });
    if (err) setError(err.message);
    else {
      const safeRows = ((data ?? []) as Partial<MaterialRow>[]).map((row) => ({
        id: row.id ?? crypto.randomUUID(),
        user_id: row.user_id ?? null,
        name: row.name ?? "Materiau sans nom",
        category: row.category ?? "general",
        unit: row.unit ?? "u",
        avg_price_ht: typeof row.avg_price_ht === "number" ? row.avg_price_ht : 0,
        dtu_reference: row.dtu_reference ?? null,
        installation_notice: row.installation_notice ?? null,
      }));
      setMaterials(safeRows as MaterialRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void reload();
  }, [enabled, reload]);

  return { materials, materialsById, loading, error, reload };
}
