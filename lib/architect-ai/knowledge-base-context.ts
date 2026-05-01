import type { SupabaseClient } from "@supabase/supabase-js";

const STOP_WORDS = new Set([
  "pour",
  "avec",
  "dans",
  "une",
  "des",
  "les",
  "plan",
  "plans",
  "creer",
  "generer",
  "maison",
  "room",
]);

/**
 * Récupère des entrées pertinentes de ai_knowledge_base pour enrichir le raisonnement Ollama.
 */
export async function fetchAiKnowledgeBaseContext(supabase: SupabaseClient, prompt: string, limit = 8): Promise<string> {
  const tokens = prompt
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 4 && !STOP_WORDS.has(t))
    .slice(0, 8);
  const safeTokens = tokens.map((t) => t.replace(/[^a-z0-9_-]/gi, "")).filter((t) => t.length >= 4).slice(0, 8);
  if (!safeTokens.length) return "";
  const orFilter = safeTokens.map((t) => `subject.ilike.%${t}%`).join(",");
  try {
    const { data, error } = await supabase.from("ai_knowledge_base").select("subject,content,source").or(orFilter).limit(limit);
    if (error || !data?.length) return "";
    return (data as Array<{ subject?: string; content?: string; source?: string }>)
      .map((row) => {
        const s = typeof row.subject === "string" ? row.subject : "";
        const c = typeof row.content === "string" ? row.content.slice(0, 420) : "";
        const src = typeof row.source === "string" ? row.source : "kb";
        return `- [${src}] ${s}: ${c}`;
      })
      .join("\n");
  } catch {
    return "";
  }
}
