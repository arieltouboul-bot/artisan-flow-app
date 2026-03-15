"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 9,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111",
  },
  subtitle: {
    fontSize: 9,
    color: "#64748b",
    marginBottom: 20,
  },
  table: {
    marginTop: 12,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#0066FF",
    paddingBottom: 6,
    marginBottom: 4,
    fontWeight: "bold",
    backgroundColor: "#f8fafc",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 6,
  },
  colDate: { width: "12%" },
  colVendor: { width: "26%" },
  colProject: { width: "20%" },
  colHt: { width: "14%" },
  colTva: { width: "14%" },
  colTtc: { width: "14%" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
});

export interface FacturesPDFRow {
  date: string;
  vendor: string;
  projectName: string;
  amountHt: number;
  tvaAmount: number;
  ttc: number;
}

export interface FacturesPDFHeaders {
  date: string;
  vendor: string;
  project: string;
  amountHt: string;
  tva: string;
  amountTtc: string;
}

function FacturesPDFDocument({
  rows,
  headers,
  generatedAt,
}: {
  rows: FacturesPDFRow[];
  headers: FacturesPDFHeaders;
  generatedAt: string;
}) {
  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Liste des factures</Text>
        <Text style={styles.subtitle}>
          Document pour le comptable — Généré le {generatedAt}
        </Text>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.colDate}>{headers.date}</Text>
            <Text style={styles.colVendor}>{headers.vendor}</Text>
            <Text style={styles.colProject}>{headers.project}</Text>
            <Text style={styles.colHt}>{headers.amountHt}</Text>
            <Text style={styles.colTva}>{headers.tva}</Text>
            <Text style={styles.colTtc}>{headers.amountTtc}</Text>
          </View>
          {rows.map((row, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDate}>{row.date}</Text>
              <Text style={styles.colVendor}>{row.vendor}</Text>
              <Text style={styles.colProject}>{row.projectName || "—"}</Text>
              <Text style={styles.colHt}>{fmt(row.amountHt)}</Text>
              <Text style={styles.colTva}>{fmt(row.tvaAmount)}</Text>
              <Text style={styles.colTtc}>{fmt(row.ttc)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text>ArtisanFlow — Liste des factures / dépenses — À remettre au comptable</Text>
        </View>
      </Page>
    </Document>
  );
}

export function getFacturesPDFBlob(
  rows: FacturesPDFRow[],
  headers: FacturesPDFHeaders
): Promise<Blob> {
  const generatedAt = new Date().toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  return pdf(
    <FacturesPDFDocument rows={rows} headers={headers} generatedAt={generatedAt} />
  ).toBlob();
}

export default FacturesPDFDocument;
