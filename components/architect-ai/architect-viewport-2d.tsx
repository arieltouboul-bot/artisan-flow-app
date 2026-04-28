"use client";

import { useMemo } from "react";
import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "@/lib/architect-ai/bim-types";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";

type ArchitectViewport2DProps = {
  schema: ArchitecturalSchema | null;
  materialsById: Map<string, ArchitecturalLibraryRow>;
  cartouche: { projectName: string; clientName: string; scaleText: string; dateText: string };
};

/** Plan de coupe / cotations 2D (XZ → SVG) à partir du schéma BIM. */
export function ArchitectViewport2D({ schema, materialsById, cartouche }: ArchitectViewport2DProps) {
  const { language } = useLanguage();
  const { viewBox, lines, dims, openings, zones } = useMemo(() => {
    if (!schema?.structure.walls.length) {
      return {
        viewBox: "0 0 400 300",
        lines: [] as { x1: number; y1: number; x2: number; y2: number; id: string; hatchStyle: "wood" | "concrete" | "insulation" | "default" }[],
        dims: [] as { x: number; y: number; t: string }[],
        openings: [] as { x: number; y: number; type: "porte" | "fenetre" | "baie"; id: string; r: number }[],
        zones: [] as Array<{ id: string; points: string; secure: boolean }>,
      };
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
    const lines = schema.structure.walls.map((w) => {
      const material = materialsById.get(w.material_ref_id);
      const materialName = (material?.name ?? "").toLowerCase();
      const hatchStyle =
        material?.material_family === "wood"
          ? "wood"
          : material?.material_family === "concrete"
            ? "concrete"
            : materialName.includes("isol")
              ? "insulation"
              : "default";
      return {
      id: w.id,
      x1: toX(w.x1),
      y1: toY(w.z1),
      x2: toX(w.x2),
      y2: toY(w.z2),
      hatchStyle,
    };
    });
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
    const openings = schema.logic.openings
      .map((o) => {
        const wall = schema.structure.walls.find((w) => w.id === o.wall_id);
        if (!wall) return null;
        const dx = wall.x2 - wall.x1;
        const dz = wall.z2 - wall.z1;
        const len = Math.max(Math.hypot(dx, dz), 0.0001);
        const ratio = Math.min(Math.max(o.offset_along_wall_m / len, 0), 1);
        const x = wall.x1 + dx * ratio;
        const z = wall.z1 + dz * ratio;
        return { id: o.id, x: toX(x), y: toY(z), type: o.type, r: 6 };
      })
      .filter((o): o is { x: number; y: number; type: "porte" | "fenetre" | "baie"; id: string; r: number } => !!o);
    const zones = schema.zones.map((z) => ({
      id: z.id,
      points: z.polygon.map(([x, zz]) => `${toX(x)},${toY(zz)}`).join(" "),
      secure: schema.meta.project_category === "safe_room" || z.name.toLowerCase().includes("safe"),
    }));
    const w = (maxX - minX) * scale + 80;
    const h = (maxZ - minZ) * scale + 60;
    return { viewBox: `0 0 ${w} ${h}`, lines, dims, openings, zones };
  }, [materialsById, schema]);

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
          <pattern id="wall-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="10" stroke="#7dd3fc" strokeWidth="1" opacity="0.4" />
          </pattern>
          <pattern id="wall-hatch-concrete" width="8" height="8" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="0.8" fill="#93c5fd" opacity="0.7" />
            <circle cx="6" cy="6" r="0.8" fill="#93c5fd" opacity="0.7" />
          </pattern>
          <pattern id="wall-hatch-wood" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="12" stroke="#f59e0b" strokeWidth="1.1" opacity="0.7" />
          </pattern>
          <pattern id="zone-hatch-secure" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="10" height="10" fill="#1f2937" opacity="0.28" />
            <line x1="0" y1="0" x2="0" y2="10" stroke="#ef4444" strokeWidth="1" opacity="0.55" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bp-grid)" />
        {zones.map((z) => (
          <polygon key={z.id} points={z.points} fill={z.secure ? "url(#zone-hatch-secure)" : "transparent"} />
        ))}
        {lines.map((ln) => (
          <g key={ln.id}>
            {ln.hatchStyle === "insulation" ? (
              <>
                <line x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} stroke="#38bdf8" strokeWidth={7} strokeLinecap="square" />
                <line x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} stroke="#0ea5e9" strokeWidth={3} strokeLinecap="square" />
              </>
            ) : (
              <>
                <line x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} stroke="#38bdf8" strokeWidth={6} strokeLinecap="square" />
                <line
                  x1={ln.x1}
                  y1={ln.y1}
                  x2={ln.x2}
                  y2={ln.y2}
                  stroke={
                    ln.hatchStyle === "wood"
                      ? "url(#wall-hatch-wood)"
                      : ln.hatchStyle === "concrete"
                        ? "url(#wall-hatch-concrete)"
                        : "url(#wall-hatch)"
                  }
                  strokeWidth={6}
                  strokeLinecap="square"
                />
              </>
            )}
          </g>
        ))}
        {openings.map((o) => (
          <g key={o.id}>
            {o.type === "porte" ? (
              <>
                <circle cx={o.x} cy={o.y} r={o.r} fill="none" stroke="#bef264" strokeWidth="1.5" />
                <path d={`M ${o.x} ${o.y} L ${o.x + o.r} ${o.y - o.r}`} stroke="#bef264" strokeWidth="1.5" />
              </>
            ) : (
              <rect x={o.x - o.r} y={o.y - 2} width={o.r * 2} height={4} fill="#93c5fd" />
            )}
          </g>
        ))}
        {dims.map((d, i) => (
          <text key={i} x={d.x} y={d.y} fill="#cbd5e1" fontSize="11" textAnchor="middle" fontFamily="Inter, Arial, sans-serif">
            {d.t}
          </text>
        ))}
      </svg>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-slate-900/80 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-sky-400/90">
        {t("architectPlan2dCaption", language)}
      </div>
      <div className="pointer-events-none absolute bottom-2 right-2 rounded border border-cyan-700/60 bg-slate-950/85 px-3 py-2 text-[10px] text-cyan-200">
        <p>{cartouche.projectName || (schema.meta.label || t("architectPlanNamePh", language)).slice(0, 64)}</p>
        <p>{cartouche.clientName}</p>
        <p>
          {cartouche.dateText} - {cartouche.scaleText}
        </p>
      </div>
    </div>
  );
}
