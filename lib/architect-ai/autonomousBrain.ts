import type { ArchitecturalLibraryRow } from "./bim-types";
import { buildDeterministicSerperQueryFromPrompt } from "./serper-query-build";
import type { SerperSnippet } from "@/src/services/serperService";
import { searchSerperSnippets } from "@/src/services/serperService";

export type AutonomousBrainResult = {
  optimizedQuery: string;
  standards: string[];
  securityConstraints: string[];
  recommendedMaterials: string[];
  webInsights: SerperSnippet[];
  enrichedMaterials: ArchitecturalLibraryRow[];
  rareMaterialDetected: string | null;
};

type SupabaseLikeClient = {
  from: (table: string) => {
    select?: (columns: string) => {
      ilike: (column: string, value: string) => {
        limit: (n: number) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }>;
      };
    };
    insert: (rows: Array<Record<string, unknown>>) => Promise<{ error: { message: string } | null }>;
  };
};

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

function similarityScore(queryTokens: string[], text: string): number {
  const target = new Set(tokenize(text));
  if (target.size === 0) return 0;
  let hit = 0;
  for (const q of queryTokens) if (target.has(q)) hit += 1;
  return hit / Math.max(1, target.size);
}

function pickTopSimilarMaterials(prompt: string, materials: ArchitecturalLibraryRow[], limit = 6): ArchitecturalLibraryRow[] {
  const qTokens = tokenize(prompt);
  return materials
    .map((m) => ({
      material: m,
      score: similarityScore(qTokens, `${m.name} ${m.category ?? ""} ${m.description ?? ""}`),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.material);
}

function detectRareMaterial(prompt: string): string | null {
  const lower = prompt.toLowerCase();
  const explicit = lower.match(/alliage\s+[a-z0-9-]+/i);
  if (explicit?.[0]) return explicit[0];
  const hybrid = lower.match(/[a-z0-9]+-[a-z0-9]+/i);
  if (hybrid?.[0] && /titane|carbone|kevlar|composite/.test(hybrid[0])) return hybrid[0];
  return null;
}

function insightsToTopics(insights: SerperSnippet[]): { standards: string[]; securityConstraints: string[]; recommendedMaterials: string[] } {
  const standards: string[] = [];
  const securityConstraints: string[] = [];
  const recommendedMaterials: string[] = [];
  for (const item of insights) {
    const text = `${item.title} ${item.snippet}`.toLowerCase();
    if (/norme|code|dtu|iso|reglement/.test(text)) standards.push(item.snippet);
    if (/secur|sas|intrusion|blind|resistan|decontamination/.test(text)) securityConstraints.push(item.snippet);
    if (/beton|acier|composite|titane|carbone|isolant|ventilation/.test(text)) recommendedMaterials.push(item.snippet);
  }
  return {
    standards: standards.slice(0, 5),
    securityConstraints: securityConstraints.slice(0, 5),
    recommendedMaterials: recommendedMaterials.slice(0, 5),
  };
}

function naiveEmbedding(text: string): number[] {
  const vec = new Array<number>(16).fill(0);
  for (let i = 0; i < text.length; i += 1) vec[i % 16] += text.charCodeAt(i) / 255;
  return vec.map((x) => Number((x / Math.max(1, text.length / 8)).toFixed(6)));
}

async function maybeInsertRareMaterial(
  supabase: SupabaseLikeClient,
  rareMaterial: string,
  webInsights: SerperSnippet[]
): Promise<ArchitecturalLibraryRow | null> {
  const specs = {
    source: "serper",
    snippets: webInsights.slice(0, 3),
    updated_at: new Date().toISOString(),
  };
  const row: ArchitecturalLibraryRow = {
    id: crypto.randomUUID(),
    ref_code: `WEB-${rareMaterial.slice(0, 8).toUpperCase()}`,
    name: rareMaterial,
    category: "material_rare",
    material_family: "other",
    unit: "u",
    norm_reference: null,
    supplier_hint: null,
    description: webInsights[0]?.snippet ?? `Materiau enrichi via web: ${rareMaterial}`,
    technical_specs: specs,
  };
  const kb = supabase.from("ai_knowledge_base");
  const maybeFind = kb.select?.("id");
  if (maybeFind) {
    const existing = await maybeFind.ilike("subject", `%${rareMaterial}%`).limit(1);
    if (!existing.error && existing.data && existing.data.length > 0) return row;
  }

  const { error } = await kb.insert([
    {
      id: crypto.randomUUID(),
      subject: rareMaterial,
      content: JSON.stringify(specs),
      source: "serper",
      embedding: naiveEmbedding(`${rareMaterial} ${webInsights.map((w) => w.snippet).join(" ")}`),
      created_at: new Date().toISOString(),
    },
  ]);
  if (error) return null;
  return row;
}

export async function runAutonomousBrain(params: {
  prompt: string;
  projectCategory: "safe_room" | "house" | "technical_room";
  materials: ArchitecturalLibraryRow[];
  supabase: SupabaseLikeClient;
}): Promise<AutonomousBrainResult> {
  const { prompt, projectCategory, materials, supabase } = params;
  const rareMaterial = detectRareMaterial(prompt);
  const optimizedQuery = buildDeterministicSerperQueryFromPrompt(prompt, projectCategory);
  const webInsights = await searchSerperSnippets(optimizedQuery);
  const topSimilar = pickTopSimilarMaterials(prompt, materials);
  const enriched = [...materials];

  if (rareMaterial) {
    const hasAlready = materials.some((m) => m.name.toLowerCase().includes(rareMaterial.toLowerCase()));
    if (!hasAlready) {
      const inserted = await maybeInsertRareMaterial(supabase, rareMaterial, webInsights);
      if (inserted) enriched.push(inserted);
    }
  }

  const topics = insightsToTopics(webInsights);
  if (topics.recommendedMaterials.length === 0 && topSimilar.length > 0) {
    topics.recommendedMaterials.push(...topSimilar.map((m) => `${m.name}: ${m.description ?? "materiau catalogue"}`).slice(0, 5));
  }

  return {
    optimizedQuery,
    standards: topics.standards,
    securityConstraints: topics.securityConstraints,
    recommendedMaterials: topics.recommendedMaterials,
    webInsights,
    enrichedMaterials: enriched,
    rareMaterialDetected: rareMaterial,
  };
}
