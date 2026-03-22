/**
 * English accounting summary PDF (jspdf + jspdf-autotable).
 */
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { FinanceAnalytics, OutstandingRow, ProjectMarginRow } from "@/lib/finance-analytics-types";

const fmt = (n: number) =>
  n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface FinanceSummaryPDFOptions {
  companyName: string | null;
  data: FinanceAnalytics;
}

export async function generateFinanceSummaryPDF(opts: FinanceSummaryPDFOptions): Promise<Blob> {
  const { companyName, data } = opts;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 18;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Financial summary (accounting)", 14, y);
  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Generated on ${new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })} — amounts in EUR equivalent unless noted`,
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
  doc.text("KPIs", 14, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const mom =
    data.caMonthMomPct == null
      ? "n/a"
      : `${data.caMonthMomPct >= 0 ? "+" : ""}${fmt(data.caMonthMomPct)} % vs previous month`;
  const lines = [
    `Cash collected (current month): ${fmt(data.caMonthEur)} EUR`,
    `Previous month (reference): ${fmt(data.caPrevMonthEur)} EUR — MoM: ${mom}`,
    `Year-to-date (1 Jan — today, current year): ${fmt(data.caYtdEur)} EUR`,
    `Company margin (revenue − materials & tools): ${fmt(data.companyMarginEur)} EUR (${fmt(data.companyMarginPct)} % of revenue)`,
    `Total outstanding (contract − revenue rows recorded): ${fmt(data.totalOutstandingEur)} EUR`,
  ];
  for (const line of lines) {
    doc.text(line, 14, y);
    y += 5;
  }
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [["Outstanding by client / project", "Budget EUR", "Paid (revenues) EUR", "Balance EUR"]],
    body: data.outstandingRows.slice(0, 40).map((r: OutstandingRow) => [
      `${r.clientName} — ${r.projectName}`,
      fmt(r.budgetEur),
      fmt(r.paidEur),
      fmt(r.balanceEur),
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
    head: [["Project margin (revenue − materials & tools)", "Revenue EUR", "Margin EUR", "Margin %"]],
    body: data.projectMargins.slice(0, 40).map((r: ProjectMarginRow) => [
      `${r.clientName} — ${r.projectName}`,
      fmt(r.revenueEur),
      fmt(r.marginEur),
      fmt(r.marginPct),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [16, 185, 129] },
    margin: { left: 14, right: 14 },
  });

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  const pageH = doc.internal.pageSize.getHeight();
  doc.text(
    "Outstanding = project contract amount minus sum of revenue entries (converted to EUR). Margin uses recorded revenues and material/tool expenses.",
    14,
    pageH - 12
  );

  return doc.output("blob");
}
