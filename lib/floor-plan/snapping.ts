import { FLOOR_PLAN_GRID_PX, FLOOR_PLAN_SNAP_ENDPOINT_PX } from "./constants";
import type { PlanElement } from "./types";

export type Point = { x: number; y: number };

function snapScalar(v: number, grid: number): number {
  return Math.round(v / grid) * grid;
}

export function snapPointToGrid(p: Point, gridPx: number = FLOOR_PLAN_GRID_PX): Point {
  return { x: snapScalar(p.x, gridPx), y: snapScalar(p.y, gridPx) };
}

function wallEndpoints(el: PlanElement): [Point, Point][] {
  if (el.type !== "mur") return [];
  return [
    [{ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }],
  ];
}

/** Aimante un point sur les extrémités des murs existants si assez proche */
export function snapPointToWallEndpoints(
  p: Point,
  walls: PlanElement[],
  thresholdPx: number = FLOOR_PLAN_SNAP_ENDPOINT_PX
): Point {
  let best: Point = p;
  let bestD = thresholdPx;
  for (const w of walls) {
    if (w.type !== "mur") continue;
    const ends: Point[] = [
      { x: w.x1, y: w.y1 },
      { x: w.x2, y: w.y2 },
    ];
    for (const e of ends) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < bestD) {
        bestD = d;
        best = { ...e };
      }
    }
  }
  return best;
}

/**
 * Force un segment horizontal ou vertical (angles 90°) depuis `origin` vers `raw`.
 * Choisit l’axe dominant (plus long déplacement) pour coller au comportement « plan droit ».
 */
export function orthogonalizeEndPoint(origin: Point, raw: Point): Point {
  const dx = raw.x - origin.x;
  const dy = raw.y - origin.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return { x: raw.x, y: origin.y };
  }
  return { x: origin.x, y: raw.y };
}

/** Chaîne : grille → aimant extrémités → orthogonal 90° */
export function snapWallDrawPoint(origin: Point, raw: Point, existingWalls: PlanElement[]): Point {
  const onGrid = snapPointToGrid(raw);
  const snappedEnd = snapPointToWallEndpoints(onGrid, existingWalls);
  return orthogonalizeEndPoint(origin, snappedEnd);
}

export function snapWallStartPoint(raw: Point, existingWalls: PlanElement[]): Point {
  const onGrid = snapPointToGrid(raw);
  return snapPointToWallEndpoints(onGrid, existingWalls);
}
