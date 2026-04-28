import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "./bim-types";

export type ExecutionDossierPdfInput = {
  projectName: string;
  companyName: string | null;
  schema: ArchitecturalSchema;
  materialsById: Map<string, ArchitecturalLibraryRow>;
  /** Capture WebGL / canvas 3D (PNG data URL) */
  render3dDataUrl: string | null;
  /** Plan 2D SVG exporté en PNG si disponible */
  render2dDataUrl: string | null;
  language: "fr" | "en";
};

const L = (fr: string, en: string, lang: "fr" | "en") => (lang === "fr" ? fr : en);

type ProjectCategory = "safe_room" | "house" | "technical_room";

type DevisRow = { ref: string; label: string; qty: string; unit: string; norm: string };

function buildDevisRows(schema: ArchitecturalSchema, materialsById: Map<string, ArchitecturalLibraryRow>): DevisRow[] {
  return schema.structure.walls.map((w) => {
    const m = materialsById.get(w.material_ref_id);
    const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
    return {
      ref: m?.ref_code ?? w.id,
      label: m?.name ?? w.id,
      qty: len.toFixed(2),
      unit: m?.unit ?? "ml",
      norm: m?.norm_reference ?? "N/A",
    };
  });
}

function constructionGuide(category: ProjectCategory, lang: "fr" | "en"): string[] {
  if (category === "safe_room") {
    return lang === "fr"
      ? [
          "Préparer l'assise et vérifier l'ancrage structurel selon DTU 13.3.",
          "Monter les voiles en béton armé avec treillis renforcé (DTU 21).",
          "Poser la porte blindée certifiée et les points de verrouillage multipoints.",
          "Traiter les jonctions, ventilation et étanchéité feu/fumée (DTU 20.1).",
          "Réaliser les tests de fermeture, résistance et conformité documentaire.",
        ]
      : [
          "Prepare the base and verify structural anchoring per DTU 13.3.",
          "Build reinforced concrete walls with high-strength rebar mesh (DTU 21).",
          "Install certified armored door with multi-point locking.",
          "Seal joints, ventilation, and fire/smoke barriers (DTU 20.1).",
          "Run closure/resistance tests and finalize compliance documentation.",
        ];
  }
  if (category === "technical_room") {
    return lang === "fr"
      ? [
          "Implanter les axes et réservations techniques (DTU 20.1).",
          "Monter les murs et intégrer les passages réseaux.",
          "Installer les supports techniques et la ventilation dédiée.",
          "Appliquer les protections feu/humidité selon usage.",
          "Contrôler accessibilité maintenance et conformité finale.",
        ]
      : [
          "Set out axes and technical openings (DTU 20.1).",
          "Build walls and integrate utility routing sleeves.",
          "Install technical supports and dedicated ventilation.",
          "Apply fire/moisture protections according to usage.",
          "Validate maintenance access and final compliance.",
        ];
  }
  return lang === "fr"
    ? [
        "Implanter le plan et vérifier équerrage/niveaux (DTU 20.1).",
        "Réaliser l'élévation des murs et points porteurs.",
        "Poser menuiseries, ouvertures et renforts locaux.",
        "Traiter isolation, parements et finitions techniques.",
        "Procéder aux contrôles finaux et levée des réserves.",
      ]
    : [
        "Set out layout and verify squareness/levels (DTU 20.1).",
        "Build wall elevations and load-bearing points.",
        "Install joinery, openings, and local reinforcements.",
        "Apply insulation, coverings, and technical finishes.",
        "Perform final checks and close punch-list items.",
      ];
}

function constructionPhases(category: ProjectCategory, lang: "fr" | "en"): Array<{ title: string; text: string }> {
  const steps = constructionGuide(category, lang);
  return lang === "fr"
    ? [
        { title: "1. Preparation", text: `${steps[0]} ${steps[1]}` },
        { title: "2. Gros Oeuvre", text: `${steps[2]} ${steps[3]}` },
        { title: "3. Finitions de securite", text: steps[4] },
      ]
    : [
        { title: "1. Preparation", text: `${steps[0]} ${steps[1]}` },
        { title: "2. Structural Works", text: `${steps[2]} ${steps[3]}` },
        { title: "3. Security Finishes", text: steps[4] },
      ];
}

function categoryLabel(category: ProjectCategory, lang: "fr" | "en"): string {
  if (category === "safe_room") return lang === "fr" ? "Safe Room" : "Safe Room";
  if (category === "technical_room") return lang === "fr" ? "Local Technique" : "Technical Room";
  return lang === "fr" ? "Maison Individuelle" : "Detached House";
}

