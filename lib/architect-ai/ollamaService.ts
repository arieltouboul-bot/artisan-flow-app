import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "./bim-types";
import { buildDetailedExecutionGuide } from "./architectBrain";

type OllamaGenerateResponse = {
  response?: string;
};

type PlanProWall = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  height_m?: number;
  thickness_m?: number;
  load_bearing?: boolean;
  material_name?: string;
  type_hachure?: string;
  cote_m?: number;
};

type PlanProOpening = {
  id: string;
  wall_id: string;
  width_m: number;
  height_m: number;
  type: "porte" | "fenetre" | "baie";
  offset_m: number;
  material_name?: string;
};

type PlanPro = {
  title?: string;
  blueprint_2d?: {
    segments?: PlanProWall[];
    openings?: PlanProOpening[];
  };
  blueprint_3d?: {
    extrusion_height_m?: number;
    textures?: string[];
  };
  technical_spec_sheet?: Array<{ name: string; category?: string; technical_specs?: string; justification?: string }>;
  step_by_step?: string[];
};

const OLLAMA_ENDPOINT = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "llama3.1";

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first < 0 || last < 0 || last <= first) {
    throw new Error("No JSON object detected in Ollama output");
  }
  return trimmed.slice(first, last + 1);
}

function normalizeCategory(category: "safe_room" | "house" | "technical_room") {
  if (category === "safe_room") return "security";
  if (category === "technical_room") return "storage";
  return "habitation";
}

function findMaterialByName(materials: ArchitecturalLibraryRow[], name?: string): ArchitecturalLibraryRow | null {
  if (!name) return null;
  const q = name.toLowerCase();
  return (
    materials.find((m) => m.name.toLowerCase() === q) ??
    materials.find((m) => m.name.toLowerCase().includes(q) || q.includes(m.name.toLowerCase())) ??
    null
  );
}

function fallbackMaterial(materials: ArchitecturalLibraryRow[]): ArchitecturalLibraryRow | null {
  return materials[0] ?? null;
}

