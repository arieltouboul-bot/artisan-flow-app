"use client";

import { forwardRef, useMemo } from "react";
import { Stage, Layer, Line, Text, Group } from "react-konva";
import type { Stage as KonvaStage } from "konva/lib/Stage";
import { FLOOR_PLAN_GRID_PX } from "@/lib/floor-plan/constants";
import type { FloorPlanDocument, PlanElement } from "@/lib/floor-plan/types";
import { formatLengthMeters, segmentLengthM } from "@/lib/floor-plan/scale";
import type { Point } from "@/lib/floor-plan/snapping";

type FloorPlanCanvasProps = {
  width: number;
  height: number;
  document: FloorPlanDocument;
  draftStart: Point | null;
  draftEnd: Point | null;
  wallLengthLabel: string | null;
  language: "fr" | "en";
  onPointerDown: (p: Point) => void;
  onPointerMove: (p: Point) => void;
  onPointerUp: () => void;
};

function strokeForWall(el: PlanElement, cmPerPixel: number): number {
  const w = Math.max(el.proprietes.epaisseur_cm || 10, 5);
  const px = Math.max(2, w / cmPerPixel);
  return Math.min(px, 24);
}

export const FloorPlanCanvas = forwardRef<KonvaStage, FloorPlanCanvasProps>(function FloorPlanCanvas(
  { width, height, document, draftStart, draftEnd, wallLengthLabel, language, onPointerDown, onPointerMove, onPointerUp },
  ref
) {
  const cm = document.meta.cmPerPixel;

  const gridLines = useMemo(() => {
    const lines: { points: number[]; key: string }[] = [];
    for (let x = 0; x <= width; x += FLOOR_PLAN_GRID_PX) {
      lines.push({ points: [x, 0, x, height], key: `v${x}` });
    }
    for (let y = 0; y <= height; y += FLOOR_PLAN_GRID_PX) {
      lines.push({ points: [0, y, width, y], key: `h${y}` });
    }
    return lines;
  }, [width, height]);

  const wallElements = document.elements.filter((e) => e.type === "mur");
  const otherElements = document.elements.filter((e) => e.type !== "mur");

  const wallLabels = useMemo(
    () =>
      wallElements.map((w) => {
        const m = segmentLengthM(w.x1, w.y1, w.x2, w.y2, cm);
        const t = formatLengthMeters(m, language);
        return { id: w.id, x: (w.x1 + w.x2) / 2 - 24, y: (w.y1 + w.y2) / 2 - 8, text: t };
      }),
    [wallElements, cm, language]
  );

  const posFromStage = (stage: KonvaStage | null) => {
    const p = stage?.getPointerPosition();
    if (!p) return null;
    return { x: p.x, y: p.y };
  };

  return (
    <Stage
      ref={ref}
      width={width}
      height={height}
      className="rounded-lg border border-slate-200 bg-white shadow-inner"
      onMouseDown={(e) => {
        const st = e.target.getStage();
        const p = posFromStage(st);
        if (p) onPointerDown(p);
      }}
      onMouseMove={(e) => {
        const st = e.target.getStage();
        const p = posFromStage(st);
        if (p) onPointerMove(p);
      }}
      onMouseUp={() => onPointerUp()}
      onMouseLeave={() => onPointerUp()}
    >
      <Layer listening={false}>
        {gridLines.map((g) => (
          <Line key={g.key} points={g.points} stroke="#e8eef7" strokeWidth={1} />
        ))}
      </Layer>
      <Layer>
        {wallElements.map((w) => (
          <Line
            key={w.id}
            points={[w.x1, w.y1, w.x2, w.y2]}
            stroke="#1e3a5f"
            strokeWidth={strokeForWall(w, cm)}
            lineCap="square"
            perfectDrawEnabled={false}
          />
        ))}
        {otherElements.map((w) => (
          <Line
            key={w.id}
            points={[w.x1, w.y1, w.x2, w.y2]}
            stroke={w.type === "porte" ? "#b45309" : w.type === "fenetre" ? "#0369a1" : "#64748b"}
            strokeWidth={4}
            dash={w.type === "porte" ? [10, 6] : undefined}
            lineCap="round"
          />
        ))}
        {draftStart && draftEnd && (
          <Group>
            <Line
              points={[draftStart.x, draftStart.y, draftEnd.x, draftEnd.y]}
              stroke="#2563eb"
              strokeWidth={3}
              dash={[8, 6]}
              lineCap="round"
            />
            {wallLengthLabel && (
              <Text
                text={wallLengthLabel}
                x={(draftStart.x + draftEnd.x) / 2 - 28}
                y={(draftStart.y + draftEnd.y) / 2 - 18}
                width={80}
                fontSize={12}
                fill="#1d4ed8"
                fontStyle="600"
              />
            )}
          </Group>
        )}
      </Layer>
      <Layer listening={false}>
        {wallLabels.map((lb) => (
          <Text key={lb.id} text={lb.text} x={lb.x} y={lb.y} fontSize={10} fill="#475569" />
        ))}
      </Layer>
    </Stage>
  );
});
