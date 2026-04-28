"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createEmptyPlanDocument, type FloorPlanDocument } from "@/lib/floor-plan/types";
import type { ArchitecturalSchema } from "@/lib/architect-ai/bim-types";
import { getCmPerPixel } from "@/lib/floor-plan/scale";
import { useMaterialsLibrary } from "@/hooks/use-materials-library";

export type FloorPlanRow = {
  id: string;
  name: string;
  project_id: string | null;
  plan_json: FloorPlanDocument;
};

export function parsePlanJson(raw: unknown): FloorPlanDocument {
  if (!raw || typeof raw !== "object") return createEmptyPlanDocument();
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || !Array.isArray(o.elements) || !o.meta || typeof o.meta !== "object") {
    return createEmptyPlanDocument();
  }
  const meta = o.meta as Record<string, unknown>;
  const cmPerPixel = typeof meta.cmPerPixel === "number" ? meta.cmPerPixel : 1;
  const bim =
    meta.bim && typeof meta.bim === "object" && (meta.bim as ArchitecturalSchema).version === 1
      ? (meta.bim as ArchitecturalSchema)
      : undefined;
  return {
    version: 1,
    elements: o.elements as FloorPlanDocument["elements"],
    meta: {
      cmPerPixel,
      planName: typeof meta.planName === "string" ? meta.planName : undefined,
      ...(bim ? { bim } : {}),
    },
  };
}

export type UseFloorPlanOptions = {
  /** Après le premier INSERT (`floor_plans`), ex. `router.replace(\`/plans?id=\${id}\`)` */
  onPlanCreated?: (id: string) => void;
};

/**
 * Charge / sauvegarde le JSON du plan (`floor_plans.plan_json`) et expose le catalogue matériaux.
 */
export function useFloorPlan(planId: string | null, options?: UseFloorPlanOptions) {
  const { materials, materialsById, loading: materialsLoading, error: materialsError, reload: reloadMaterials } =
    useMaterialsLibrary(true);

  const [row, setRow] = useState<FloorPlanRow | null>(null);
  const [document, setDocument] = useState<FloorPlanDocument>(() => createEmptyPlanDocument());
  const [planLoading, setPlanLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rowIdRef = useRef<string | null>(null);

  const loading = planLoading || materialsLoading;

  const loadPlan = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setPlanLoading(false);
      return;
    }
    setPlanLoading(true);
    setError(null);
    if (!planId) {
      const empty = createEmptyPlanDocument();
      rowIdRef.current = null;
      setRow(null);
      setDocument(empty);
      setPlanLoading(false);
      return;
    }
    const { data, error: err } = await supabase
      .from("floor_plans")
      .select("id,name,project_id,plan_json")
      .eq("id", planId)
      .maybeSingle();
    if (err) {
      setError(err.message);
      rowIdRef.current = null;
      setRow(null);
      setDocument(createEmptyPlanDocument());
    } else if (data) {
      const parsed = parsePlanJson(data.plan_json);
      const rid = data.id as string;
      rowIdRef.current = rid;
      setRow({
        id: rid,
        name: (data.name as string) ?? "Plan",
        project_id: (data.project_id as string | null) ?? null,
        plan_json: parsed,
      });
      setDocument(parsed);
    } else {
      rowIdRef.current = null;
      setRow(null);
      setDocument(createEmptyPlanDocument());
    }
    setPlanLoading(false);
  }, [planId]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  const persist = useCallback(
    async (next: FloorPlanDocument, meta?: { name?: string; project_id?: string | null }) => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      const supabase = createClient();
      if (!supabase) return;
      setSaving(true);
      setError(null);
      try {
        const existingId = rowIdRef.current ?? row?.id;
        if (existingId) {
          const { error: err } = await supabase
            .from("floor_plans")
            .update({
              plan_json: next,
              updated_at: new Date().toISOString(),
              ...(meta?.name != null ? { name: meta.name } : {}),
              ...(meta?.project_id !== undefined ? { project_id: meta.project_id } : {}),
            })
            .eq("id", existingId);
          if (err) setError(err.message);
        } else {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            setError("Non connecté");
            return;
          }
          const { data, error: err } = await supabase
            .from("floor_plans")
            .insert({
              user_id: user.id,
              name: meta?.name ?? "Plan sans titre",
              project_id: meta?.project_id ?? null,
              plan_json: next,
            })
            .select("id,name,project_id,plan_json")
            .single();
          if (err) setError(err.message);
          else if (data) {
            const newId = data.id as string;
            rowIdRef.current = newId;
            setRow({
              id: newId,
              name: (data.name as string) ?? "Plan",
              project_id: (data.project_id as string | null) ?? null,
              plan_json: parsePlanJson(data.plan_json),
            });
            options?.onPlanCreated?.(newId);
          }
        }
      } finally {
        setSaving(false);
      }
    },
    [row?.id, options?.onPlanCreated]
  );

  const scheduleSave = useCallback(
    (next: FloorPlanDocument) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void persist(next);
      }, 900);
    },
    [persist]
  );

  const updateDocument = useCallback(
    (updater: (d: FloorPlanDocument) => FloorPlanDocument) => {
      setDocument((prev) => {
        const next = updater(prev);
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave]
  );

  const setCmPerPixel = useCallback(
    (cmPerPixel: number) => {
      const v = Math.max(0.0001, Math.min(100, cmPerPixel));
      updateDocument((d) => ({
        ...d,
        meta: { ...d.meta, cmPerPixel: v },
      }));
    },
    [updateDocument]
  );

  const cmPerPixel = useMemo(() => getCmPerPixel(document), [document]);

  const combinedError = error ?? materialsError;

  return {
    row,
    document,
    setDocument,
    updateDocument,
    materials,
    materialsById,
    loading,
    saving,
    error: combinedError,
    persist,
    reload: loadPlan,
    reloadMaterials,
    setCmPerPixel,
    cmPerPixel,
    cancelScheduledSave: () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
    },
  };
}
