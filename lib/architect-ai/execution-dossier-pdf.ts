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

type DevisRow = { ref: string; label: string; qty: string; unit: string; pu: number; total: number };

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
    });
  }
  return rows;
}

export async function generateExecutionDossierPdf(input: ExecutionDossierPdfInput): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const lang = input.language;
  const margin = 14;
  let y = margin;

  const devis = buildDevisRows(input.schema, input.materialsById);
  const totalHt = devis.reduce((s, r) => s + r.total, 0);

  doc.setFontSize(18);
  doc.setTextColor(30, 90, 160);
  doc.text(L("Dossier d’exécution — Architecte IA", "Execution dossier — AI Architect", lang), margin, y);
  y += 10;
  doc.setFontSize(11);
  doc.setTextColor(50);
  doc.text(L("Projet : ", "Project: ", lang) + input.projectName, margin, y);
  y += 6;
  doc.text(L("Entreprise : ", "Company: ", lang) + (input.companyName ?? "—"), margin, y);
  y += 6;
  doc.text(new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB"), margin, y);
  y += 12;

  if (input.render3dDataUrl) {
    doc.setFontSize(12);
    doc.setTextColor(30, 90, 160);
    doc.text(L("Rendu 3D haute définition", "High-definition 3D render", lang), margin, y);
    y += 4;
    try {
      doc.addImage(input.render3dDataUrl, "PNG", margin, y, pageW - 2 * margin, 72);
      y += 78;
    } catch {
      doc.text(L("(Image 3D non intégrée)", "(3D image not embedded)", lang), margin, y);
      y += 8;
    }
  }

  if (y > pageH - 60) {
    doc.addPage();
    y = margin;
  }

  if (input.render2dDataUrl) {
    doc.setFontSize(12);
    doc.setTextColor(30, 90, 160);
    doc.text(L("Plans 2D cotés (aperçu)", "Dimensioned 2D plans (preview)", lang), margin, y);
    y += 4;
    try {
      doc.addImage(input.render2dDataUrl, "PNG", margin, y, pageW - 2 * margin, 65);
      y += 72;
    } catch {
      y += 6;
    }
  }

  if (y > pageH - 80) {
    doc.addPage();
    y = margin;
  }

  doc.setFontSize(12);
  doc.setTextColor(30, 90, 160);
  doc.text(L("Devis estimatif (données catalogue)", "Estimated quote (catalog data)", lang), margin, y);
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
      ],
    ],
    body: devis.map((r) => [r.ref, r.label, r.qty, r.unit, r.pu.toFixed(2), r.total.toFixed(2)]),
    foot: [["", "", "", "", L("TOTAL HT", "TOTAL excl. tax", lang), totalHt.toFixed(2)]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [30, 64, 175] },
    footStyles: { fillColor: [241, 245, 249], textColor: 20, fontStyle: "bold" },
  });

  y = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 40;
  y += 10;

  if (y > pageH - 40) {
    doc.addPage();
    y = margin;
  }

  doc.setFontSize(11);
  doc.setTextColor(30, 90, 160);
  doc.text(L("Zones & surfaces", "Zones & areas", lang), margin, y);
  y += 5;
  const zoneBody = input.schema.zones.map((z) => [z.name, z.type, `${z.area_m2.toFixed(2)} m²`]);
  autoTable(doc, {
    startY: y,
    head: [[L("Zone", "Zone", lang), L("Type", "Type", lang), L("Surface", "Area", lang)]],
    body: zoneBody.length ? zoneBody : [[L("—", "—", lang), "—", "—"]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 64, 175] },
  });

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text("ArtisanFlow — Architecte IA 2D/3D", margin, pageH - 8);

  return doc.output("blob");
}
