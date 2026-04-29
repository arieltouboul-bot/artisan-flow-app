import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "./bim-types";
import type { SerperSnippet } from "@/src/services/serperService";

type OllamaGenerateResponse = { response?: string };

type OllamaWall = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  height_m?: number;
  thickness_m?: number;
  load_bearing?: boolean;
  material_name?: string;
};

type OllamaOpening = {
  id: string;
  wall_id: string;
  width_m: number;
  height_m: number;
  type: "porte" | "fenetre" | "baie";
  offset_m: number;
  material_name?: string;
};

export type ArchitectFurnitureItem = {
  id: string;
  label: string;
  x: number;
  z: number;
  width_m: number;
  depth_m: number;
  height_m: number;
};

type OllamaPayload = {
  title?: string;
  blueprint_2d?: { segments?: OllamaWall[]; openings?: OllamaOpening[] };
  furniture?: ArchitectFurnitureItem[];
  step_by_step?: string[];
};

const OLLAMA_ENDPOINT = "http://localhost:11434/api/generate";
const OLLAMA_MODEL = "llama3.1";

function extractJson(raw: string): string {
  const input = raw.trim();
  if (input.startsWith("{") && input.endsWith("}")) return input;
  const first = input.indexOf("{");
  const last = input.lastIndexOf("}");
  if (first < 0 || last <= first) throw new Error("Sortie JSON Ollama invalide");
  return input.slice(first, last + 1);
}

function findMaterial(materials: ArchitecturalLibraryRow[], name?: string): ArchitecturalLibraryRow | null {
  if (!name) return materials[0] ?? null;
  const q = name.toLowerCase();
  return materials.find((m) => m.name.toLowerCase() === q) ?? materials.find((m) => m.name.toLowerCase().includes(q)) ?? materials[0] ?? null;
}

