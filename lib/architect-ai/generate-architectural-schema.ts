"use client";

import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "./bim-types";
import { buildKnowledgeContext } from "./knowledge-dictionary";

export type GenerateArchitecturalSchemaResult = {
  schema: ArchitecturalSchema;
  used_materials: ArchitecturalLibraryRow[];
  warning?: string | null;
};

export type ArchitecturalProjectCategory = "safe_room" | "house" | "technical_room";

/**
 * Text-to-BIM : envoie le prompt à `/api/architect/generate` (OpenAI + catalogue Supabase, ou mock).
 */
export async function generateArchitecturalSchema(
  prompt: string,
  language: "fr" | "en",
  projectCategory: ArchitecturalProjectCategory
): Promise<GenerateArchitecturalSchemaResult> {
  const enrichedPrompt = `${buildKnowledgeContext(language)}\n\nUser brief:\n${prompt}`;
  const res = await fetch("/api/architect/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: enrichedPrompt, language, projectCategory }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as GenerateArchitecturalSchemaResult;
}
