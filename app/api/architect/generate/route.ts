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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { prompt?: string; language?: "fr" | "en" };
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const language = body.language === "en" ? "en" : "fr";
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

    const { data: rows, error: libErr } = await supabase
      .from("architectural_library")
      .select(
        "id,ref_code,name,category,material_family,unit,unit_price_ht,norm_reference,supplier_hint,description"
      )
      .limit(120);

    if (libErr) {
      return NextResponse.json({ error: libErr.message }, { status: 500 });
    }

    const materials = (rows ?? []) as ArchitecturalLibraryRow[];

    let schema: ArchitecturalSchema;
    if (process.env.OPENAI_API_KEY) {
      try {
        schema = await generateArchitecturalSchemaWithOpenAI(prompt, language, materials);
      } catch {
        schema = buildMockArchitecturalSchema(prompt, language, materials);
      }
    } else {
      schema = buildMockArchitecturalSchema(prompt, language, materials);
    }

    const usedIds = collectUsedMaterialIds(schema);
    const used_materials = materials.filter((m) => usedIds.has(m.id));

    return NextResponse.json({ schema, used_materials });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erreur serveur";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
