import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "./bim-types";

export type ArchitectIntent = "security" | "habitation" | "storage";

type BrainTemplate = {
  key: "safe_room" | "studio" | "garage" | "extension";
  intent: ArchitectIntent;
  category: "safe_room" | "house" | "technical_room";
  label: string;
  defaultLoadBearingThicknessM: number;
  defaultPartitionThicknessM: number;
  walls: Array<{
    id: string;
    x1: number;
    z1: number;
    x2: number;
    z2: number;
    load_bearing: boolean;
    material_name: string;
  }>;
  openings: Array<{
    id: string;
    wall_id: string;
    width_m: number;
    height_m: number;
    type: "porte" | "fenetre" | "baie";
    offset_along_wall_m: number;
    material_name: string;
  }>;
  zone: ArchitecturalSchema["zones"][number];
  executionTips: string[];
};

export const ARCHITECT_BRAIN_TEMPLATES: BrainTemplate[] = [
  {
    key: "safe_room",
    intent: "security",
    category: "safe_room",
    label: "Safe Room",
    defaultLoadBearingThicknessM: 0.2,
    defaultPartitionThicknessM: 0.1,
    walls: [
      { id: "w-n", x1: 0, z1: 0, x2: 5, z2: 0, load_bearing: true, material_name: "Béton B40" },
      { id: "w-e", x1: 5, z1: 0, x2: 5, z2: 4, load_bearing: true, material_name: "Béton B40" },
      { id: "w-s", x1: 5, z1: 4, x2: 0, z2: 4, load_bearing: true, material_name: "Béton B40" },
      { id: "w-w", x1: 0, z1: 4, x2: 0, z2: 0, load_bearing: true, material_name: "Béton B40" },
    ],
    openings: [{ id: "o-door", wall_id: "w-s", width_m: 0.9, height_m: 2.1, type: "porte", offset_along_wall_m: 2.5, material_name: "Porte blindée" }],
    zone: { id: "z-safe", name: "Safe Room", type: "piece", polygon: [[0, 0], [5, 0], [5, 4], [0, 4]], area_m2: 20 },
    executionTips: ["Verifiez l'equerrage avant coulage.", "Respectez le temps de sechage du beton.", "Controlez les points de verrouillage."],
  },
  {
    key: "studio",
    intent: "habitation",
    category: "house",
    label: "Studio",
    defaultLoadBearingThicknessM: 0.2,
    defaultPartitionThicknessM: 0.07,
    walls: [
      { id: "w-n", x1: 0, z1: 0, x2: 4.5, z2: 0, load_bearing: true, material_name: "Béton standard" },
      { id: "w-e", x1: 4.5, z1: 0, x2: 4.5, z2: 3.2, load_bearing: true, material_name: "Béton standard" },
      { id: "w-s", x1: 4.5, z1: 3.2, x2: 0, z2: 3.2, load_bearing: false, material_name: "Placo BA13" },
      { id: "w-w", x1: 0, z1: 3.2, x2: 0, z2: 0, load_bearing: true, material_name: "Béton standard" },
    ],
    openings: [{ id: "o-door", wall_id: "w-s", width_m: 0.9, height_m: 2.1, type: "porte", offset_along_wall_m: 1.8, material_name: "Bloc-porte isolant 73" }],
    zone: { id: "z-studio", name: "Studio", type: "piece", polygon: [[0, 0], [4.5, 0], [4.5, 3.2], [0, 3.2]], area_m2: 14.4 },
    executionTips: ["Appliquez un primaire d'accrochage avant finitions.", "Controlez les aplombs des cloisons.", "Testez etancheite menuiseries."],
  },
  {
    key: "garage",
    intent: "storage",
    category: "technical_room",
    label: "Garage",
    defaultLoadBearingThicknessM: 0.2,
    defaultPartitionThicknessM: 0.07,
    walls: [
      { id: "w-n", x1: 0, z1: 0, x2: 6, z2: 0, load_bearing: true, material_name: "Parpaing creux" },
      { id: "w-e", x1: 6, z1: 0, x2: 6, z2: 5, load_bearing: true, material_name: "Parpaing creux" },
      { id: "w-s", x1: 6, z1: 5, x2: 0, z2: 5, load_bearing: true, material_name: "Parpaing creux" },
      { id: "w-w", x1: 0, z1: 5, x2: 0, z2: 0, load_bearing: true, material_name: "Parpaing creux" },
    ],
    openings: [{ id: "o-gate", wall_id: "w-s", width_m: 2.4, height_m: 2.2, type: "baie", offset_along_wall_m: 3, material_name: "Baie coulissante alu 3 rails" }],
    zone: { id: "z-garage", name: "Garage", type: "technique", polygon: [[0, 0], [6, 0], [6, 5], [0, 5]], area_m2: 30 },
    executionTips: ["Verifier support de porte sectionnelle.", "Respecter pentes d'evacuation.", "Proteger angles exposes."],
  },
  {
    key: "extension",
    intent: "habitation",
    category: "house",
    label: "Extension",
    defaultLoadBearingThicknessM: 0.2,
    defaultPartitionThicknessM: 0.07,
    walls: [
      { id: "w-n", x1: 0, z1: 0, x2: 7, z2: 0, load_bearing: true, material_name: "Béton standard" },
      { id: "w-e", x1: 7, z1: 0, x2: 7, z2: 4, load_bearing: true, material_name: "Béton standard" },
      { id: "w-s", x1: 7, z1: 4, x2: 0, z2: 4, load_bearing: false, material_name: "Placo BA13" },
      { id: "w-w", x1: 0, z1: 4, x2: 0, z2: 0, load_bearing: true, material_name: "Béton standard" },
    ],
    openings: [{ id: "o-ext", wall_id: "w-s", width_m: 1.6, height_m: 2.2, type: "baie", offset_along_wall_m: 3.5, material_name: "Baie coulissante alu 3 rails" }],
    zone: { id: "z-extension", name: "Extension", type: "piece", polygon: [[0, 0], [7, 0], [7, 4], [0, 4]], area_m2: 28 },
    executionTips: ["Verifier liaison avec existant.", "Armer les chainages de reprise.", "Traiter ponts thermiques en finitions."],
  },
];

