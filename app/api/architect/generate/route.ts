import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "@/lib/architect-ai/bim-types";
import { buildMockArchitecturalSchema } from "@/lib/architect-ai/mock-schema";
import { generateArchitecturalSchemaWithOpenAI } from "@/lib/architect-ai/openai-bim";
import {
  deriveTechnicalKeywordsWithOllama,
  buildOptimizedSearchQueryWithOllama,
  checkOllamaHealthArchitect,
  generateArchitecturalSchemaWithOllamaArchitect,
  type ArchitectRoom,
  type ArchitectTechnicalNode,
  type ArchitectFurnitureItem,
} from "@/lib/architect-ai/ollamaArchitect";
import { searchSerperSnippets, type SerperSnippet } from "@/src/services/serperService";

function collectUsedMaterialIds(schema: ArchitecturalSchema): Set<string> {
  const ids = new Set<string>();
  for (const w of schema.structure.walls) ids.add(w.material_ref_id);
  for (const o of schema.logic.openings) {
    if (o.material_ref_id) ids.add(o.material_ref_id);
  }
  return ids;
}

function validateSchemaForDb(schema: ArchitecturalSchema) {
  const issues: string[] = [];
  if (!schema.meta.label?.trim()) issues.push("meta.label missing");
  if (!schema.structure.walls.length) issues.push("no walls generated");
  for (const wall of schema.structure.walls) {
    if (!wall.material_ref_id) issues.push(`wall ${wall.id} missing material_ref_id`);
    if (!Number.isFinite(wall.height_m) || !Number.isFinite(wall.thickness_m)) {
      issues.push(`wall ${wall.id} has invalid geometry`);
    }
  }
  return issues;
}