export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const res = await fetch(OLLAMA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: "ping",
        stream: false,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function generateArchitecturalSchemaWithOllama(
  prompt: string,
  language: "fr" | "en",
  materials: ArchitecturalLibraryRow[],
  projectCategory: "safe_room" | "house" | "technical_room"
): Promise<ArchitecturalSchema> {
  const catalogUniversal =
    language === "fr"
      ? "Catalogue Universel: Gros oeuvre (beton,brique,bois), Isolation (laine de roche,chanvre,XPS), Finition (placo,enduit), Toiture (bac acier,tuile,ardoise). Si un materiau exact manque, propose la reference technique la plus proche."
      : "Universal Catalog: Structural (concrete, brick, wood), Insulation (rockwool, hemp, XPS), Finishing (plasterboard, render), Roofing (steel deck, tile, slate). If an exact material is missing, propose the closest technical reference.";

  const catalogRows = materials
    .slice(0, 120)
    .map((m) => `- id=${m.id} | name=${m.name} | category=${m.category ?? ""} | specs=${m.description ?? m.norm_reference ?? ""}`)
    .join("\n");

  const systemPrompt =
    language === "fr"
      ? `Tu es un architecte BIM expert. ${catalogUniversal}
Tu DOIS justifier techniquement chaque materiau choisi en te basant sur les technical_specs du catalogue (ex: "Beton C25/30 car resistance 25MPa requise").
Retourne UNIQUEMENT un JSON valide de type PlanPro:
{
  "title": "string",
  "blueprint_2d": { "segments": [{ "id":"w1","x1":0,"y1":0,"x2":5,"y2":0,"height_m":2.5,"thickness_m":0.2,"load_bearing":true,"material_name":"Beton B40","type_hachure":"cross-hatch","cote_m":5 }], "openings":[{"id":"o1","wall_id":"w1","width_m":0.9,"height_m":2.1,"type":"porte","offset_m":2}] },
  "blueprint_3d": { "extrusion_height_m": 2.5, "textures": ["concrete","plaster"] },
  "technical_spec_sheet": [{ "name":"Beton B40","category":"Gros oeuvre","technical_specs":"...", "justification":"..." }],
  "step_by_step": ["etape 1", "... au moins 15 etapes"]
}
Les coordonnées sont en mètres.`
      : `You are an expert BIM architect. ${catalogUniversal}
You MUST justify each chosen material from technical_specs (example: "Use C25/30 concrete because 25MPa resistance is required").
Return ONLY valid JSON of type PlanPro with segments/openings/spec-sheet and at least 15 construction steps in step_by_step. Coordinates are meters.`;

  const res = await fetch(OLLAMA_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      prompt: `${systemPrompt}\n\nProject type: ${normalizeCategory(projectCategory)}\nUser request: ${prompt}\n\nMaterials:\n${catalogRows}`,
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Ollama HTTP ${res.status}: ${txt.slice(0, 200)}`);
  }
  const payload = (await res.json()) as OllamaGenerateResponse;
  const raw = payload.response ?? "";
  const parsed = JSON.parse(extractJsonObject(raw)) as PlanPro;
  const wallsInput = parsed.blueprint_2d?.segments ?? [];
  const openingsInput = parsed.blueprint_2d?.openings ?? [];
  const fallback = fallbackMaterial(materials);
  if (!wallsInput.length || !fallback) {
    throw new Error("Ollama returned empty blueprint");
  }

  const walls: ArchitecturalSchema["structure"]["walls"] = wallsInput.map((w, index) => {
    const material = findMaterialByName(materials, w.material_name) ?? fallback;
    return {
      id: w.id || `w-${index + 1}`,
      x1: Number(w.x1) || 0,
      z1: Number(w.y1) || 0,
      x2: Number(w.x2) || 0,
      z2: Number(w.y2) || 0,
      height_m: Number(w.height_m) > 0 ? Number(w.height_m) : 2.5,
      thickness_m: Number(w.thickness_m) > 0 ? Number(w.thickness_m) : 0.2,
      load_bearing: !!w.load_bearing,
      material_ref_id: material.id,
    };
  });

  const openings: ArchitecturalSchema["logic"]["openings"] = openingsInput.map((o, index) => ({
    id: o.id || `o-${index + 1}`,
    wall_id: o.wall_id,
    width_m: Number(o.width_m) > 0 ? Number(o.width_m) : 0.9,
    height_m: Number(o.height_m) > 0 ? Number(o.height_m) : 2.1,
    type: o.type ?? "porte",
    offset_along_wall_m: Number(o.offset_m) >= 0 ? Number(o.offset_m) : 0.5,
    material_ref_id: (findMaterialByName(materials, o.material_name) ?? null)?.id ?? null,
  }));

  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const w of walls) {
    minX = Math.min(minX, w.x1, w.x2);
    minZ = Math.min(minZ, w.z1, w.z2);
    maxX = Math.max(maxX, w.x1, w.x2);
    maxZ = Math.max(maxZ, w.z1, w.z2);
  }
  const area = Math.max(0.01, (maxX - minX) * (maxZ - minZ));
  const baseGuide =
    parsed.step_by_step && parsed.step_by_step.length >= 10
      ? parsed.step_by_step.slice(0, 20)
      : buildDetailedExecutionGuide(
          projectCategory === "safe_room" ? "security" : projectCategory === "technical_room" ? "storage" : "habitation",
          language
        );
  const specJustifications = (parsed.technical_spec_sheet ?? [])
    .slice(0, 3)
    .map((s) =>
      language === "fr"
        ? `Choix technique: ${s.name} - ${s.justification ?? "reference catalogue appliquee"}`
        : `Technical choice: ${s.name} - ${s.justification ?? "catalog reference applied"}`
    );
  const guide = [...specJustifications, ...baseGuide].slice(0, 20);

  return {
    version: 1,
    meta: {
      label: parsed.title || (language === "fr" ? "Dossier technique Ollama" : "Ollama technical dossier"),
      meters_per_plan_unit: 1,
      generated_at: new Date().toISOString(),
      source_prompt: prompt.slice(0, 2000),
      project_category: projectCategory,
      execution_guide: guide,
    },
    structure: { walls },
    zones: [
      {
        id: "z-main",
        name: language === "fr" ? "Zone principale" : "Main zone",
        type: "piece",
        polygon: [
          [minX, minZ],
          [maxX, minZ],
          [maxX, maxZ],
          [minX, maxZ],
        ],
        area_m2: Number(area.toFixed(2)),
      },
    ],
    logic: {
      openings,
      circulations: [
        {
          id: "c-main",
          label: language === "fr" ? "Circulation" : "Circulation",
          path: [
            [minX + 0.2, minZ + 0.2],
            [maxX - 0.2, maxZ - 0.2],
          ],
          width_m: 1.1,
        },
      ],
    },
  };
}
