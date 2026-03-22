/**
 * Export PDF comptable — langue selon `locale` (souvent dérivée de navigator.language).
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { FinanceAnalytics, OutstandingRow, ProjectMarginRow } from "@/lib/finance-analytics-types";
import { type FinancePdfLocale, getFinancePdfLabels } from "@/lib/finance-pdf-labels";

const fmt = (n: number, locale: FinancePdfLocale) =>
  n.toLocaleString(locale === "fr" ? "fr-FR" : "en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export interface FinanceSummaryPDFOptions {
  companyName: string | null;
  data: FinanceAnalytics;
  /** Si absent, utiliser `pdfLocaleFromNavigator()` côté appelant. */
  locale: FinancePdfLocale;
}

export async function generateFinanceSummaryPDF(opts: FinanceSummaryPDFOptions): Promise<Blob> {
  const { companyName, data, locale } = opts;
  const L = getFinancePdfLabels(locale);
  const dateLocale = locale === "fr" ? "fr-FR" : "en-GB";
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 18;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(L.title, 14, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(
    `${L.generatedOn} ${new Date().toLocaleDateString(dateLocale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })} — ${L.amountsEurNote}`,
    14,
    y
  );
  doc.setTextColor(0, 0, 0);
  y += 10;

  if (companyName?.trim()) {
    doc.setFont("helvetica", "bold");
    doc.text(companyName.trim(), 14, y);
    y += 8;
  }

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(L.kpis, 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const mom =
    data.caMonthMomPct == null
      ? L.momNa
      : `${data.caMonthMomPct >= 0 ? "+" : ""}${fmt(data.caMonthMomPct, locale)} % ${L.mom}`;
  const lines = [
    `${L.cashMonth}: ${fmt(data.caMonthEur, locale)} EUR`,
    `${L.prevMonth}: ${fmt(data.caPrevMonthEur, locale)} EUR — ${mom}`,
    `${L.ytd}: ${fmt(data.caYtdEur, locale)} EUR`,
    `${L.totalRevenue}: ${fmt(data.companyTotalRevenueEur, locale)} EUR`,
    `${L.totalCosts}: ${fmt(data.companyTotalExpensesEur, locale)} EUR`,
    `${L.netMargin}: ${fmt(data.companyMarginEur, locale)} EUR (${fmt(data.companyMarginPct, locale)} %)`,
    `${L.totalOutstanding}: ${fmt(data.totalOutstandingEur, locale)} EUR`,
  ];
  for (const line of lines) {
    doc.text(line, 14, y);
    y += 5;
  }
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [L.tableOutstandingHead],
    body: data.outstandingRows.slice(0, 40).map((r: OutstandingRow) => [
      `${r.clientName} — ${r.projectName}`,
      fmt(r.budgetEur, locale),
      fmt(r.paidEur, locale),
      fmt(r.balanceEur, locale),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 98, 255] },
    margin: { left: 14, right: 14 },
  });
  y = (doc as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y;
  y += 10;

  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  autoTable(doc, {
    startY: y,
    head: [L.tableMarginHead],
    body: data.projectMargins.slice(0, 40).map((r: ProjectMarginRow) => [
      `${r.clientName} — ${r.projectName}`,
      fmt(r.revenueEur, locale),
      fmt(r.marginEur, locale),
      fmt(r.marginPct, locale),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 185, 129] },
    margin: { left: 14, right: 14 },
  });

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const pageH = doc.internal.pageSize.getHeight();
  doc.text(L.footerNote, 14, pageH - 12);

  return doc.output("blob");
}
