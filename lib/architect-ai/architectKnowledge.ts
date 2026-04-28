import type { ArchitecturalSchema } from "./bim-types";

type WallTemplate = {
  id: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  height_m: number;
  thickness_m: number;
  load_bearing: boolean;
  material_name: string;
};

type OpeningTemplate = {
  id: string;
  wall_id: string;
  width_m: number;
  height_m: number;
  type: "porte" | "fenetre" | "baie";
  offset_along_wall_m: number;
  material_name?: string;
};

type ArchitectTemplate = {
  key: "safe" | "studio" | "garage";
  label: string;
  category: "safe_room" | "house" | "technical_room";
  walls: WallTemplate[];
  openings: OpeningTemplate[];
  guide: string[];
  zones: ArchitecturalSchema["zones"];
  securityMaterials: string[];
};

export const ARCHITECT_KNOWLEDGE: ArchitectTemplate[] = [
  {
    key: "safe",
    label: "Safe Room Standard",
    category: "safe_room",
    securityMaterials: ["acier", "beton b40", "porte blindee"],
    walls: [
      { id: "w-n", x1: 0, z1: 0, x2: 5, z2: 0, height_m: 3, thickness_m: 0.3, load_bearing: true, material_name: "Béton B40" },
      { id: "w-e", x1: 5, z1: 0, x2: 5, z2: 4, height_m: 3, thickness_m: 0.3, load_bearing: true, material_name: "Béton B40" },
      { id: "w-s", x1: 5, z1: 4, x2: 0, z2: 4, height_m: 3, thickness_m: 0.3, load_bearing: true, material_name: "Béton B40" },
      { id: "w-w", x1: 0, z1: 4, x2: 0, z2: 0, height_m: 3, thickness_m: 0.3, load_bearing: true, material_name: "Béton B40" },
    ],
    openings: [{ id: "o-safe-door", wall_id: "w-s", width_m: 0.9, height_m: 2.1, type: "porte", offset_along_wall_m: 2, material_name: "Porte blindée" }],
    zones: [
      { id: "z-safe", name: "Safe Core", type: "piece", polygon: [[0, 0], [5, 0], [5, 4], [0, 4]], area_m2: 20 },
    ],
    guide: [
      "Preparation: verifier support, ancrages et reseaux.",
      "Gros Oeuvre: couler voiles beton B40 et renforcer par treillis acier.",
      "Finitions de securite: poser porte blindee, etancheite et controle final.",
    ],
  },
  {
    key: "studio",
    label: "Studio Compact",
    category: "house",
    securityMaterials: ["beton", "isolant", "menuiserie"],
    walls: [
      { id: "w-n", x1: 0, z1: 0, x2: 4.5, z2: 0, height_m: 2.7, thickness_m: 0.2, load_bearing: true, material_name: "Béton standard" },
      { id: "w-e", x1: 4.5, z1: 0, x2: 4.5, z2: 3.2, height_m: 2.7, thickness_m: 0.2, load_bearing: true, material_name: "Béton standard" },
      { id: "w-s", x1: 4.5, z1: 3.2, x2: 0, z2: 3.2, height_m: 2.7, thickness_m: 0.2, load_bearing: false, material_name: "Béton standard" },
      { id: "w-w", x1: 0, z1: 3.2, x2: 0, z2: 0, height_m: 2.7, thickness_m: 0.2, load_bearing: true, material_name: "Béton standard" },
    ],
    openings: [{ id: "o-studio-door", wall_id: "w-s", width_m: 0.9, height_m: 2.1, type: "porte", offset_along_wall_m: 1.8, material_name: "Bloc-porte isolant 73" }],
    zones: [
      { id: "z-studio", name: "Studio", type: "piece", polygon: [[0, 0], [4.5, 0], [4.5, 3.2], [0, 3.2]], area_m2: 14.4 },
    ],
    guide: [
      "Preparation: implantation, niveau et controle de l'equerre.",
      "Gros Oeuvre: elevation des murs porteurs et passages techniques.",
      "Finitions de securite: pose menuiseries et verifications terminales.",
    ],
  },
  {
    key: "garage",
    label: "Garage Technique",
    category: "technical_room",
    securityMaterials: ["beton", "acier", "porte sectionnelle"],
    walls: [
      { id: "w-n", x1: 0, z1: 0, x2: 6, z2: 0, height_m: 2.8, thickness_m: 0.24, load_bearing: true, material_name: "Parpaing creux" },
      { id: "w-e", x1: 6, z1: 0, x2: 6, z2: 5, height_m: 2.8, thickness_m: 0.24, load_bearing: true, material_name: "Parpaing creux" },
      { id: "w-s", x1: 6, z1: 5, x2: 0, z2: 5, height_m: 2.8, thickness_m: 0.24, load_bearing: true, material_name: "Parpaing creux" },
      { id: "w-w", x1: 0, z1: 5, x2: 0, z2: 0, height_m: 2.8, thickness_m: 0.24, load_bearing: true, material_name: "Parpaing creux" },
    ],
    openings: [{ id: "o-garage-gate", wall_id: "w-s", width_m: 2.4, height_m: 2.2, type: "baie", offset_along_wall_m: 3, material_name: "Baie coulissante alu 3 rails" }],
    zones: [{ id: "z-garage", name: "Garage", type: "technique", polygon: [[0, 0], [6, 0], [6, 5], [0, 5]], area_m2: 30 }],
    guide: [
      "Preparation: implantation du garage et reservation des reseaux.",
      "Gros Oeuvre: murs, linteaux et support de fermeture.",
      "Finitions de securite: pose fermeture, ventilation et controle final.",
    ],
  },
];
