import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { FloorPlanDocument, NomenclatureLine } from "./types";
import type { RoomAreaEstimate } from "./room-area-grid";

export type TechnicalPdfInput = {
  projectName: string;
  companyName: string | null;
  /** image/png data URL du plan (canvas haute résolution) */
  planImageDataUrl: string | null;
  /** miniature couverture (peut être identique, réduite côté PDF) */
  thumbnailDataUrl?: string | null;
  doc: FloorPlanDocument;
  nomenclature: NomenclatureLine[];
  rooms: RoomAreaEstimate[];
  notices: { title: string; body: string; dtu?: string | null }[];
  language: "fr" | "en";
};

const L = (fr: string, en: string, lang: "fr" | "en") => (lang === "fr" ? fr : en);

export async function generateTechnicalFloorPlanPdf(input: TechnicalPdfInput): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const lang = input.language;
  const margin = 16;
  let y = margin;

  const addFooter = () => {
    const page = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`ArtisanFlow — ${new Date().toLocaleDateString(lang === "fr" ? "fr-FR" : "en-GB")}`, margin, pageH - 8);
    doc.text(`${page}`, pageW - margin - 4, pageH - 8);
  };

  // —— Couverture ——
  doc.setFontSize(20);
  doc.setTextColor(30, 64, 175);
  doc.text(L("Dossier technique — Plan 2D", "Technical dossier — 2D plan", lang), margin, y);
  y += 12;
  doc.setFontSize(14);
  doc.setTextColor(40);
  doc.text(L("Projet : ", "Project: ", lang) + input.projectName, margin, y);
  y += 8;
  doc.setFontSize(11);
  doc.text(L("Entreprise : ", "Company: ", lang) + (input.companyName ?? "—"), margin, y);
  y += 10;
  doc.text(
    L(`Échelle : 1 px = ${input.doc.meta.cmPerPixel} cm (facteur global).`, `Scale: 1 px = ${input.doc.meta.cmPerPixel} cm (global factor).`, lang),
    margin,
    y
  );
  y += 14;

  const thumb = input.thumbnailDataUrl ?? input.planImageDataUrl;
  if (thumb) {
    try {
      doc.setFontSize(10);
      doc.text(L("Aperçu", "Preview", lang), margin, y);
      y += 4;
      const imgW = 90;
      const imgH = 60;
      doc.addImage(thumb, "PNG", margin, y, imgW, imgH);
      y += imgH + 10;
    } catch {
      doc.setFontSize(10);
      doc.text(L("(Aperçu non disponible)", "(Preview unavailable)", lang), margin, y);
      y += 8;
    }
  }

  addFooter();

  // —— Plan 2D ——
  doc.addPage();
  y = margin;
  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175);
  doc.text(L("Plan 2D", "2D plan", lang), margin, y);
  y += 10;
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text(
    L("Légende : murs pleins, cotes en mètres selon le facteur cm/px du plan.", "Legend: solid walls; dimensions in metres using the plan cm/px factor.", lang),
    margin,
    y
  );
  y += 8;
  if (input.planImageDataUrl) {
    try {
      const maxW = pageW - 2 * margin;
      const maxH = pageH - y - margin - 12;
      doc.addImage(input.planImageDataUrl, "PNG", margin, y, maxW, maxH);
    } catch {
      doc.text(L("Export image indisponible.", "Image export unavailable.", lang), margin, y);
    }
  } else {
    doc.text(L("Aucune image de plan fournie.", "No plan image provided.", lang), margin, y);
  }
  addFooter();

  // —— Fiche technique (surfaces + nomenclature) ——
  doc.addPage();
  y = margin;
  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175);
  doc.text(L("Fiche technique", "Technical sheet", lang), margin, y);
  y += 10;

  const roomRows =
    input.rooms.length === 0
      ? [[L("—", "—", lang), L("Aucune zone détectée", "No zone detected", lang)]]
      : input.rooms.map((r) => [
          r.label,
          `${r.area_m2.toFixed(2)} m²${r.approximate ? (lang === "fr" ? " (approx.)" : " (approx.)") : ""}`,
        ]);

  autoTable(doc, {
    startY: y,
    head: [[L("Zone / pièce", "Zone / room", lang), L("Surface", "Area", lang)]],
    body: roomRows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  doc.setFontSize(12);
  doc.text(L("Nomenclature (estimation)", "Nomenclature (estimate)", lang), margin, y);
  y += 4;

  const nomHead = [
    L("Désignation", "Description", lang),
    L("Qté", "Qty", lang),
    L("Unité", "Unit", lang),
    L("Détail", "Detail", lang),
  ];
  const nomBody = input.nomenclature.map((n) => [
    n.label,
    n.quantity.toFixed(n.quantity < 10 ? 2 : 0),
    n.unit,
    n.detail,
  ]);

  autoTable(doc, {
    startY: y,
    head: [nomHead],
    body: nomBody.length ? nomBody : [[L("—", "—", lang), "—", "—", L("Aucun élément", "No elements", lang)]],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [37, 99, 235] },
  });
  addFooter();

  // —— Notice d’emploi (textes issus du catalogue matériaux) ——
  doc.addPage();
  y = margin;
  doc.setFontSize(16);
  doc.setTextColor(30, 64, 175);
  doc.text(L("Notice d’emploi & références", "Usage notes & references", lang), margin, y);
  y += 10;
  doc.setFontSize(10);
  doc.setTextColor(40);

  if (input.notices.length === 0) {
    doc.text(L("Aucune notice liée aux matériaux sélectionnés.", "No notices linked to selected materials.", lang), margin, y);
  } else {
    for (const n of input.notices) {
      if (y > pageH - 40) {
        doc.addPage();
        y = margin;
      }
      doc.setFont("helvetica", "bold");
      doc.text(`${n.title}${n.dtu ? ` — DTU / ref: ${n.dtu}` : ""}`, margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(n.body, pageW - 2 * margin);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 8;
    }
  }
  addFooter();

  return doc.output("blob");
}
