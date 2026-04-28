import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "./bim-types";
import {
  buildDetailedExecutionGuide,
  computeStructuralScore,
  correctedThickness,
  detectArchitectTemplate,
  matchMaterialByName,
} from "./architectBrain";

function pickMaterial(materials: ArchitecturalLibraryRow[], i: number): ArchitecturalLibraryRow {
  if (materials.length === 0) {
    return {
      id: "virtual-default",
      ref_code: "VIRT-DEF",
      name: "Béton standard",
      category: "structure",
      material_family: "concrete",
      unit: "m3",
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
  const thicknessCmMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*cm/);
  const areaMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*m(?:2|²)/i);
  const requestedArea = areaMatch ? parseFloat(areaMatch[1]!.replace(",", ".")) : null;
  const matchedTemplate = detectArchitectTemplate(prompt);
  if (matchedTemplate) {
    const baseArea = matchedTemplate.zone.area_m2 ?? 1;
    const scale = requestedArea && requestedArea > 2 ? Math.sqrt(requestedArea / baseArea) : 1;
    const wallThickness = correctedThickness(
      matchedTemplate.intent,
      thicknessCmMatch ? parseFloat(thicknessCmMatch[1]!.replace(",", ".")) : undefined
    );
    const walls = matchedTemplate.walls.map((w) => {
      const mat = matchMaterialByName(materials, w.material_name) ?? pickMaterial(materials, 0);
      return {
        id: w.id,
        x1: Number((w.x1 * scale).toFixed(2)),
        z1: Number((w.z1 * scale).toFixed(2)),
        x2: Number((w.x2 * scale).toFixed(2)),
        z2: Number((w.z2 * scale).toFixed(2)),
        height_m: 2.8,
        thickness_m: w.load_bearing ? wallThickness : Math.max(0.07, wallThickness * 0.35),
        load_bearing: w.load_bearing,
        material_ref_id: mat.id,
      };
    });
    const openings = matchedTemplate.openings.map((o) => ({
      id: o.id,
      wall_id: o.wall_id,
      width_m: o.width_m,
      height_m: o.height_m,
      type: o.type,
      offset_along_wall_m: Number((o.offset_along_wall_m * scale).toFixed(2)),
      material_ref_id: (o.material_name ? matchMaterialByName(materials, o.material_name) : null)?.id ?? undefined,
    }));
    const zones = [
      {
        ...matchedTemplate.zone,
        polygon: matchedTemplate.zone.polygon.map(
          ([x, y]) => [Number((x * scale).toFixed(2)), Number((y * scale).toFixed(2))] as [number, number]
        ),
        area_m2: Number((matchedTemplate.zone.area_m2 * scale * scale).toFixed(2)),
      },
    ];
    const label = language === "fr" ? `Modele ${matchedTemplate.label}` : `Template ${matchedTemplate.label}`;
    const structural_score = computeStructuralScore(
      walls.map((w) => ({
        length_m: Math.hypot(w.x2 - w.x1, w.z2 - w.z1),
        thickness_m: w.thickness_m,
        load_bearing: w.load_bearing,
      })),
      zones[0]?.area_m2 ?? 1
    );
    return {
      version: 1,
      meta: {
        label,
        meters_per_plan_unit: 0.01,
        generated_at: new Date().toISOString(),
        source_prompt: prompt.slice(0, 2000),
        project_category: matchedTemplate.category,
        execution_guide: buildDetailedExecutionGuide(matchedTemplate.intent, language),
        structural_score,
      },
      structure: { walls },
      zones,
      logic: {
        openings,
        circulations: [
          {
            id: "c-main",
            label: language === "fr" ? "Circulation principale" : "Main circulation",
            path: [
              [0.4, 0.4],
              [Number(((zones[0]?.polygon[1]?.[0] ?? 2) - 0.4).toFixed(2)), Number(((zones[0]?.polygon[2]?.[1] ?? 2) - 0.4).toFixed(2))],
            ],
            width_m: 1.1,
          },
        ],
      },
    };
  }

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
