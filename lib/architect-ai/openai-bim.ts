import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "./bim-types";

const SYSTEM_FR = `Tu es un architecte BIM. Réponds UNIQUEMENT par un JSON valide respectant ce schéma TypeScript (version 1) :
{
  version: 1,
  meta: { label: string, meters_per_plan_unit: number, generated_at?: string, source_prompt?: string },
  structure: { walls: Array<{ id, x1, z1, x2, z2, height_m, thickness_m, load_bearing, material_ref_id }> },
  zones: Array<{ id, name, type: 'piece'|'circulation'|'technique'|'exterieur', polygon: [number, number][], area_m2 }>,
  logic: { openings: Array<{ id, wall_id, width_m, height_m, type: 'porte'|'fenetre'|'baie', offset_along_wall_m, material_ref_id? }>, circulations: Array<{ id, label, path: [number, number][], width_m }> }
}
Les coordonnées sont en mètres (plan horizontal XZ). Tu DOIS réutiliser les UUID fournis dans le catalogue pour material_ref_id (exactement ces chaînes).`;

const SYSTEM_EN = `You are a BIM architect. Reply with ONLY valid JSON for the same schema as described (version 1, meters on XZ plane). You MUST use the exact UUID strings from the catalog for material_ref_id.`;

function catalogBlock(materials: ArchitecturalLibraryRow[], lang: "fr" | "en"): string {
  const lines = materials.slice(0, 60).map((m) => {
    const price = m.unit_price_ht != null ? `${m.unit_price_ht} EUR/${m.unit}` : "n/a";
    return `- id=${m.id} | ref=${m.ref_code} | ${m.name} | ${m.material_family} | ${price} | norm=${m.norm_reference ?? ""}`;
  });
  return lang === "fr" ? `Catalogue (extraits) :\n${lines.join("\n")}` : `Catalog excerpt:\n${lines.join("\n")}`;
}

export async function generateArchitecturalSchemaWithOpenAI(
  prompt: string,
  language: "fr" | "en",
  materials: ArchitecturalLibraryRow[],
  projectCategory: "safe_room" | "house" | "technical_room"
): Promise<ArchitecturalSchema> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY manquant");

  const system = language === "fr" ? SYSTEM_FR : SYSTEM_EN;
  const categoryContext =
    projectCategory === "safe_room"
      ? language === "fr"
        ? "Type d'ouvrage: Safe Room. Priorise les matériaux de sécurité (béton armé, porte blindée) et des murs porteurs renforcés."
        : "Project type: Safe Room. Prioritize security materials (reinforced concrete, armored doors) and reinforced load-bearing walls."
      : projectCategory === "technical_room"
        ? language === "fr"
          ? "Type d'ouvrage: Local Technique. Priorise robustesse, maintenance et ventilation."
          : "Project type: Technical Room. Prioritize robustness, maintainability, and ventilation."
        : language === "fr"
          ? "Type d'ouvrage: Maison Individuelle. Optimise confort d'habitation et circulation."
          : "Project type: Detached House. Optimize living comfort and circulation.";
  const user = `${catalogBlock(materials, language)}\n\n${categoryContext}\n\nDemande utilisateur :\n${prompt}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_ARCHITECT_MODEL ?? "gpt-4o-mini",
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("Réponse OpenAI vide");
  const parsed = JSON.parse(raw) as ArchitecturalSchema;
  if (parsed.version !== 1 || !parsed.structure?.walls) throw new Error("JSON BIM invalide");
  return parsed;
}
