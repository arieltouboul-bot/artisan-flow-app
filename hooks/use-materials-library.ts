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
    const parseTechnicalSpecs = (raw: unknown): Record<string, unknown> | null => {
      if (!raw) return null;
      if (typeof raw === "object") return raw as Record<string, unknown>;
      if (typeof raw === "string") {
        try {
          const parsed = JSON.parse(raw) as unknown;
          return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
        } catch {
          return null;
        }
      }
      return null;
    };

    const primarySelect = "id,user_id,name,category,technical_specs";
    const fallbackSelect = "id,user_id,name,category,dtu_reference,installation_notice";
    const { data, error: err } = await supabase
      .from("materials_library")
      .select(primarySelect)
      .order("name", { ascending: true });
    if (err) {
      const fallback = await supabase.from("materials_library").select(fallbackSelect).order("name", { ascending: true });
      if (fallback.error) {
        setError(fallback.error.message);
        setLoading(false);
        return;
      }
      const safeRows = ((fallback.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: (row.id as string) ?? crypto.randomUUID(),
        user_id: (row.user_id as string | null) ?? null,
        name: (row.name as string) ?? "Materiau sans nom",
        category: (row.category as string | null) ?? "general",
        unit: "u",
        dtu_reference: (row.dtu_reference as string | null) ?? null,
        installation_notice: (row.installation_notice as string | null) ?? null,
        technical_specs: parseTechnicalSpecs(row.technical_specs),
      }));
      setMaterials(safeRows as MaterialRow[]);
      setLoading(false);
      return;
    }
    else {
      const safeRows = ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
        id: (row.id as string) ?? crypto.randomUUID(),
        user_id: (row.user_id as string | null) ?? null,
        name: (row.name as string) ?? "Materiau sans nom",
        category: (row.category as string | null) ?? "general",
        unit: "u",
        dtu_reference: null,
        installation_notice: (row.technical_specs as string | null) ?? null,
        technical_specs: parseTechnicalSpecs(row.technical_specs),
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
