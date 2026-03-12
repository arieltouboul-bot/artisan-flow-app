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
    fontSize: 10,
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: "#0066FF",
    paddingBottom: 16,
  },
  logo: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0066FF",
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 8,
  },
  section: {
    marginBottom: 16,
  },
  label: {
    fontSize: 8,
    color: "#64748b",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  table: {
    marginTop: 20,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 8,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: "#0066FF",
    paddingBottom: 8,
    marginBottom: 4,
    fontWeight: "bold",
  },
  colDesc: { width: "35%" },
  colQty: { width: "12%" },
  colUnit: { width: "12%" },
  colPrice: { width: "18%" },
  colTotal: { width: "23%" },
  totalBlock: {
    marginTop: 24,
    alignItems: "flex-end",
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "30%",
    marginBottom: 4,
  },
  totalLabel: { marginRight: 16 },
  totalValue: { fontWeight: "bold" },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
    textAlign: "center",
  },
});

export interface DevisPDFData {
  companyName: string;
  companyAddress: string;
  companySiret: string;
  clientName: string;
  clientAddress: string;
  devisNumber: string;
  validUntil: string;
  /** Notes ou observations affichées sur le devis */
  notes?: string | null;
  items: {
    description: string;
    quantity: number;
    unit: string;
    unit_price_sell: number;
    total_sell: number;
  }[];
  totalHT: number;
  tvaRate: number;
  totalTTC: number;
}

function DevisPDFDocument({ data }: { data: DevisPDFData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.logo}>ArtisanFlow</Text>
          <Text>{data.companyName}</Text>
          <Text>{data.companyAddress}</Text>
          <Text>SIRET : {data.companySiret}</Text>
        </View>

        <Text style={styles.title}>Devis n° {data.devisNumber}</Text>

        <View style={styles.row}>
          <View style={styles.section}>
            <Text style={styles.label}>Client</Text>
            <Text>{data.clientName}</Text>
            <Text>{data.clientAddress}</Text>
          </View>
          <View style={styles.section}>
            <Text style={styles.label}>Validité</Text>
            <Text>Valable jusqu&apos;au {data.validUntil}</Text>
          </View>
        </View>

        {data.notes && data.notes.trim() ? (
          <View style={[styles.section, { marginTop: 12 }]}>
            <Text style={styles.label}>Notes / Observations</Text>
            <Text style={{ fontSize: 9, color: "#475569", lineHeight: 1.4 }}>{data.notes.trim()}</Text>
          </View>
        ) : null}

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={styles.colDesc}>Désignation</Text>
            <Text style={styles.colQty}>Qté</Text>
            <Text style={styles.colUnit}>Unité</Text>
            <Text style={styles.colPrice}>P.U. HT</Text>
            <Text style={styles.colTotal}>Total HT</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colUnit}>{item.unit}</Text>
              <Text style={styles.colPrice}>{item.unit_price_sell.toFixed(2)} €</Text>
              <Text style={styles.colTotal}>{item.total_sell.toFixed(2)} €</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalBlock}>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>Total HT</Text>
            <Text style={styles.totalValue}>{data.totalHT.toFixed(2)} €</Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>TVA {data.tvaRate}%</Text>
            <Text style={styles.totalValue}>
              {((data.totalTTC - data.totalHT)).toFixed(2)} €
            </Text>
          </View>
          <View style={styles.totalLine}>
            <Text style={styles.totalLabel}>Total TTC</Text>
            <Text style={styles.totalValue}>{data.totalTTC.toFixed(2)} €</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>Document généré par ArtisanFlow - Ce devis est établi à titre professionnel.</Text>
        </View>
      </Page>
    </Document>
  );
}

export function getDevisPDFBlob(data: DevisPDFData): Promise<Blob> {
  return pdf(<DevisPDFDocument data={data} />).toBlob();
}

export default DevisPDFDocument;
