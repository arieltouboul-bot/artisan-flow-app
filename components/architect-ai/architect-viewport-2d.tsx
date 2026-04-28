"use client";

import { useMemo } from "react";
import type { ArchitecturalSchema } from "@/lib/architect-ai/bim-types";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";

type ArchitectViewport2DProps = {
  schema: ArchitecturalSchema | null;
};

/** Plan de coupe / cotations 2D (XZ → SVG) à partir du schéma BIM. */
export function ArchitectViewport2D({ schema }: ArchitectViewport2DProps) {
  const { language } = useLanguage();
  const { viewBox, lines, dims } = useMemo(() => {
    if (!schema?.structure.walls.length) {
      return { viewBox: "0 0 400 300", lines: [] as { x1: number; y1: number; x2: number; y2: number; id: string }[], dims: [] as { x: number; y: number; t: string }[] };
    }
    let minX = Infinity,
      minZ = Infinity,
      maxX = -Infinity,
      maxZ = -Infinity;
    for (const w of schema.structure.walls) {
      minX = Math.min(minX, w.x1, w.x2);
      minZ = Math.min(minZ, w.z1, w.z2);
      maxX = Math.max(maxX, w.x1, w.x2);
      maxZ = Math.max(maxZ, w.z1, w.z2);
    }
    const pad = 0.8;
    minX -= pad;
    minZ -= pad;
    maxX += pad;
    maxZ += pad;
    const scale = 220 / Math.max(0.01, maxX - minX);
    const toX = (x: number) => (x - minX) * scale;
    const toY = (z: number) => (maxZ - z) * scale;
    const lines = schema.structure.walls.map((w) => ({
      id: w.id,
      x1: toX(w.x1),
      y1: toY(w.z1),
      x2: toX(w.x2),
      y2: toY(w.z2),
    }));
    const dims = schema.structure.walls.map((w) => {
      const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
      const mx = (w.x1 + w.x2) / 2;
      const mz = (w.z1 + w.z2) / 2;
      return {
        x: toX(mx),
        y: toY(mz) - 8,
        t: `${len.toFixed(2)} m`,
      };
    });
    const w = (maxX - minX) * scale + 80;
    const h = (maxZ - minZ) * scale + 60;
    return { viewBox: `0 0 ${w} ${h}`, lines, dims };
  }, [schema]);

  if (!schema) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/80 text-sm text-slate-500">
        {t("architectViewportEmpty", language)}
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-lg border border-slate-700/80 bg-[#0a1020]">
      <svg viewBox={viewBox} className="h-full w-full text-sky-200/90">
        <defs>
          <pattern id="bp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e3a5f" strokeWidth="0.5" opacity="0.6" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bp-grid)" />
        {lines.map((ln) => (
          <line
            key={ln.id}
            x1={ln.x1}
            y1={ln.y1}
            x2={ln.x2}
            y2={ln.y2}
            stroke="#38bdf8"
            strokeWidth={3}
            strokeLinecap="square"
          />
        ))}
        {dims.map((d, i) => (
          <text key={i} x={d.x} y={d.y} fill="#94a3b8" fontSize="11" textAnchor="middle" fontFamily="system-ui">
            {d.t}
          </text>
        ))}
      </svg>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-slate-900/80 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-sky-400/90">
        {t("architectPlan2dCaption", language)}
      </div>
    </div>
  );
}
