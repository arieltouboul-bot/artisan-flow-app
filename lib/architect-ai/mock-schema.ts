import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "./bim-types";

function pickMaterial(materials: ArchitecturalLibraryRow[], i: number): ArchitecturalLibraryRow {
  if (materials.length === 0) {
    return {
      id: "virtual-default",
      ref_code: "VIRT-DEF",
      name: "Béton standard",
      category: "structure",
      material_family: "concrete",
      unit: "m3",
      unit_price_ht: 180,
      norm_reference: "Eurocode 2",
      supplier_hint: null,
      description: null,
    };
  }
  return materials[i % materials.length]!;
}

/**
 * Génère un schéma BIM déterministe à partir du prompt et du catalogue chargé (fallback sans LLM).
 */
export function buildMockArchitecturalSchema(
  prompt: string,
  language: "fr" | "en",
  materials: ArchitecturalLibraryRow[],
  projectCategory: "safe_room" | "house" | "technical_room"
): ArchitecturalSchema {
  const lower = prompt.toLowerCase();
  let wM = 6;
  let dM = 4;
  const mMatch = prompt.match(/(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)/i);
  if (mMatch) {
    wM = parseFloat(mMatch[1]!.replace(",", "."));
    dM = parseFloat(mMatch[2]!.replace(",", "."));
  } else if (lower.includes("studio") || lower.includes("petit")) {
    wM = 4.5;
    dM = 3.2;
  } else if (lower.includes("grand") || lower.includes("loft")) {
    wM = 9;
    dM = 6;
  }

  const m0 = pickMaterial(materials, 0);
  const m1 = pickMaterial(materials, 1);
  const m2 = pickMaterial(materials, 2);
  const h = projectCategory === "safe_room" ? 3 : lower.includes("mezzanine") ? 3.4 : 2.7;
  const th = projectCategory === "safe_room" ? 0.3 : projectCategory === "technical_room" ? 0.24 : 0.2;

  const walls = [
    {
      id: "w-north",
      x1: 0,
      z1: 0,
      x2: wM,
      z2: 0,
      height_m: h,
      thickness_m: th,
      load_bearing: true,
      material_ref_id: m0.id,
    },
    {
      id: "w-east",
      x1: wM,
      z1: 0,
      x2: wM,
      z2: dM,
      height_m: h,
      thickness_m: th,
      load_bearing: true,
      material_ref_id: m1.id,
    },
    {
      id: "w-south",
      x1: wM,
      z1: dM,
      x2: 0,
      z2: dM,
      height_m: h,
      thickness_m: th,
      load_bearing: false,
      material_ref_id: m2.id,
    },
    {
      id: "w-west",
      x1: 0,
      z1: dM,
      x2: 0,
      z2: 0,
      height_m: h,
      thickness_m: th,
      load_bearing: true,
      material_ref_id: m0.id,
    },
  ];

  const doorMat = pickMaterial(materials, 3);
  const openings = [
    {
      id: "o-entree",
      wall_id: "w-south",
      width_m: 0.9,
      height_m: 2.1,
      type: "porte" as const,
      offset_along_wall_m: wM * 0.35,
      material_ref_id: doorMat.id,
    },
  ];

  const label =
    language === "fr"
      ? `Proposition IA — ${wM.toFixed(1)}×${dM.toFixed(1)} m (${projectCategory})`
      : `AI proposal — ${wM.toFixed(1)}×${dM.toFixed(1)} m (${projectCategory})`;

  return {
    version: 1,
    meta: {
      label,
      meters_per_plan_unit: 0.01,
      generated_at: new Date().toISOString(),
      source_prompt: prompt.slice(0, 2000),
      project_category: projectCategory,
    },
    structure: { walls },
    zones: [
      {
        id: "z-main",
        name: language === "fr" ? "Pièce principale" : "Main room",
        type: "piece",
        polygon: [
          [0, 0],
          [wM, 0],
          [wM, dM],
          [0, dM],
        ],
        area_m2: Math.round(wM * dM * 100) / 100,
      },
    ],
    logic: {
      openings,
      circulations: [
        {
          id: "c-axis",
          label: language === "fr" ? "Axe central" : "Central axis",
          path: [
            [wM / 2, 0.2],
            [wM / 2, dM - 0.2],
          ],
          width_m: 1.2,
        },
      ],
    },
  };
}
