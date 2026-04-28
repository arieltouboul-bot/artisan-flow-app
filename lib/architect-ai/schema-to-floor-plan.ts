import type { FloorPlanDocument, PlanElement } from "@/lib/floor-plan/types";
import type { ArchitecturalSchema } from "./bim-types";

const PX_PER_M = 80;

/** Convertit le schéma BIM (plan XZ → m) en document 2D canvas (XY pixels) pour aperçu / export legacy. */
export function architecturalSchemaToFloorPlan(schema: ArchitecturalSchema): FloorPlanDocument {
  const scale = PX_PER_M / schema.meta.meters_per_plan_unit;
  const elements: PlanElement[] = [];

  for (const w of schema.structure.walls) {
    elements.push({
      id: w.id,
      type: "mur",
      x1: w.x1 * scale,
      y1: w.z1 * scale,
      x2: w.x2 * scale,
      y2: w.z2 * scale,
      proprietes: {
        epaisseur_cm: w.thickness_m * 100,
        materiau: w.load_bearing ? "Mur porteur" : "Cloison",
        material_id: w.material_ref_id,
        prix_moyen: undefined,
      },
    });
  }

  for (const o of schema.logic.openings) {
    const wall = schema.structure.walls.find((x) => x.id === o.wall_id);
    if (!wall) continue;
    const mx = (wall.x1 + wall.x2) / 2;
    const mz = (wall.z1 + wall.z2) / 2;
    elements.push({
      id: o.id,
      type: o.type === "fenetre" || o.type === "baie" ? "fenetre" : "porte",
      x1: mx * scale - 15,
      y1: mz * scale,
      x2: mx * scale + 15,
      y2: mz * scale,
      proprietes: {
        epaisseur_cm: 12,
        materiau: o.type,
        material_id: o.material_ref_id ?? null,
      },
    });
  }

  return {
    version: 1,
    elements,
    meta: {
      cmPerPixel: 100 / PX_PER_M,
      planName: schema.meta.label,
      bim: schema,
    },
  };
}

