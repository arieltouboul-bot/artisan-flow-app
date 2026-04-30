import type { ArchitecturalLibraryRow, ArchitecturalSchema, RoomZone } from "./bim-types";
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

export type ArchitectRoom = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  floor_material: string;
};

export type ArchitectTechnicalNode = {
  id: string;
  type: "air_outlet" | "water_inlet" | "light_point";
  x: number;
  y: number;
};

type OllamaPayload = {
  title?: string;
  construction_tree?: {
    structure?: { load_bearing_walls?: OllamaWall[]; slabs?: Array<{ id?: string; material?: string; thickness_m?: number }> };
    compartmentage?: { internal_walls?: OllamaWall[]; sas?: Array<{ id?: string; x?: number; y?: number; width?: number; height?: number }> };
    equipment?: {
      hvac?: Array<{ id?: string; x?: number; y?: number; type?: string }>;
      plumbing?: Array<{ id?: string; x?: number; y?: number; type?: string }>;
      electrical?: Array<{ id?: string; x?: number; y?: number; type?: string }>;
      furniture?: Array<{ id?: string; x?: number; y?: number; type?: string; rotation?: number }>;
    };
  };
  blueprint_2d?: { segments?: OllamaWall[]; openings?: OllamaOpening[] };
  internal_walls?: OllamaWall[];
  flooring?: Array<{
    room_name?: string;
    material?: string;
    texture_type?: "grid" | "diagonal_hatch" | "solid";
  }>;
  rooms?: Array<{
    id?: string;
    name?: string;
    type?: "piece" | "circulation" | "technique" | "exterieur";
    polygon?: [number, number][];
    floor_finish?: "beton_poli" | "dalle_technique" | "carrelage_anti_derapant" | "resine";
    lighting?: "direct" | "indirect";
    ventilation?: "bouche_extraction" | "double_flux";
  }>;
  furniture?: Array<
    ArchitectFurnitureItem & {
      y?: number;
      type?: "bed" | "desk" | "security_panel" | "vent" | "storage";
    }
  >;
  technical_nodes?: Array<{
    id?: string;
    type?: "air_outlet" | "water_inlet" | "light_point";
    x?: number;
    y?: number;
  }>;
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

function normalizeFloorFinish(value?: string): RoomZone["floor_finish"] {
  if (value === "dalle_technique" || value === "carrelage_anti_derapant" || value === "resine") return value;
  return "beton_poli";
}

function normalizeLighting(value?: string): RoomZone["lighting"] {
  return value === "indirect" ? "indirect" : "direct";
}

function normalizeVentilation(value?: string): RoomZone["ventilation"] {
  return value === "double_flux" ? "double_flux" : "bouche_extraction";
}

function areaFromPolygon(poly: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

function buildRequiredZones(minX: number, minZ: number, maxX: number, maxZ: number): ArchitecturalSchema["zones"] {
  const xMid = (minX + maxX) / 2;
  const zMid = (minZ + maxZ) / 2;
  const q = (x1: number, z1: number, x2: number, z2: number): [number, number][] => [
    [x1, z1],
    [x2, z1],
    [x2, z2],
    [x1, z2],
  ];
  const definitions = [
    { name: "SAS de securite", poly: q(minX, minZ, xMid, zMid), floor: "dalle_technique", light: "direct", vent: "bouche_extraction", type: "circulation" },
    { name: "Zone de vie", poly: q(xMid, minZ, maxX, zMid), floor: "beton_poli", light: "indirect", vent: "double_flux", type: "piece" },
    { name: "Stockage technique", poly: q(minX, zMid, xMid, maxZ), floor: "dalle_technique", light: "direct", vent: "bouche_extraction", type: "technique" },
    { name: "Sanitaires", poly: q(xMid, zMid, maxX, maxZ), floor: "carrelage_anti_derapant", light: "direct", vent: "bouche_extraction", type: "technique" },
  ] as const;
  return definitions.map((d, i) => ({
    id: `z-required-${i + 1}`,
    name: d.name,
    type: d.type,
    polygon: d.poly,
    area_m2: Number(areaFromPolygon(d.poly).toFixed(2)),
    floor_finish: d.floor,
    lighting: d.light,
    ventilation: d.vent,
  }));
}

function withRequiredFurniture(items: ArchitectFurnitureItem[], minX: number, minZ: number, maxX: number, maxZ: number): ArchitectFurnitureItem[] {
  const required = [
    { key: "lit", label: "Lit", x: minX + 1.2, z: minZ + 1.2, width_m: 2, depth_m: 1.6, height_m: 0.5 },
    { key: "console", label: "Console de controle", x: maxX - 1.5, z: minZ + 1.2, width_m: 1.4, depth_m: 0.7, height_m: 0.9 },
    { key: "etagere", label: "Etageres de stockage", x: minX + 1.2, z: maxZ - 1.2, width_m: 1.6, depth_m: 0.6, height_m: 2 },
  ];
  const has = (k: string) => items.some((f) => f.label.toLowerCase().includes(k));
  const enriched = [...items];
  for (const req of required) {
    if (!has(req.key)) enriched.push({ id: `f-${req.key}`, ...req });
  }
  return enriched;
}

function safeRoomZonesFromWeb(
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
  webContext: SerperSnippet[]
): ArchitecturalSchema["zones"] {
  const text = webContext.map((s) => `${s.title} ${s.snippet}`).join(" ").toLowerCase();
  const hasAirTopic = text.includes("air") || text.includes("ventilation") || text.includes("filtration");
  const xMid = (minX + maxX) / 2;
  const zMid = (minZ + maxZ) / 2;
  const q = (x1: number, z1: number, x2: number, z2: number): [number, number][] => [
    [x1, z1],
    [x2, z1],
    [x2, z2],
    [x1, z2],
  ];
  const zones: ArchitecturalSchema["zones"] = [
    {
      id: "z-safe-sas",
      name: "SAS de securite",
      type: "circulation",
      polygon: q(minX, minZ, xMid, zMid),
      area_m2: Number(areaFromPolygon(q(minX, minZ, xMid, zMid)).toFixed(2)),
      floor_finish: "dalle_technique",
      lighting: "direct",
      ventilation: "bouche_extraction",
    },
    {
      id: "z-safe-tech",
      name: "Stockage technique",
      type: "technique",
      polygon: q(xMid, minZ, maxX, zMid),
      area_m2: Number(areaFromPolygon(q(xMid, minZ, maxX, zMid)).toFixed(2)),
      floor_finish: "dalle_technique",
      lighting: "direct",
      ventilation: hasAirTopic ? "double_flux" : "bouche_extraction",
    },
    {
      id: "z-safe-life",
      name: "Zone de vie",
      type: "piece",
      polygon: q(minX, zMid, maxX, maxZ),
      area_m2: Number(areaFromPolygon(q(minX, zMid, maxX, maxZ)).toFixed(2)),
      floor_finish: "beton_poli",
      lighting: "indirect",
      ventilation: hasAirTopic ? "double_flux" : "bouche_extraction",
    },
  ];
  zones.push({
    id: "z-safe-wc",
    name: "Sanitaires",
    type: "technique",
    polygon: q(maxX - (maxX - minX) * 0.28, zMid + (maxZ - minZ) * 0.08, maxX - 0.15, maxZ - 0.15),
    area_m2: Number(
      areaFromPolygon(q(maxX - (maxX - minX) * 0.28, zMid + (maxZ - minZ) * 0.08, maxX - 0.15, maxZ - 0.15)).toFixed(2)
    ),
    floor_finish: "carrelage_anti_derapant",
    lighting: "direct",
    ventilation: "bouche_extraction",
  });
  return zones;
}

function extractAirRatioFromWebContext(webContext: SerperSnippet[]): number {
  const text = webContext.map((s) => `${s.title} ${s.snippet}`).join(" ").toLowerCase();
  if (/15\s?m2/.test(text) || /15\s?m²/.test(text)) return 15;
  if (/20\s?m2/.test(text) || /20\s?m²/.test(text)) return 20;
  return 18;
}

function ensureInternalPartitionWalls(
  walls: ArchitecturalSchema["structure"]["walls"],
  minX: number,
  minZ: number,
  maxX: number,
  maxZ: number,
  materialId: string
): ArchitecturalSchema["structure"]["walls"] {
  const xMid = (minX + maxX) / 2;
  const zMid = (minZ + maxZ) / 2;
  const hasVertical = walls.some((w) => Math.abs(w.x1 - w.x2) < 0.02 && Math.abs(w.x1 - xMid) < 0.25);
  const hasHorizontal = walls.some((w) => Math.abs(w.z1 - w.z2) < 0.02 && Math.abs(w.z1 - zMid) < 0.25);
  const next = [...walls];
  if (!hasVertical) {
    next.push({
      id: "w-int-v",
      x1: xMid,
      z1: minZ,
      x2: xMid,
      z2: maxZ,
      height_m: 2.7,
      thickness_m: 0.12,
      load_bearing: false,
      material_ref_id: materialId,
    });
  }
  if (!hasHorizontal) {
    next.push({
      id: "w-int-h",
      x1: minX,
      z1: zMid,
      x2: maxX,
      z2: zMid,
      height_m: 2.7,
      thickness_m: 0.12,
      load_bearing: false,
      material_ref_id: materialId,
    });
  }
  return next;
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
): Promise<{
  schema: ArchitecturalSchema;
  furniture: ArchitectFurnitureItem[];
  rooms: ArchitectRoom[];
  technical_nodes: ArchitectTechnicalNode[];
  construction_tree: Record<string, unknown>;
}> {
  const fallback = materials[0];
  if (!fallback) throw new Error("Catalogue matériaux vide");

  const systemPrompt =
    language === "fr"
      ? `Tu es un architecte. Ne génère pas de boîte vide. Utilise les résultats de recherche fournis pour placer des murs intérieurs, un sol spécifique, une VMC, et du mobilier cohérent.
Tu es aussi architecte d'interieur, ne laisse jamais d'espace vide de plus de 5m2 sans proposer un amenagement ou une cloison.
Retourne UNIQUEMENT du JSON strict.
Respecte ce schema exact:
{
  "title": "string",
  "construction_tree":{"structure":{"load_bearing_walls":[{"id":"lw1","x1":0,"y1":0,"x2":5,"y2":0}],"slabs":[{"id":"s1","material":"beton arme","thickness_m":0.2}]},"compartmentage":{"internal_walls":[{"id":"iw1","x1":2.5,"y1":0,"x2":2.5,"y2":4}],"sas":[{"id":"sas1","x":0,"y":0,"width":1.8,"height":1.6}]},"equipment":{"hvac":[{"id":"v1","x":1.2,"y":0.8,"type":"vmc"}],"plumbing":[{"id":"w1","x":3.5,"y":3.2,"type":"arrivee_eau"}],"electrical":[{"id":"e1","x":2.2,"y":2.1,"type":"point_lumineux"}],"furniture":[{"id":"f1","x":1.1,"y":1.1,"type":"bed","rotation":90}]}}
  "blueprint_2d": { "segments": [{ "id":"w1","x1":0,"y1":0,"x2":5,"y2":0,"height_m":2.8,"thickness_m":0.2,"load_bearing":true,"material_name":"Beton" }], "openings":[{"id":"o1","wall_id":"w1","width_m":0.9,"height_m":2.1,"type":"porte","offset_m":1.0}] },
  "internal_walls":[{"id":"iw1","x1":2.5,"y1":0,"x2":2.5,"y2":4,"height_m":2.7,"thickness_m":0.12,"load_bearing":false,"material_name":"Cloison technique"}],
  "rooms":[{"id":"r1","name":"SAS de securite","x":0,"y":0,"width":2,"height":2,"floor_material":"dalle_technique","type":"circulation","polygon":[[0,0],[2,0],[2,2],[0,2]],"floor_finish":"dalle_technique","lighting":"direct","ventilation":"bouche_extraction"}],
  "flooring":[{"room_name":"SAS de securite","material":"dalle technique","texture_type":"diagonal_hatch"}],
  "furniture":[{"id":"f1","type":"bed","label":"Lit","x":1.2,"y":1.1,"rotation":0,"width_m":2,"depth_m":1.6,"height_m":0.5}],
  "technical_nodes":[{"id":"t1","type":"air_outlet","x":0.7,"y":0.6},{"id":"t2","type":"water_inlet","x":3.4,"y":3.1},{"id":"t3","type":"light_point","x":2.5,"y":2}],
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

  const treeWalls = [
    ...(parsed.construction_tree?.structure?.load_bearing_walls ?? []),
    ...(parsed.construction_tree?.compartmentage?.internal_walls ?? []),
  ];
  const walls = normalizeWalls([...(parsed.blueprint_2d?.segments ?? []), ...(parsed.internal_walls ?? []), ...treeWalls], fallback);
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

  let enforcedWalls = ensureInternalPartitionWalls(walls, minX, minZ, maxX, maxZ, fallback.id);
  const requiredZones =
    projectCategory === "safe_room" ? safeRoomZonesFromWeb(minX, minZ, maxX, maxZ, webContextSnippets) : buildRequiredZones(minX, minZ, maxX, maxZ);
  const roomZones: ArchitecturalSchema["zones"] = (parsed.rooms ?? requiredZones)
    .map((room, i) => {
      const polygon = Array.isArray(room.polygon)
        ? room.polygon
            .map((p) => [Number(p?.[0]), Number(p?.[1])] as [number, number])
            .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))
        : [];
      if (polygon.length < 3) return null;
      return {
        id: room.id || `z-room-${i + 1}`,
        name: room.name || `Zone ${i + 1}`,
        type: room.type ?? "piece",
        polygon,
        area_m2: Number(areaFromPolygon(polygon).toFixed(2)),
        floor_finish: normalizeFloorFinish(room.floor_finish),
        lighting: normalizeLighting(room.lighting),
        ventilation: normalizeVentilation(room.ventilation),
      };
    })
    .filter((z): z is RoomZone => z !== null);

  const requiredNames = new Set(requiredZones.map((z) => z.name.toLowerCase()));
  const roomNames = new Set(roomZones.map((z) => z.name.toLowerCase()));
  const missingRequired = [...requiredNames].some((n) => !roomNames.has(n));
  let zones = missingRequired || roomZones.length === 0 ? requiredZones : roomZones;
  if (parsed.flooring && parsed.flooring.length > 0) {
    const floorByRoom = new Map(parsed.flooring.map((f) => [(f.room_name ?? "").toLowerCase(), f]));
    zones = zones.map((z) => {
      const roomFloor = floorByRoom.get(z.name.toLowerCase());
      if (!roomFloor) return z;
      const finish: ArchitecturalSchema["zones"][number]["floor_finish"] =
        roomFloor.texture_type === "diagonal_hatch" ? "dalle_technique" : "beton_poli";
      return { ...z, floor_finish: finish };
    });
  }

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
    structure: { walls: enforcedWalls },
    zones,
    logic: { openings, circulations: [] },
  };

  const normalizedFurniture = (parsed.furniture ?? [])
    .map((item) => ({ ...item, z: Number.isFinite(item.z) ? item.z : Number(item.y) }))
    .filter(
    (item) =>
      Number.isFinite(item.x) &&
      Number.isFinite(item.z) &&
      Number.isFinite(item.width_m) &&
      Number.isFinite(item.depth_m) &&
      item.width_m > 0 &&
      item.depth_m > 0
  );
  const furniture = withRequiredFurniture(normalizedFurniture, minX, minZ, maxX, maxZ);

  const rooms: ArchitectRoom[] = zones.map((z) => {
    const xsRoom = z.polygon.map((p) => p[0]);
    const ysRoom = z.polygon.map((p) => p[1]);
    return {
      id: z.id,
      name: z.name,
      x: Math.min(...xsRoom),
      y: Math.min(...ysRoom),
      width: Math.max(0.1, Math.max(...xsRoom) - Math.min(...xsRoom)),
      height: Math.max(0.1, Math.max(...ysRoom) - Math.min(...ysRoom)),
      floor_material: z.floor_finish ?? "beton_poli",
    };
  });

  const technical_nodes: ArchitectTechnicalNode[] = (parsed.technical_nodes ?? [])
    .map((node, i) => ({
      id: node.id || `tn-${i + 1}`,
      type: node.type ?? "light_point",
      x: Number(node.x),
      y: Number(node.y),
    }))
    .filter((node) => Number.isFinite(node.x) && Number.isFinite(node.y));
  const occupiedArea = zones.reduce((sum, z) => sum + (z.area_m2 || 0), 0);
  const areaPerOutlet = extractAirRatioFromWebContext(webContextSnippets);
  const requiredAirOutlets = Math.max(1, Math.ceil(occupiedArea / Math.max(10, areaPerOutlet)));
  const existingAir = technical_nodes.filter((n) => n.type === "air_outlet").length;
  for (let i = existingAir; i < requiredAirOutlets; i += 1) {
    technical_nodes.push({
      id: `tn-air-${i + 1}`,
      type: "air_outlet",
      x: minX + 0.6 + i * 0.8,
      y: minZ + 0.6,
    });
  }
  if (!technical_nodes.some((n) => n.type === "water_inlet")) {
    technical_nodes.push({ id: "tn-water", type: "water_inlet", x: maxX - 0.7, y: maxZ - 0.7 });
  }
  if (!technical_nodes.some((n) => n.type === "light_point")) {
    technical_nodes.push({ id: "tn-light", type: "light_point", x: (minX + maxX) / 2, y: (minZ + maxZ) / 2 });
  }

  const construction_tree: Record<string, unknown> = parsed.construction_tree ?? {
    structure: { load_bearing_walls: schema.structure.walls, slabs: [{ id: "slab-default", material: "beton arme", thickness_m: 0.2 }] },
    compartmentage: { internal_walls: schema.structure.walls.filter((w) => !w.load_bearing), sas: rooms.filter((r) => /sas/i.test(r.name)) },
    equipment: {
      hvac: technical_nodes.filter((n) => n.type === "air_outlet"),
      plumbing: technical_nodes.filter((n) => n.type === "water_inlet"),
      electrical: technical_nodes.filter((n) => n.type === "light_point"),
      furniture,
    },
  };

  return { schema, furniture, rooms, technical_nodes, construction_tree };
}
