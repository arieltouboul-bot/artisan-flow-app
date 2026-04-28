"use client";

import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "./bim-types";

export type GenerateArchitecturalSchemaResult = {
  schema: ArchitecturalSchema;
  used_materials: ArchitecturalLibraryRow[];
};

/**
 * Text-to-BIM : envoie le prompt à `/api/architect/generate` (OpenAI + catalogue Supabase, ou mock).
 */
export async function generateArchitecturalSchema(
  prompt: string,
  language: "fr" | "en"
): Promise<GenerateArchitecturalSchemaResult> {
  const res = await fetch("/api/architect/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as GenerateArchitecturalSchemaResult;
}
