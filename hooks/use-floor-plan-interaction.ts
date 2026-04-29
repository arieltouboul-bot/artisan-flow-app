"use client";

import { useCallback, useState } from "react";
import { snapWallDrawPoint, snapWallStartPoint, type Point } from "@/lib/floor-plan/snapping";
import type { FloorPlanDocument, PlanElement, PlanElementType } from "@/lib/floor-plan/types";
import { formatLengthMeters, segmentLengthM } from "@/lib/floor-plan/scale";

const MIN_WALL_PX = 8;

function newElementId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `el_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export type FloorPlanTool = PlanElementType;

export function useFloorPlanInteraction(
  document: FloorPlanDocument,
  updateDocument: (fn: (d: FloorPlanDocument) => FloorPlanDocument) => void,
  options: { language: "fr" | "en"; defaultMaterialId: string | null; defaultMaterialLabel: string }
) {
  const [tool, setTool] = useState<FloorPlanTool>("mur");
  const [draftStart, setDraftStart] = useState<Point | null>(null);
  const [draftEnd, setDraftEnd] = useState<Point | null>(null);
  const wallLengthLabel =
    draftStart && draftEnd
      ? formatLengthMeters(
          segmentLengthM(draftStart.x, draftStart.y, draftEnd.x, draftEnd.y, document.meta.cmPerPixel),
          options.language
        )
      : null;

  const onPointerDown = useCallback(
    (pos: Point) => {
      const walls = document.elements.filter((e) => e.type === "mur");
      const start = snapWallStartPoint(pos, walls);
      setDraftStart(start);
      setDraftEnd(start);
    },
    [document.elements]
  );

  const onPointerMove = useCallback(
    (pos: Point) => {
      if (!draftStart) return;
      const walls = document.elements.filter((e) => e.type === "mur");
      const snapped = snapWallDrawPoint(draftStart, pos, walls);
      setDraftEnd(snapped);
    },
    [draftStart, document.elements]
  );

  const onPointerUp = useCallback(() => {
    if (!draftStart || !draftEnd) {
      setDraftStart(null);
      setDraftEnd(null);
      return;
    }
    const dx = draftEnd.x - draftStart.x;
    const dy = draftEnd.y - draftStart.y;
    const len = Math.hypot(dx, dy);
    if (len < MIN_WALL_PX) {
      setDraftStart(null);
      setDraftEnd(null);
      return;
    }

    const baseProps = {
      epaisseur_cm: tool === "mur" ? 15 : tool === "porte" ? 12 : tool === "fenetre" ? 8 : 5,
      materiau: options.defaultMaterialLabel,
      material_id: options.defaultMaterialId,
    };

    const el: PlanElement = {
      id: newElementId(),
      type: tool,
      x1: draftStart.x,
      y1: draftStart.y,
      x2: draftEnd.x,
      y2: draftEnd.y,
      proprietes: { ...baseProps },
    };

    updateDocument((d) => ({
      ...d,
      elements: [...d.elements, el],
    }));

    setDraftStart(null);
    setDraftEnd(null);
  }, [draftStart, draftEnd, tool, updateDocument, options.defaultMaterialId, options.defaultMaterialLabel]);

  const cancelDraft = useCallback(() => {
    setDraftStart(null);
    setDraftEnd(null);
  }, []);

  return {
    tool,
    setTool,
    draftStart,
    draftEnd,
    wallLengthLabel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    cancelDraft,
  };
}
