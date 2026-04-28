import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "@/lib/architect-ai/bim-types";
import { buildMockArchitecturalSchema } from "@/lib/architect-ai/mock-schema";
import { generateArchitecturalSchemaWithOpenAI } from "@/lib/architect-ai/openai-bim";

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

    const materialsColumns = "id,ref_code,name,category,material_family,unit,norm_reference,supplier_hint,description";
    const { data: rows, error: materialsErr } = await supabase.from("materials").select(materialsColumns).limit(600);
    let sourceRows = rows;
    let libErr = materialsErr;

    if (libErr) {
      const fallback = await supabase.from("architectural_library").select(materialsColumns).limit(600);
      sourceRows = fallback.data;
      libErr = fallback.error;
    }

    if (libErr) {
      return NextResponse.json({ error: libErr.message }, { status: 500 });
    }

    const allMaterials = (sourceRows ?? []) as ArchitecturalLibraryRow[];
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

    const keywordDriven = /\b(safe|studio|garage|extension|securite|security|stockage)\b/i.test(prompt);
    let schema: ArchitecturalSchema;
    if (keywordDriven) {
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

    return NextResponse.json({ schema, used_materials });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
