import type { FloorPlanDocument } from "./types";

/** Longueur en cm à partir d’une distance en pixels et du facteur global cmPerPixel */
export function segmentLengthCm(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cmPerPixel: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const px = Math.hypot(dx, dy);
  return px * cmPerPixel;
}

export function segmentLengthM(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cmPerPixel: number
): number {
  return segmentLengthCm(x1, y1, x2, y2, cmPerPixel) / 100;
}

/** Affichage type « 5,00 m » ou « 5.00 m » selon locale */
export function formatLengthMeters(m: number, language: "fr" | "en"): string {
  const n = m.toFixed(2);
  return language === "fr" ? `${n.replace(".", ",")} m` : `${n} m`;
}

export function getCmPerPixel(doc: FloorPlanDocument): number {
  const v = doc.meta.cmPerPixel;
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return 1;
  return v;
}
