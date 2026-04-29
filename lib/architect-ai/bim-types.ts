/**
 * Schéma BIM « Text-to-BIM » : structure, zones, logique d’usage.
 * Les références matériaux pointent vers `architectural_library.id`.
 */

export type WallElement = {
  id: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  height_m: number;
  thickness_m: number;
  load_bearing: boolean;
  /** Référence catalogue `architectural_library` */
  material_ref_id: string;
};

export type OpeningElement = {
  id: string;
  wall_id: string;
  width_m: number;
  height_m: number;
  type: "porte" | "fenetre" | "baie";
  offset_along_wall_m: number;
  material_ref_id?: string | null;
};

export type RoomZone = {
  id: string;
  name: string;
  type: "piece" | "circulation" | "technique" | "exterieur";
  /** Polygone horizontal (x,z), m — au moins 3 points */
  polygon: [number, number][];
  area_m2: number;
};

export type CirculationPath = {
  id: string;
  label: string;
  /** Polyligne (x,z) en m */
  path: [number, number][];
  width_m: number;
};

export type ArchitecturalSchema = {
  version: 1;
  meta: {
    label: string;
    /** 1 unité plan = combien de m (échelle globale export) */
    meters_per_plan_unit: number;
    generated_at?: string;
    source_prompt?: string;
    project_category?: "safe_room" | "house" | "technical_room";
    execution_guide?: string[];
    structural_score?: number;
  };
  structure: {
    walls: WallElement[];
  };
  zones: RoomZone[];
  logic: {
    openings: OpeningElement[];
    circulations: CirculationPath[];
  };
};

export type ArchitecturalLibraryRow = {
  id: string;
  ref_code: string;
  name: string;
  category: string | null;
  material_family: "wood" | "concrete" | "metal" | "glass" | "ceramic" | "other";
  unit: string;
  norm_reference: string | null;
  supplier_hint: string | null;
  description: string | null;
  technical_specs?: Record<string, unknown> | null;
};

export function createEmptyArchitecturalSchema(label: string): ArchitecturalSchema {
  return {
    version: 1,
    meta: { label, meters_per_plan_unit: 0.01 },
    structure: { walls: [] },
    zones: [],
    logic: { openings: [], circulations: [] },
  };
}
