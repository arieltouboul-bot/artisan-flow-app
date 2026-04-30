"use client";

import { useMemo } from "react";
import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "@/lib/architect-ai/bim-types";
import type { ArchitectFurnitureItem, ArchitectRoom } from "@/lib/architect-ai/ollamaArchitect";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import { BlueprintCanvas } from "./BlueprintCanvas";

type ArchitectViewport2DProps = {
  schema: ArchitecturalSchema | null;
  materialsById: Map<string, ArchitecturalLibraryRow>;
  furniture: ArchitectFurnitureItem[];
  rooms: ArchitectRoom[];
  targetAreaM2?: number | null;
  cartouche: { projectName: string; clientName: string; scaleText: string; dateText: string };
  isGenerating?: boolean;
};

/** Plan de coupe / cotations 2D (XZ → SVG) à partir du schéma BIM. */
export function ArchitectViewport2D({ schema, materialsById, furniture, rooms, targetAreaM2 = null, cartouche, isGenerating = false }: ArchitectViewport2DProps) {
  const { language } = useLanguage();
  const { viewBox, lines, dims, openings, zones, furnitureRects } = useMemo(() => {
    if (!schema?.structure.walls.length) {
      return {
        viewBox: "0 0 400 300",
        lines: [] as {
          x1: number;
          y1: number;
          x2: number;
          y2: number;
          id: string;
          hatchStyle: "bearing" | "metal" | "concrete" | "insulation" | "default";
        }[],
        dims: [] as { x: number; y: number; t: string }[],
        openings: [] as { x: number; y: number; type: "porte" | "fenetre" | "baie"; id: string; r: number }[],
        zones: [] as Array<{
          id: string;
          points: string;
          secure: boolean;
          floor: "beton_poli" | "dalle_technique" | "carrelage_anti_derapant" | "resine";
          type: "piece" | "circulation" | "technique" | "exterieur";
          label: string;
        }>,
        furnitureRects: [] as Array<{ id: string; x: number; y: number; w: number; h: number; label: string }>,
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
        w.load_bearing
          ? "bearing"
          : material?.material_family === "metal"
          ? "metal"
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
      internal: !w.load_bearing,
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
      floor: z.floor_finish ?? "beton_poli",
      type: z.type,
      label: z.name,
    }));
    const w = (maxX - minX) * scale + 80;
    const h = (maxZ - minZ) * scale + 60;
    const furnitureRects = furniture.map((item) => ({
      id: item.id,
      x: toX(item.x),
      y: toY(item.z),
      w: Math.max(4, item.width_m * scale),
      h: Math.max(4, item.depth_m * scale),
      label: item.label,
    }));
    return { viewBox: `0 0 ${w} ${h}`, lines, dims, openings, zones, furnitureRects };
  }, [furniture, materialsById, schema]);

  if (!schema) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-lg border border-slate-700/80 bg-slate-950/80 text-sm text-slate-500">
        {t("architectViewportEmpty", language)}
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-lg border border-slate-700/80 bg-[#0a1020]">
      <BlueprintCanvas viewBox={viewBox} zones={zones} rooms={rooms} lines={lines} openings={openings} furnitureRects={furnitureRects} dims={dims} targetAreaM2={targetAreaM2} />
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
      {isGenerating ? (
        <div className="pointer-events-none absolute inset-0 animate-pulse bg-[linear-gradient(45deg,rgba(103,232,249,0.12)_25%,transparent_25%,transparent_50%,rgba(103,232,249,0.12)_50%,rgba(103,232,249,0.12)_75%,transparent_75%,transparent)] bg-[length:24px_24px]" />
      ) : null}
    </div>
  );
}