function drawArchitectCartouche(
  doc: jsPDF,
  opts: { projectName: string; companyName: string | null; category: string; pageNo: number; language: "fr" | "en" }
) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;
  const cartoucheH = 14;
  const y = pageH - margin - cartoucheH;
  doc.setDrawColor(30, 64, 175);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageW - margin * 2, cartoucheH, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${L("Dossier d'execution", "Execution dossier", opts.language)} - ${opts.projectName}`, margin + 2, y + 5);
  doc.text(`${L("Entreprise", "Company", opts.language)}: ${opts.companyName ?? "—"}`, margin + 2, y + 10);
  doc.text(`${L("Type", "Type", opts.language)}: ${opts.category}`, pageW * 0.55, y + 5);
  doc.text(`${L("Page", "Page", opts.language)} ${opts.pageNo}`, pageW * 0.55, y + 10);
}

export async function generateExecutionDossierPdf(input: ExecutionDossierPdfInput): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const lang = input.language;
  const margin = 14;
  const category = (input.schema.meta.project_category ?? "house") as ProjectCategory;
  const categoryText = categoryLabel(category, lang);
  const devisRows = buildDevisRows(input.schema, input.materialsById);
  doc.setFont("helvetica", "normal");

  // Page 1 — plan technique (avec rendu 3D HD)
  let y = margin;
  doc.setFontSize(18);
  doc.setTextColor(30, 90, 160);
  doc.text(L("Dossier Architecte — Plan technique", "Architect Dossier — Technical blueprint", lang), margin, y);
  y += 10;
  doc.setFontSize(11);
  doc.setTextColor(50);
  doc.text(L("Projet : ", "Project: ", lang) + input.projectName, margin, y);
  y += 6;
  doc.text(L("Entreprise : ", "Company: ", lang) + (input.companyName ?? "—"), margin, y);
  y += 6;
  doc.text(L("Type : ", "Type: ", lang) + categoryLabel(category, lang), margin, y);
  y += 6;
  doc.text(new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB"), margin, y);
  y += 9;

  if (input.render2dDataUrl) {
    try {
      doc.addImage(input.render2dDataUrl, "PNG", margin, y, pageW - 2 * margin, 120);
    } catch {
      doc.text(L("(Plan 2D indisponible)", "(2D plan unavailable)", lang), margin, y);
    }
  }
  y += 124;

  if (input.render3dDataUrl) {
    try {
      doc.addImage(input.render3dDataUrl, "PNG", margin, y, 72, 50);
    } catch {
      doc.text(L("(Image 3D indisponible)", "(3D image unavailable)", lang), margin, y);
    }
  }
  drawArchitectCartouche(doc, {
    projectName: input.projectName,
    companyName: input.companyName,
    category: categoryText,
    pageNo: 1,
    language: lang,
  });

  // Page 2 — vue 3D + nomenclature
  doc.addPage();
  y = margin;
  doc.setFontSize(12);
  doc.setTextColor(30, 90, 160);
  doc.text(L("Vue 3D et nomenclature", "3D view and bill of materials", lang), margin, y);
  y += 10;
  if (input.render3dDataUrl) {
    try {
      doc.addImage(input.render3dDataUrl, "PNG", margin, y, 86, 62);
    } catch {
      doc.text(L("(Image 3D indisponible)", "(3D image unavailable)", lang), margin, y + 4);
    }
  }
  autoTable(doc, {
    startY: y,
    margin: { left: margin + 92 },
    head: [[L("Ref.", "Ref.", lang), L("Materiau", "Material", lang), L("Qte", "Qty", lang), "U", L("Norme", "Standard", lang)]],
    body: devisRows.map((r) => [r.ref, r.label, r.qty, r.unit, r.norm]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 175] },
  });
  drawArchitectCartouche(doc, {
    projectName: input.projectName,
    companyName: input.companyName,
    category: categoryText,
    pageNo: 2,
    language: lang,
  });

  // Page 3 — mode d'emploi
  doc.addPage();
  y = margin;
  doc.setFontSize(12);
  doc.setTextColor(30, 90, 160);
  doc.text(L("Mode d'emploi de construction", "Construction guide", lang), margin, y);
  y += 10;
  const phases =
    input.schema.meta.execution_guide && input.schema.meta.execution_guide.length >= 3
      ? input.schema.meta.execution_guide.map((txt, idx) => ({ title: `${idx + 1}. ${L("Etape", "Step", lang)}`, text: txt }))
      : constructionPhases(category, lang);
  phases.forEach((phase) => {
    doc.setFontSize(11);
    doc.setTextColor(22, 78, 99);
    doc.text(phase.title, margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(35);
    doc.text(phase.text, margin, y, { maxWidth: pageW - 2 * margin });
    y += 16;
  });
  drawArchitectCartouche(doc, {
    projectName: input.projectName,
    companyName: input.companyName,
    category: categoryText,
    pageNo: 3,
    language: lang,
  });

  return doc.output("blob");
}
