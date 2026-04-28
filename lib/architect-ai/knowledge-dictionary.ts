export const ARCHITECT_KNOWLEDGE_DICTIONARY = {
  standards: {
    defaultWallThicknessM: 0.2,
    defaultDoorWidthM: 0.9,
    defaultDoorHeightM: 2.1,
    defaultWindowHeightM: 1.2,
    defaultCeilingHeightM: 2.7,
  },
  safeRoom: {
    minWallThicknessM: 0.3,
    recommendedMaterials: ["beton arme", "porte blindee", "treillis renforce"],
    certifications: ["EN 1627 RC4", "NF EN 206"],
  },
  drafting: {
    wallPochage: true,
    automaticDimensions: true,
    openingSymbols: ["porte battante", "fenetre", "baie"],
  },
} as const;

export function buildKnowledgeContext(language: "fr" | "en"): string {
  if (language === "fr") {
    return [
      "Dictionnaire interne ArtisanFlow (prioritaire):",
      `- Epaisseur mur par defaut: ${ARCHITECT_KNOWLEDGE_DICTIONARY.standards.defaultWallThicknessM} m`,
      `- Porte standard: ${ARCHITECT_KNOWLEDGE_DICTIONARY.standards.defaultDoorWidthM} m x ${ARCHITECT_KNOWLEDGE_DICTIONARY.standards.defaultDoorHeightM} m`,
      `- Hauteur sous plafond standard: ${ARCHITECT_KNOWLEDGE_DICTIONARY.standards.defaultCeilingHeightM} m`,
      `- Safe Room epaisseur mini: ${ARCHITECT_KNOWLEDGE_DICTIONARY.safeRoom.minWallThicknessM} m`,
      `- Regles de plan: pochage murs=${ARCHITECT_KNOWLEDGE_DICTIONARY.drafting.wallPochage ? "oui" : "non"}, cotations auto=${ARCHITECT_KNOWLEDGE_DICTIONARY.drafting.automaticDimensions ? "oui" : "non"}`,
    ].join("\n");
  }
  return [
    "ArtisanFlow internal dictionary (high priority):",
    `- Default wall thickness: ${ARCHITECT_KNOWLEDGE_DICTIONARY.standards.defaultWallThicknessM} m`,
    `- Standard door: ${ARCHITECT_KNOWLEDGE_DICTIONARY.standards.defaultDoorWidthM} m x ${ARCHITECT_KNOWLEDGE_DICTIONARY.standards.defaultDoorHeightM} m`,
    `- Default ceiling height: ${ARCHITECT_KNOWLEDGE_DICTIONARY.standards.defaultCeilingHeightM} m`,
    `- Safe Room min thickness: ${ARCHITECT_KNOWLEDGE_DICTIONARY.safeRoom.minWallThicknessM} m`,
    `- Plan rules: wall hatching=${ARCHITECT_KNOWLEDGE_DICTIONARY.drafting.wallPochage ? "yes" : "no"}, auto dimensions=${ARCHITECT_KNOWLEDGE_DICTIONARY.drafting.automaticDimensions ? "yes" : "no"}`,
  ].join("\n");
}
