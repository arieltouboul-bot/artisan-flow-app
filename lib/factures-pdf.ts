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

  // Main header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Expense Summary", 14, y);
  y += 8;

  // Subtitle with generation date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Generated on ${new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })}`,
    14,
    y
  );
  doc.setTextColor(0, 0, 0);
  y += 10;

  // Company header (logo if provided)
  if (opts.logoUrl) {
    try {
      const logoDataUrl = await loadImageAsDataUrl(opts.logoUrl);
      if (logoDataUrl) {
        const maxLogoW = 40;
        const maxLogoH = 18;
        const props = doc.getImageProperties(logoDataUrl);
        const ratio = props.width / props.height || 1;
        let logoW = maxLogoW;
        let logoH = logoW / ratio;
        if (logoH > maxLogoH) {
          logoH = maxLogoH;
          logoW = logoH * ratio;
        }
        const x = pageWidth - 14 - logoW;
        const yLogo = 12;
        doc.addImage(logoDataUrl, "JPEG", x, yLogo, logoW, logoH, undefined, "FAST");
      }
    } catch (err) {
      // Best-effort: skip logo
      console.error("Factures PDF logo load failed:", err);
    }
  }

  const tableData = opts.rows.map((r) => [
    r.date,
    r.vendor,
    fmt(Number(r.ttc)),
  ]);

  const totalTtc = opts.rows.reduce((sum, r) => sum + Number(r.ttc || 0), 0);
  tableData.push(["", "GRAND TOTAL", fmt(totalTtc)]);

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
        ((data.cell.styles as unknown) as Record<string, any>).fontStyle = "bold";
        ((data.cell.styles as unknown) as Record<string, any>).lineWidth = 0.35;
      }
    },
  });

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("ArtisanFlow — Invoices / Expenses — Accountant Export", pageWidth / 2, pageHeight - 12, { align: "center" });

  // Appendices: invoice photos at the end
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
      doc.text(`Appendix ${i + 1} — ${row.date} — ${row.vendor}`, 14, 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Total Amount: ${fmt(Number(row.ttc))} €`, 14, 20);
      doc.setTextColor(0, 0, 0);
      const margin = 14;
      const imgStartY = 30;
      const maxW = pageWidth - 2 * margin;
      const maxH = pageHeight - imgStartY - margin;
      const props = doc.getImageProperties(dataUrl);
      const ratio = props.width / props.height || 1;
      let imgW = maxW;
      let imgH = imgW / ratio;
      if (imgH > maxH) {
        imgH = maxH;
        imgW = imgH * ratio;
      }
      const x = (pageWidth - imgW) / 2;
      const yImg = imgStartY + (maxH - imgH) / 2;
      doc.addImage(dataUrl, "JPEG", x, yImg, imgW, imgH, undefined, "FAST");
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
