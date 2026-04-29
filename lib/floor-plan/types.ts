/**
 * Schéma JSON canonique du plan 2D (sauvegarde Supabase `floor_plans.plan_json`).
 * Échelle globale : `meta.cmPerPixel` — longueur en cm = distance_pixel * cmPerPixel (ex. 1 → 500 px = 5,00 m).
 */

import type { ArchitecturalSchema } from "@/lib/architect-ai/bim-types";

export type PlanElementType = "mur" | "porte" | "fenetre" | "meuble";

export interface PlanElementProperties {
  /** Épaisseur / section utile pour métrés (cm) */
  epaisseur_cm: number;
  /** Libellé matériau libre (fallback si pas de liaison catalogue) */
  materiau: string;
  /** Liaison optionnelle vers public.materials_library */
  material_id?: string | null;
}

export interface PlanElement {
  id: string;
  type: PlanElementType;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  proprietes: PlanElementProperties;
}

export interface FloorPlanMeta {
  /** cm réels pour 1 pixel en plan (calibrage utilisateur) */
  cmPerPixel: number;
  /** Nom affiché optionnel dans l’éditeur */
  planName?: string;
  /** Schéma BIM issu de l’Architecte IA (Text-to-BIM), optionnel */
  bim?: ArchitecturalSchema;
}

export interface FloorPlanDocument {
  version: 1;
  elements: PlanElement[];
  meta: FloorPlanMeta;
}

export function createEmptyPlanDocument(overrides?: Partial<FloorPlanMeta>): FloorPlanDocument {
  return {
    version: 1,
    elements: [],
    meta: {
      cmPerPixel: 1,
      ...overrides,
    },
  };
}

export type MaterialRow = {
  id: string;
  user_id: string | null;
  name: string;
  category: string | null;
  unit: string;
  dtu_reference: string | null;
  installation_notice: string | null;
};

export type NomenclatureLine = {
  material_id: string | null;
  label: string;
  unit: string;
  quantity: number;
  detail: string;
};
