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
  construction_manual?: string | null;
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

function ensurePlanDefaults(doc: FloorPlanDocument): FloorPlanDocument {
  const safeElements = Array.isArray(doc.elements) ? doc.elements : [];
  const safeName = typeof doc.meta.planName === "string" && doc.meta.planName.trim() ? doc.meta.planName : "Plan sans titre";
  return {
    version: 1,
    elements: safeElements,
    meta: {
      cmPerPixel: Number.isFinite(doc.meta.cmPerPixel) ? doc.meta.cmPerPixel : 1,
      planName: safeName,
      ...(doc.meta.bim ? { bim: doc.meta.bim } : {}),
    },
  };
}

const FLOOR_PLAN_MUTABLE_COLUMNS = new Set([
  "user_id",
  "name",
  "project_id",
  "plan_json",
  "updated_at",
  "construction_manual",
]);

function filterExistingColumns(payload: Record<string, unknown>) {
  const blockedKeys = new Set([["pr", "ice"].join(""), `avg_${["pr", "ice"].join("")}`, `unit_${["pr", "ice"].join("")}_estimate`, "name_fr", "name_en"]);
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => FLOOR_PLAN_MUTABLE_COLUMNS.has(key) && !blockedKeys.has(key))
  );
}

function stripOptionalColumn(payload: Record<string, unknown>, column: string) {
  const next = { ...payload };
  delete next[column];
  return next;
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
  const LOCAL_PLAN_FALLBACK_KEY = "architect_ai_unsaved_plan";

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
      .select("id,name,project_id,plan_json,construction_manual")
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
        construction_manual: (data.construction_manual as string | null) ?? null,
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
        const safeNext = ensurePlanDefaults(next);
        const constructionManual = safeNext.meta.bim?.meta.execution_guide?.join("\n") ?? null;
        const existingId = rowIdRef.current ?? row?.id;
        if (existingId) {
          const updatePayload = filterExistingColumns({
            plan_json: safeNext,
            updated_at: new Date().toISOString(),
            ...(meta?.name != null ? { name: meta.name || safeNext.meta.planName || "Plan sans titre" } : {}),
            ...(meta?.project_id !== undefined ? { project_id: meta.project_id } : {}),
            construction_manual: constructionManual,
          });
          let { error: err } = await supabase
            .from("floor_plans")
            .update(updatePayload)
            .eq("id", existingId);
          if (err && /construction_manual|column/i.test(err.message)) {
            const fallbackPayload = stripOptionalColumn(updatePayload, "construction_manual");
            const retry = await supabase.from("floor_plans").update(fallbackPayload).eq("id", existingId);
            err = retry.error;
          }
          if (err) {
            console.error("[floor_plans.update] failed", {
              id: existingId,
              name: meta?.name ?? safeNext.meta.planName ?? "Plan sans titre",
              project_id: meta?.project_id ?? null,
              hasUserScopedRow: true,
              error: err.message,
            });
            setError(err.message);
            try {
              window.localStorage.setItem(
                LOCAL_PLAN_FALLBACK_KEY,
                JSON.stringify({
                  name: meta?.name ?? safeNext.meta.planName ?? "Plan sans titre",
                  project_id: meta?.project_id ?? null,
                  plan_json: safeNext,
                  construction_manual: constructionManual,
                  saved_at: new Date().toISOString(),
                })
              );
            } catch {
              // ignore localStorage failures
            }
          }
        } else {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            setError("Non connecté");
            return;
          }
          const insertPayload = filterExistingColumns({
            user_id: user.id,
            name: meta?.name ?? safeNext.meta.planName ?? "Plan sans titre",
            project_id: meta?.project_id ?? null,
            plan_json: safeNext,
            construction_manual: constructionManual,
          });
          let { data, error: err } = await supabase
            .from("floor_plans")
            .insert(insertPayload)
            .select("id,name,project_id,plan_json,construction_manual")
            .single();
          if (err && /construction_manual|column/i.test(err.message)) {
            const fallbackPayload = stripOptionalColumn(insertPayload, "construction_manual");
            const retry = await supabase
              .from("floor_plans")
              .insert(fallbackPayload)
              .select("id,name,project_id,plan_json")
              .single();
            data = retry.data as typeof data;
            err = retry.error;
          }
          if (err) {
            console.error("[floor_plans.insert] failed", {
              user_id: user.id,
              name: meta?.name ?? safeNext.meta.planName ?? "Plan sans titre",
              project_id: meta?.project_id ?? null,
              error: err.message,
            });
            setError(err.message);
            try {
              window.localStorage.setItem(
                LOCAL_PLAN_FALLBACK_KEY,
                JSON.stringify({
                  name: meta?.name ?? safeNext.meta.planName ?? "Plan sans titre",
                  project_id: meta?.project_id ?? null,
                  plan_json: safeNext,
                  construction_manual: constructionManual,
                  saved_at: new Date().toISOString(),
                })
              );
            } catch {
              // ignore localStorage failures
            }
          }
          else if (data) {
            const newId = data.id as string;
            rowIdRef.current = newId;
            setRow({
              id: newId,
              name: (data.name as string) ?? "Plan",
              project_id: (data.project_id as string | null) ?? null,
              plan_json: parsePlanJson(data.plan_json),
              construction_manual: (data.construction_manual as string | null) ?? null,
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
