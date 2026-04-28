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

type DevisRow = { ref: string; label: string; qty: string; unit: string; pu: number; total: number; norm: string };
type ProjectCategory = "safe_room" | "house" | "technical_room";

function buildDevisRows(schema: ArchitecturalSchema, materialsById: Map<string, ArchitecturalLibraryRow>): DevisRow[] {
  const rows: DevisRow[] = [];
  for (const w of schema.structure.walls) {
    const m = materialsById.get(w.material_ref_id);
    const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
    const vol = len * w.thickness_m * w.height_m;
    const pu = m?.unit_price_ht ?? 0;
    const unit = m?.unit ?? "u";
    let qty = 1;
    let total = pu;
    if (unit === "m3") {
      qty = vol;
      total = pu * vol;
    } else if (unit === "m2") {
      qty = len * w.height_m;
      total = pu * qty;
    } else if (unit === "ml") {
      qty = len;
      total = pu * len;
    } else {
      total = pu * len;
    }
    rows.push({
      ref: m?.ref_code ?? w.id,
      label: m?.name ?? w.id,
      qty: qty.toFixed(2),
      unit,
      pu,
      total,
      norm: m?.norm_reference ?? "N/A",
    });
  }
  return rows;
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
        { title: "Preparation", text: `${steps[0]} ${steps[1]}` },
        { title: "Structure", text: `${steps[2]} ${steps[3]}` },
        { title: "Finition", text: steps[4] },
      ]
    : [
        { title: "Preparation", text: `${steps[0]} ${steps[1]}` },
        { title: "Structure", text: `${steps[2]} ${steps[3]}` },
        { title: "Finishing", text: steps[4] },
      ];
}

function categoryLabel(category: ProjectCategory, lang: "fr" | "en"): string {
  if (category === "safe_room") return lang === "fr" ? "Safe Room" : "Safe Room";
  if (category === "technical_room") return lang === "fr" ? "Local Technique" : "Technical Room";
  return lang === "fr" ? "Maison Individuelle" : "Detached House";
}

export async function generateExecutionDossierPdf(input: ExecutionDossierPdfInput): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const lang = input.language;
  const margin = 14;
  const category = (input.schema.meta.project_category ?? "house") as ProjectCategory;

  const devis = buildDevisRows(input.schema, input.materialsById);
  const totalHt = devis.reduce((s, r) => s + r.total, 0);

  // Page 1 — rendu + plan
  let y = margin;
  doc.setFontSize(18);
  doc.setTextColor(30, 90, 160);
  doc.text(L("Dossier technique IA — Architecture", "AI Technical Dossier — Architecture", lang), margin, y);
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

  if (input.render3dDataUrl) {
    try {
      doc.addImage(input.render3dDataUrl, "PNG", margin, y, pageW - 2 * margin, 80);
    } catch {
      doc.text(L("(Image 3D indisponible)", "(3D image unavailable)", lang), margin, y);
    }
  }
  y += 86;

  if (input.render2dDataUrl) {
    try {
      doc.addImage(input.render2dDataUrl, "PNG", margin, y, pageW - 2 * margin, 80);
    } catch {
      doc.text(L("(Plan 2D indisponible)", "(2D plan unavailable)", lang), margin, y);
    }
  }

  // Page 2 — nomenclature
  doc.addPage();
  y = margin;

  doc.setFontSize(12);
  doc.setTextColor(30, 90, 160);
  doc.text(L("Nomenclature matériaux (quantités calculées)", "Material bill (calculated quantities)", lang), margin, y);
  y += 4;

  autoTable(doc, {
    startY: y,
    head: [
      [
        L("Réf.", "Ref.", lang),
        L("Désignation", "Description", lang),
        L("Qté", "Qty", lang),
        "U",
        L("PU HT", "Unit HT", lang),
        L("Total HT", "Total HT", lang),
        L("Norme", "Standard", lang),
      ],
    ],
    body: devis.map((r) => [r.ref, r.label, r.qty, r.unit, r.pu.toFixed(2), r.total.toFixed(2), r.norm]),
    foot: [["", "", "", "", "", L("TOTAL HT", "TOTAL excl. tax", lang), totalHt.toFixed(2)]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 175] },
    footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: "bold" },
  });

  // Page 3 — mode d'emploi
  doc.addPage();
  y = margin;
  doc.setFontSize(12);
  doc.setTextColor(30, 90, 160);
  doc.text(L("Mode d'emploi de construction (référentiel DTU)", "Construction guide (DTU-based)", lang), margin, y);
  y += 10;
  constructionPhases(category, lang).forEach((phase) => {
    doc.setFontSize(11);
    doc.setTextColor(22, 78, 99);
    doc.text(phase.title, margin, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(35);
    doc.text(phase.text, margin, y, { maxWidth: pageW - 2 * margin });
    y += 16;
  });

  // Page 4 — certifications
  doc.addPage();
  y = margin;
  doc.setFontSize(11);
  doc.setTextColor(30, 90, 160);
  doc.text(L("Certifications & conformité sécurité", "Certifications & safety compliance", lang), margin, y);
  y += 5;
  const certRows = Array.from(input.materialsById.values())
    .filter((mat) => !!mat.norm_reference)
    .map((mat) => [mat.ref_code, mat.name, mat.norm_reference ?? "N/A"]);

  autoTable(doc, {
    startY: y,
    head: [[L("Réf.", "Ref.", lang), L("Matériau", "Material", lang), L("Norme", "Standard", lang)]],
    body: certRows.length ? certRows : [[L("—", "—", lang), "—", "—"]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 64, 175] },
  });

  return doc.output("blob");
}