function normalizeWalls(walls: OllamaWall[], fallback: ArchitecturalLibraryRow): ArchitecturalSchema["structure"]["walls"] {
  const seen = new Set<string>();
  const normalized: ArchitecturalSchema["structure"]["walls"] = [];
  for (const wall of walls) {
    const x1 = Number(wall.x1);
    const z1 = Number(wall.y1);
    const x2 = Number(wall.x2);
    const z2 = Number(wall.y2);
    if (![x1, z1, x2, z2].every(Number.isFinite)) continue;
    const key = `${x1.toFixed(3)}:${z1.toFixed(3)}:${x2.toFixed(3)}:${z2.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push({
      id: wall.id || `w-${normalized.length + 1}`,
      x1,
      z1,
      x2,
      z2,
      height_m: Math.max(2.2, Number(wall.height_m) || 2.8),
      thickness_m: Math.max(0.08, Number(wall.thickness_m) || 0.2),
      load_bearing: Boolean(wall.load_bearing),
      material_ref_id: fallback.id,
    });
  }
  return normalized;
}

export async function checkOllamaHealthArchitect(): Promise<boolean> {
  try {
    const res = await fetch(OLLAMA_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt: "healthcheck", stream: false }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function buildOptimizedSearchQueryWithOllama(
  prompt: string,
  projectCategory: "safe_room" | "house" | "technical_room",
  language: "fr" | "en"
): Promise<string> {
  const queryPrompt =
    language === "fr"
      ? `Tu es expert en recherche web technique construction.
Genere UNE requete Google ultra-ciblee (max 16 mots), sans guillemets ni ponctuation finale.
Objectif: normes, materiaux, securite et bonnes pratiques actualisees pour ${projectCategory}.
Brief: ${prompt}`
      : `Generate one concise Google query for current standards, materials, and safety best practices for ${projectCategory}. Brief: ${prompt}`;

  const res = await fetch(OLLAMA_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      prompt: queryPrompt,
    }),
  });
  if (!res.ok) {
    throw new Error(`Query generation failed (${res.status})`);
  }
  const payload = (await res.json()) as OllamaGenerateResponse;
  const query = (payload.response ?? "").replace(/\s+/g, " ").trim();
  if (!query) throw new Error("Empty web query");
  return query.slice(0, 180);
}

export async function deriveTechnicalKeywordsWithOllama(
  prompt: string,
  projectCategory: "safe_room" | "house" | "technical_room",
  language: "fr" | "en"
): Promise<string[]> {
  const keywordsPrompt =
    language === "fr"
      ? `Tu extrais des mots-cles techniques pour une recherche web.
Retourne UNIQUEMENT une liste JSON de 3 a 6 chaines.
Contexte: ${projectCategory}
Brief: ${prompt}
Exemple: ["isolation phonique safe room","normes survie 2026"]`
      : `Extract 3-6 technical web-search keywords. Return JSON array of strings only. Context: ${projectCategory}. Brief: ${prompt}`;

  const res = await fetch(OLLAMA_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      prompt: keywordsPrompt,
    }),
  });
  if (!res.ok) throw new Error(`Keyword generation failed (${res.status})`);
  const payload = (await res.json()) as OllamaGenerateResponse;
  const raw = payload.response ?? "";
  const first = raw.indexOf("[");
  const last = raw.lastIndexOf("]");
  if (first < 0 || last <= first) throw new Error("Invalid keyword JSON");
  const parsed = JSON.parse(raw.slice(first, last + 1)) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Keywords are not an array");
  const keywords = parsed.map((k) => String(k).trim()).filter((k) => k.length > 0).slice(0, 6);
  if (!keywords.length) throw new Error("Empty keywords");
  return keywords;
}

export async function generateArchitecturalSchemaWithOllamaArchitect(
  prompt: string,
  language: "fr" | "en",
  materials: ArchitecturalLibraryRow[],
  projectCategory: "safe_room" | "house" | "technical_room",
  webContextSnippets: SerperSnippet[] = []
): Promise<{ schema: ArchitecturalSchema; furniture: ArchitectFurnitureItem[] }> {
  const fallback = materials[0];
  if (!fallback) throw new Error("Catalogue matériaux vide");

  const systemPrompt =
    language === "fr"
      ? `Tu es un Senior Security Architect.
Retourne UNIQUEMENT du JSON strict.
Respecte ce schema exact:
{
  "title": "string",
  "blueprint_2d": { "segments": [{ "id":"w1","x1":0,"y1":0,"x2":5,"y2":0,"height_m":2.8,"thickness_m":0.2,"load_bearing":true,"material_name":"Beton" }], "openings":[{"id":"o1","wall_id":"w1","width_m":0.9,"height_m":2.1,"type":"porte","offset_m":1.0}] },
  "furniture":[{"id":"f1","label":"Lit","x":1.2,"z":1.1,"width_m":2,"depth_m":1.6,"height_m":0.5}],
  "step_by_step":["etape 1","etape 2","etape 3"]
}
Contraintes:
- Coordonnees en metres.
- Pas de murs superposes.
- Pas de meuble qui coupe un mur.
- Geometrie orthogonale recommandee pour safe room.
- Utilise ces donnees reelles pour valider la faisabilite technique et le choix des materiaux dans le plan JSON.
- Analyse et exploite "CONTEXTE WEB REEL" pour adapter les materiaux (noms reels + proprietes techniques a jour) et les dispositifs de securite.`
      : `You are a Senior Security Architect. Return strict JSON only with walls/openings/furniture. Keep coherent coordinates, no overlapping walls, furniture must not intersect walls.`;

  const webContextBlock =
    webContextSnippets.length > 0
      ? `\n\nCONTEXTE WEB REEL:\n${webContextSnippets
          .map((s, i) => `${i + 1}. [${s.source}] ${s.title} — ${s.snippet}`)
          .join("\n")}`
      : "";

  const response = await fetch(OLLAMA_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      prompt: `${systemPrompt}\n\nProject category: ${projectCategory}\nUser prompt: ${prompt}${webContextBlock}`,
    }),
  });

  if (!response.ok) throw new Error(`Ollama indisponible (${response.status})`);
  const payload = (await response.json()) as OllamaGenerateResponse;
  const parsed = JSON.parse(extractJson(payload.response ?? "")) as OllamaPayload;

  const walls = normalizeWalls(parsed.blueprint_2d?.segments ?? [], fallback);
  if (!walls.length) throw new Error("Aucun mur genere par Ollama");

  const openings: ArchitecturalSchema["logic"]["openings"] = (parsed.blueprint_2d?.openings ?? []).map((o, i) => ({
    id: o.id || `o-${i + 1}`,
    wall_id: o.wall_id,
    width_m: Math.max(0.5, Number(o.width_m) || 0.9),
    height_m: Math.max(1, Number(o.height_m) || 2.1),
    type: o.type,
    offset_along_wall_m: Math.max(0, Number(o.offset_m) || 0.4),
    material_ref_id: findMaterial(materials, o.material_name)?.id ?? null,
  }));

  const xs = walls.flatMap((w) => [w.x1, w.x2]);
  const zs = walls.flatMap((w) => [w.z1, w.z2]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);

  const schema: ArchitecturalSchema = {
    version: 1,
    meta: {
      label: parsed.title || (language === "fr" ? "Safe Room Concept" : "Safe Room Concept"),
      meters_per_plan_unit: 1,
      generated_at: new Date().toISOString(),
      source_prompt: prompt.slice(0, 2000),
      project_category: projectCategory,
      execution_guide: parsed.step_by_step?.slice(0, 20),
    },
    structure: { walls },
    zones: [
      {
        id: "z-main",
        name: "Zone principale",
        type: "piece",
        polygon: [
          [minX, minZ],
          [maxX, minZ],
          [maxX, maxZ],
          [minX, maxZ],
        ],
        area_m2: Number(Math.max(0.01, (maxX - minX) * (maxZ - minZ)).toFixed(2)),
      },
    ],
    logic: { openings, circulations: [] },
  };

  const furniture = (parsed.furniture ?? []).filter(
    (item) =>
      Number.isFinite(item.x) &&
      Number.isFinite(item.z) &&
      Number.isFinite(item.width_m) &&
      Number.isFinite(item.depth_m) &&
      item.width_m > 0 &&
      item.depth_m > 0
  );

  return { schema, furniture };
}
