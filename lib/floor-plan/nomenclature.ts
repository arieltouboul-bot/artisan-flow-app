import { segmentLengthM } from "./scale";
import type { FloorPlanDocument, MaterialRow, NomenclatureLine } from "./types";

/**
 * Agrège une « liste de courses » à partir des éléments dessinés et du catalogue.
 * Les murs : quantité = longueur (m) ; meubles/portes : 1 unité par segment (simplifié).
 */
export function buildNomenclature(
  doc: FloorPlanDocument,
  materialsById: Map<string, MaterialRow>,
  language: "fr" | "en"
): NomenclatureLine[] {
  const cm = doc.meta.cmPerPixel;
  const lines: NomenclatureLine[] = [];
  const key = (materialId: string | null, type: string) => `${materialId ?? "none"}:${type}`;

  const buckets = new Map<
    string,
    { material_id: string | null; type: string; qty: number; length_m: number; label: string; unit: string }
  >();

  for (const el of doc.elements) {
    const mid = el.proprietes.material_id ?? null;
    const mat = mid ? materialsById.get(mid) : undefined;
    const label = mat?.name ?? el.proprietes.materiau ?? (language === "fr" ? "Sans matériau" : "No material");
    const unit = mat?.unit ?? "u";
    const k = key(mid, el.type);
    const len = segmentLengthM(el.x1, el.y1, el.x2, el.y2, cm);

    if (!buckets.has(k)) {
      buckets.set(k, {
        material_id: mid,
        type: el.type,
        qty: 0,
        length_m: 0,
        label,
        unit,
      });
    }
    const b = buckets.get(k)!;
    if (el.type === "mur") {
      b.length_m += len;
      b.qty = b.length_m;
    } else {
      b.qty += 1;
    }
  }

  for (const b of Array.from(buckets.values())) {
    const price = b.material_id ? materialsById.get(b.material_id)?.avg_price_ht : null;
    let estimated: number | undefined;
    if (price != null && Number.isFinite(price)) {
      if (b.type === "mur") {
        estimated = price * b.length_m;
      } else {
        estimated = price * b.qty;
      }
    }
    const detail =
      b.type === "mur"
        ? language === "fr"
          ? `Linéaire total ≈ ${b.length_m.toFixed(2)} m`
          : `Total run ≈ ${b.length_m.toFixed(2)} m`
        : language === "fr"
          ? `${Math.round(b.qty)} unité(s)`
          : `${Math.round(b.qty)} unit(s)`;

    lines.push({
      material_id: b.material_id,
      label: b.label,
      unit: b.unit,
      quantity: b.type === "mur" ? b.length_m : b.qty,
      detail,
      estimated_ht: estimated,
    });
  }

  return lines.sort((a, b) => a.label.localeCompare(b.label));
}

export function collectInstallationNotices(
  doc: FloorPlanDocument,
  materialsById: Map<string, MaterialRow>
): { title: string; body: string; dtu?: string | null }[] {
  const seen = new Set<string>();
  const out: { title: string; body: string; dtu?: string | null }[] = [];
  for (const el of doc.elements) {
    const id = el.proprietes.material_id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const m = materialsById.get(id);
    if (!m?.installation_notice) continue;
    out.push({
      title: m.name,
      body: m.installation_notice,
      dtu: m.dtu_reference,
    });
  }
  return out;
}