function parseTechnicalSpecs(raw: unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      prompt?: string;
      language?: "fr" | "en";
      projectCategory?: "safe_room" | "house" | "technical_room";
    };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const language = body.language === "en" ? "en" : "fr";
    const projectCategory =
      body.projectCategory === "safe_room" || body.projectCategory === "technical_room" ? body.projectCategory : "house";
    if (!prompt) {
      return NextResponse.json({ error: "Prompt requis" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase non configuré" }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    let sourceRows: ArchitecturalLibraryRow[] = [];
    let libErr: { message: string } | null = null;
    const ml = await supabase
      .from("materials_library")
      .select("id,user_id,name,category,technical_specs")
      .order("name", { ascending: true })
      .limit(600);
    if (!ml.error && ml.data) {
      sourceRows = (ml.data as Array<Record<string, unknown>>).map((row) => {
        const specs = parseTechnicalSpecs(row.technical_specs);
        const specsText = specs ? JSON.stringify(specs).slice(0, 500) : null;
        const category = (row.category as string | null) ?? "general";
        const lowered = `${category} ${specsText ?? ""}`.toLowerCase();
        const family: ArchitecturalLibraryRow["material_family"] = lowered.includes("beton")
          ? "concrete"
          : lowered.includes("acier") || lowered.includes("metal")
            ? "metal"
            : lowered.includes("bois")
              ? "wood"
              : lowered.includes("tuile") || lowered.includes("ardoise")
                ? "ceramic"
                : "other";
        return {
          id: (row.id as string) ?? crypto.randomUUID(),
          ref_code: `ML-${String(row.id ?? "").slice(0, 8)}`,
          name: (row.name as string) ?? "Materiau",
          category,
          material_family: family,
          unit: "u",
          norm_reference: null,
          supplier_hint: null,
          description: specsText,
          technical_specs: specs,
        };
      });
    } else {
      const materialsColumns = "id,ref_code,name,category,material_family,unit,norm_reference,supplier_hint,description";
      const { data: rows, error: materialsErr } = await supabase.from("materials").select(materialsColumns).limit(600);
      if (!materialsErr && rows) {
        sourceRows = rows as ArchitecturalLibraryRow[];
      } else {
        const fallback = await supabase.from("architectural_library").select(materialsColumns).limit(600);
        sourceRows = (fallback.data ?? []) as ArchitecturalLibraryRow[];
        libErr = fallback.error ? { message: fallback.error.message } : materialsErr ? { message: materialsErr.message } : null;
      }
    }

    if (libErr && sourceRows.length === 0) {
      return NextResponse.json({ error: libErr.message }, { status: 500 });
    }

    const allMaterials = sourceRows;
    const securityMaterials = allMaterials.filter((m) => {
      const haystack = `${m.category ?? ""} ${m.name} ${m.description ?? ""}`.toLowerCase();
      return (
        haystack.includes("sécurité") ||
        haystack.includes("securite") ||
        haystack.includes("security") ||
        haystack.includes("blind") ||
        haystack.includes("armé") ||
        haystack.includes("arme")
      );
    });
    const materials =
      projectCategory === "safe_room" && securityMaterials.length > 0 ? securityMaterials : allMaterials;

    const keywordDriven = /\b(safe|studio|garage|extension|securite|security|stockage|bunker)\b/i.test(prompt);
    let schema: ArchitecturalSchema;
    let furniture: ArchitectFurnitureItem[] = [];
    let rooms: ArchitectRoom[] = [];
    let technicalNodes: ArchitectTechnicalNode[] = [];
    let webContextSnippets: SerperSnippet[] = [];
    let ragKeywords: string[] = [];
    let ragQuery: string | null = null;
    const thought_steps: string[] = [];
    const ollamaReady = await checkOllamaHealthArchitect();
    let warning: string | null = null;
    if (ollamaReady) {
      try {
        let optimizedQuery = "";
        try {
          thought_steps.push("Recherche web en cours...");
          ragKeywords = await deriveTechnicalKeywordsWithOllama(prompt, projectCategory, language);
          optimizedQuery = await buildOptimizedSearchQueryWithOllama(prompt, projectCategory, language);
          if (ragKeywords.length > 0) {
            optimizedQuery = `${optimizedQuery} ${ragKeywords.join(" ")}`.slice(0, 220);
          }
          ragQuery = optimizedQuery;
        } catch {
          optimizedQuery = `normes ${projectCategory} materiaux dispositifs securite`;
          ragQuery = optimizedQuery;
        }
        try {
          webContextSnippets = await searchSerperSnippets(optimizedQuery);
          thought_steps.push("Analyse structurelle...");
          console.log("[architect.generate] web context received", {
            query: optimizedQuery,
            count: webContextSnippets.length,
            sources: webContextSnippets.map((s) => s.source),
          });
        } catch (serperError) {
          console.error("[architect.generate] serper unavailable", serperError);
          warning = "Contexte web indisponible, generation basee sur connaissances internes";
          webContextSnippets = [];
        }
        thought_steps.push("Optimisation du mobilier...");
        const generated = await generateArchitecturalSchemaWithOllamaArchitect(
          prompt,
          language,
          materials,
          projectCategory,
          webContextSnippets
        );
        schema = generated.schema;
        furniture = generated.furniture;
        rooms = generated.rooms;
        technicalNodes = generated.technical_nodes;
      } catch (ollamaError) {
        console.error("[architect.generate] ollama generation failed", ollamaError);
        warning = "Veuillez verifier qu'Ollama est lance";
        schema = buildMockArchitecturalSchema(prompt, language, materials, projectCategory);
      }
    } else if (keywordDriven) {
      warning = "Veuillez verifier qu'Ollama est lance";
      schema = buildMockArchitecturalSchema(prompt, language, materials, projectCategory);
    } else if (process.env.OPENAI_API_KEY) {
      try {
        schema = await generateArchitecturalSchemaWithOpenAI(prompt, language, materials, projectCategory);
      } catch {
        schema = buildMockArchitecturalSchema(prompt, language, materials, projectCategory);
      }
    } else {
      schema = buildMockArchitecturalSchema(prompt, language, materials, projectCategory);
    }
    schema = { ...schema, meta: { ...schema.meta, project_category: projectCategory } };
    const issues = validateSchemaForDb(schema);
    if (issues.length > 0) {
      console.error("[architect.generate] schema validation issues", {
        projectCategory,
        promptPreview: prompt.slice(0, 180),
        issues,
      });
    }

    const usedIds = collectUsedMaterialIds(schema);
    const used_materials = materials.filter((m) => usedIds.has(m.id));

    return NextResponse.json({
      schema,
      used_materials,
      warning,
      furniture,
      rooms,
      technical_nodes: technicalNodes,
      web_context_snippets: webContextSnippets,
      rag_keywords: ragKeywords,
      rag_query: ragQuery,
      thought_steps,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
