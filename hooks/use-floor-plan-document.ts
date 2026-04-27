"use client";

/**
 * @deprecated Préférez `useFloorPlan` depuis `@/hooks/use-floor-plan`.
 * Alias conservé pour ne pas casser les imports existants.
 */
export type { FloorPlanRow, UseFloorPlanOptions as UseFloorPlanDocumentOptions } from "./use-floor-plan";
export { useFloorPlan, useFloorPlan as useFloorPlanDocument, parsePlanJson } from "./use-floor-plan";
