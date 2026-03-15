/**
 * Generate factures PDF with jspdf + jspdf-autotable.
 * Table of filtered invoices + company name (and optional logo).
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export interface FacturesPDFRow {
  date: string;
  vendor: string;
  projectName: string;
  amountHt: number;
  tvaAmount: number;
  ttc: number;
}

export interface FacturesPDFOptions {
  rows: FacturesPDFRow[];
  headers: { date: string; vendor: string; project: string; amountHt: string; tva: string; amountTtc: string };
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

  // Company name
  if (opts.companyName && opts.companyName.trim()) {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(opts.companyName.trim(), 14, y);
    y += 10;
  }

  // Optional logo (right-aligned)
  if (opts.logoUrl && opts.logoUrl.trim()) {
    try {
      const img = await loadImageAsDataUrl(opts.logoUrl);
      if (img) {
        const logoW = 25;
        const logoH = 12;
        doc.addImage(img, "JPEG", pageWidth - 14 - logoW, 14, logoW, logoH);
      }
    } catch {
      // ignore logo load failure
    }
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Liste des factures — Document pour le comptable", 14, y);
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`, 14, y);
  doc.setTextColor(0, 0, 0);
  y += 14;

  const tableData = opts.rows.map((r) => [
    r.date,
    r.vendor,
    r.projectName || "—",
    fmt(r.amountHt),
    fmt(r.tvaAmount),
    fmt(r.ttc),
  ]);

  autoTable(doc, {
    startY: y,
    head: [[opts.headers.date, opts.headers.vendor, opts.headers.project, opts.headers.amountHt, opts.headers.tva, opts.headers.amountTtc]],
    body: tableData,
    theme: "grid",
    headStyles: { fillColor: [0, 102, 255], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 45 },
      2: { cellWidth: 35 },
      3: { cellWidth: 28 },
      4: { cellWidth: 28 },
      5: { cellWidth: 28 },
    },
    margin: { left: 14 },
  });

  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("ArtisanFlow — Liste des factures / dépenses — À remettre au comptable", pageWidth / 2, pageHeight - 12, { align: "center" });

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
