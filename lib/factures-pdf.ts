/**
 * Generate factures PDF with jspdf + jspdf-autotable.
 * Table of filtered invoices + company name (and optional logo).
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface FacturesPDFRow {
  date: string;
  vendor: string;
  amountHt: number;
  tvaAmount: number;
  ttc: number;
  /** URL de la photo de la facture (annexe en fin de PDF) */
  image_url?: string | null;
}

export interface FacturesPDFOptions {
  rows: FacturesPDFRow[];
  /** Spécial Comptable : tableau 3 colonnes Date, Fournisseur, TTC */
  headers: { date: string; vendor: string; amountTtc: string };
  companyName: string | null;
  logoUrl: string | null;
}

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export async function generateFacturesPDF(opts: FacturesPDFOptions): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  // En-tête principal
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Récapitulatif des Dépenses", 14, y);
  y += 8;

  // Sous-titre avec date du jour
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Généré le ${new Date().toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })}`,
    14,
    y
  );
  doc.setTextColor(0, 0, 0);
  y += 10;

  const tableData = opts.rows.map((r) => [
    r.date,
    r.vendor,
    fmt(Number(r.ttc)),
  ]);

  const totalTtc = opts.rows.reduce((sum, r) => sum + Number(r.ttc || 0), 0);
  tableData.push(["", "TOTAL GÉNÉRAL", fmt(totalTtc)]);

  const availableWidth = pageWidth - 28;
  const colWidths = {
    0: { cellWidth: availableWidth * 0.22 },
    1: { cellWidth: availableWidth * 0.56 },
    2: { cellWidth: availableWidth * 0.22 },
  };

  autoTable(doc, {
    startY: y,
    head: [[opts.headers.date, opts.headers.vendor, opts.headers.amountTtc]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [0, 102, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: colWidths,
    margin: { left: 14 },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === tableData.length - 1) {
        (data.cell.styles as Record<string, unknown>).fontStyle = "bold";
        (data.cell.styles as Record<string, unknown>).lineWidth = 0.35;
      }
    },
  });

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("ArtisanFlow — Liste des factures / dépenses — À remettre au comptable", pageWidth / 2, pageHeight - 12, { align: "center" });

  // Annexes : photos des factures en fin de document
  const rowsWithPhotos = opts.rows.filter((r) => r.image_url && r.image_url.trim());
  for (let i = 0; i < rowsWithPhotos.length; i++) {
    const row = rowsWithPhotos[i];
    const url = (row as { image_url?: string | null }).image_url;
    if (!url) continue;
    try {
      const dataUrl = await loadImageAsDataUrl(url);
      if (!dataUrl) continue;
      doc.addPage();
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`Annexe ${i + 1} — ${row.date} — ${row.vendor}`, 14, 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Montant TTC : ${fmt(Number(row.ttc))} €`, 14, 20);
      doc.setTextColor(0, 0, 0);
      const margin = 14;
      const maxW = pageWidth - 2 * margin;
      const maxH = pageHeight - 35;
      const imgW = maxW;
      const imgH = maxH;
      doc.addImage(dataUrl, "JPEG", margin, 25, imgW, imgH, undefined, "FAST");
    } catch {
      // skip failed image
    }
  }

  return doc.output("blob");
}

function loadImageAsDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
