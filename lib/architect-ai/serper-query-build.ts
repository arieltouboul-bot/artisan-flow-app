/**
 * Construit une requête de recherche web déterministe à partir du prompt utilisateur,
 * avant ou en complément d'une requête générée par Ollama.
 */
export function buildDeterministicSerperQueryFromPrompt(
  prompt: string,
  projectCategory: "safe_room" | "house" | "technical_room"
): string {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  const areaRaw =
    normalized.match(/(\d+(?:[.,]\d+)?)\s*m(?:²|\^?2\b)/i)?.[1]?.replace(",", ".") ??
    normalized.match(/(\d+(?:[.,]\d+)?)\s*m2\b/i)?.[1]?.replace(",", ".");
  const areaBit = areaRaw && Number.isFinite(Number(areaRaw)) ? `${areaRaw}m2` : "";
  const lower = normalized.toLowerCase();
  let layout = "layout technique";
  if (/bunker|safe room|safe-room|\bsas\b|panic room|\bpanic\b|refuge|blinde/.test(lower)) layout += " bunker safe-room sas";
  if (/local technique|technical room|serveur|datacenter|cfe/.test(lower)) layout += " local technique serveur";
  if (/maison|logement|appartement|extension/.test(lower)) layout += " logement residentiel";
  const pc = projectCategory.replace(/_/g, " ");
  const q = `${layout} ${pc} ${areaBit} normes 2026 ${normalized.slice(0, 100)}`;
  return q.replace(/\s+/g, " ").trim().slice(0, 220);
}