export function detectArchitectTemplate(prompt: string): BrainTemplate {
  const lower = prompt.toLowerCase();
  if (lower.includes("safe") || lower.includes("secur") || lower.includes("bunker")) return ARCHITECT_BRAIN_TEMPLATES[0];
  if (lower.includes("garage") || lower.includes("stock")) return ARCHITECT_BRAIN_TEMPLATES[2];
  if (lower.includes("extension")) return ARCHITECT_BRAIN_TEMPLATES[3];
  return ARCHITECT_BRAIN_TEMPLATES[1];
}

export function matchMaterialByName(materials: ArchitecturalLibraryRow[], name: string): ArchitecturalLibraryRow | null {
  const n = name.toLowerCase();
  return materials.find((m) => m.name.toLowerCase() === n) ?? materials.find((m) => m.name.toLowerCase().includes(n)) ?? null;
}

export function correctedThickness(intent: ArchitectIntent, requestedCm?: number): number {
  const requestedM = requestedCm ? requestedCm / 100 : 0.2;
  if (intent === "security") return Math.max(0.2, requestedM);
  return Math.max(0.07, requestedM);
}

export function buildDetailedExecutionGuide(intent: ArchitectIntent, language: "fr" | "en"): string[] {
  const fr = [
    "Preparation du chantier et verification des cotes.",
    "Implanter les axes et reperes de niveau.",
    "Verifier l'equerrage des fondations.",
    "Installer les armatures et attentes techniques.",
    "Couler ou monter les murs porteurs selon plan.",
    "Controler verticalite et alignement des parois.",
    "Realiser les ouvertures et linteaux.",
    "Poser menuiseries et fermetures de securite.",
    "Appliquer primaire d'accrochage sur supports.",
    "Traiter joints, etancheite et ponts thermiques.",
    "Respecter le temps de sechage du beton.",
    "Executer finitions techniques et protections.",
    "Effectuer controles de conformite et securite.",
  ];
  const en = [
    "Prepare site and verify dimensions.",
    "Set out axes and elevation benchmarks.",
    "Check foundation squareness.",
    "Install reinforcement and technical reservations.",
    "Cast/build load-bearing walls according to plan.",
    "Check wall plumb and alignment.",
    "Create openings and lintels.",
    "Install joinery and security closures.",
    "Apply bonding primer on supports.",
    "Seal joints and thermal bridges.",
    "Respect concrete curing time.",
    "Execute technical finishing and protections.",
    "Run compliance and safety checks.",
  ];
  if (intent === "security") {
    fr.push("Tester les verrouillages et points blindes.");
    en.push("Test armored locking points.");
  }
  return language === "fr" ? fr : en;
}

export function computeStructuralScore(
  walls: Array<{ length_m: number; thickness_m: number; load_bearing: boolean }>,
  targetAreaM2: number
): number {
  const resistance = walls.reduce((sum, w) => {
    const bearingFactor = w.load_bearing ? 1.35 : 0.75;
    return sum + w.length_m * w.thickness_m * bearingFactor;
  }, 0);
  const demand = Math.max(1, targetAreaM2 * 0.65);
  const ratio = resistance / demand;
  return Number(Math.max(0.1, Math.min(1.5, ratio)).toFixed(2));
}
