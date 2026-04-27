import type { PlanElement } from "./types";

export type RoomAreaEstimate = {
  id: string;
  label: string;
  area_m2: number;
  /** Indique que le résultat repose sur une heuristique grille / inondation */
  approximate: boolean;
};

/**
 * ## Algorithme (estimation surface habitable — version grille + inondation)
 *
 * 1. **Bounding box** : englober tous les murs avec une marge `marginPx`.
 * 2. **Grille** : découper la bbox en cellules carrées de `cellPx` pixels.
 * 3. **Obstacles** : pour chaque mur, tracer le segment sur la grille (Bresenham) avec une demi-épaisseur
 *    en pixels dérivée de `epaisseur_cm` et `cmPerPixel`, afin d’approximer le volume occupé au sol.
 * 4. **Composantes connexes** : pour chaque cellule libre non visitée, lancer un **BFS 4-voisins** et mesurer la taille.
 * 5. **Surface retenue** : la plus grande composante (m²) = `count * (cellPx * cmPerPixel / 100)²`.
 *
 * ### Limites (pour affinage par un expert géométrie)
 * - Plans ouverts : la plus grande composante peut être « tout l’extérieur » ; on utilise `maxFillRatio` pour signaler `approximate`.
 * - Pièces multiples : seule la plus grande zone est retournée ici ; extension possible via graphe dual / cycles orthogonaux.
 * - Portes / ouvertures non modélisées comme trous dans cette V1.
 */
export function estimateLargestEnclosedAreaM2(
  walls: PlanElement[],
  cmPerPixel: number,
  opts?: { cellPx?: number; marginPx?: number; maxFillRatio?: number }
): RoomAreaEstimate[] {
  const cellPx = opts?.cellPx ?? 16;
  const marginPx = opts?.marginPx ?? 40;
  const maxFillRatio = opts?.maxFillRatio ?? 0.92;

  const segs = walls.filter((w) => w.type === "mur");
  if (segs.length === 0) {
    return [];
  }

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const w of segs) {
    minX = Math.min(minX, w.x1, w.x2);
    minY = Math.min(minY, w.y1, w.y2);
    maxX = Math.max(maxX, w.x1, w.x2);
    maxY = Math.max(maxY, w.y1, w.y2);
  }
  minX -= marginPx;
  minY -= marginPx;
  maxX += marginPx;
  maxY += marginPx;

  const cols = Math.max(1, Math.ceil((maxX - minX) / cellPx));
  const rows = Math.max(1, Math.ceil((maxY - minY) / cellPx));
  const obstacle = new Uint8Array(cols * rows);

  const cellIndex = (c: number, r: number) => r * cols + c;
  const worldToCell = (x: number, y: number) => ({
    c: Math.floor((x - minX) / cellPx),
    r: Math.floor((y - minY) / cellPx),
  });

  const markLine = (x0: number, y0: number, x1: number, y1: number, halfWidthCells: number) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      const { c, r } = worldToCell(x, y);
      for (let dc = -halfWidthCells; dc <= halfWidthCells; dc++) {
        for (let dr = -halfWidthCells; dr <= halfWidthCells; dr++) {
          const cc = c + dc;
          const rr = r + dr;
          if (cc >= 0 && cc < cols && rr >= 0 && rr < rows) {
            obstacle[cellIndex(cc, rr)] = 1;
          }
        }
      }
    }
  };

  for (const w of segs) {
    const thickCm = Math.max(w.proprietes.epaisseur_cm || 10, 5);
    const halfPx = Math.max(1, (thickCm / cmPerPixel) * 0.5);
    const halfCells = Math.max(1, Math.ceil(halfPx / cellPx));
    markLine(w.x1, w.y1, w.x2, w.y2, halfCells);
  }

  const visited = new Uint8Array(cols * rows);
  let bestCount = 0;
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  const bfs = (startC: number, startR: number) => {
    if (startC < 0 || startR < 0 || startC >= cols || startR >= rows) return 0;
    const si = cellIndex(startC, startR);
    if (obstacle[si] || visited[si]) return 0;
    const q: number[] = [si];
    visited[si] = 1;
    let count = 0;
    while (q.length) {
      const cur = q.pop()!;
      count++;
      const r0 = Math.floor(cur / cols);
      const c0 = cur % cols;
      for (const [dc, dr] of dirs) {
        const nc = c0 + dc;
        const nr = r0 + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const i = cellIndex(nc, nr);
        if (obstacle[i] || visited[i]) continue;
        visited[i] = 1;
        q.push(i);
      }
    }
    return count;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cnt = bfs(c, r);
      bestCount = Math.max(bestCount, cnt);
    }
  }

  const totalInner = cols * rows;
  const cellM = (cellPx * cmPerPixel) / 100;
  const cellArea = cellM * cellM;
  const area = bestCount * cellArea;
  const fillRatio = totalInner > 0 ? bestCount / totalInner : 0;
  const approximate = fillRatio >= maxFillRatio || bestCount < 4;

  return [
    {
      id: "estimate-main",
      label: "Zone principale (estimée)",
      area_m2: Math.round(area * 100) / 100,
      approximate,
    },
  ];
}
