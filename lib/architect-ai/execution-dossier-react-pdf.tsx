"use client";

import React from "react";
import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "./bim-types";
import type { ArchitectFurnitureItem } from "./ollamaArchitect";

export type ExecutionDossierPdfInput = {
  projectName: string;
  companyName: string | null;
  schema: ArchitecturalSchema;
  materialsById: Map<string, ArchitecturalLibraryRow>;
  render3dDataUrl: string | null;
  render2dDataUrl: string | null;
  furniture: ArchitectFurnitureItem[];
  language: "fr" | "en";
};

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, color: "#0f172a" },
  title: { fontSize: 18, marginBottom: 10, color: "#0c4a6e" },
  section: { marginBottom: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  sectionTitle: { fontSize: 12, marginBottom: 4, color: "#0c4a6e" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  small: { fontSize: 9, color: "#334155" },
  image: { width: "100%", objectFit: "contain", marginTop: 4 },
  listItem: { marginBottom: 2 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 2 },
  tableHead: { fontSize: 9, width: "25%", color: "#0f172a" },
  tableCell: { fontSize: 9, width: "25%", color: "#334155" },
});

function DossierDocument(input: ExecutionDossierPdfInput) {
  const steps = input.schema.meta.execution_guide ?? [];
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Dossier Architect AI - {input.projectName}</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Overview</Text>
          <Text>Projet: {input.projectName}</Text>
          <Text>Entreprise: {input.companyName ?? "-"}</Text>
          <Text>Date: {new Date().toLocaleDateString(input.language === "fr" ? "fr-FR" : "en-GB")}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Plan 2D</Text>
          {input.render2dDataUrl ? <Image src={input.render2dDataUrl} style={styles.image} alt="" /> : <Text style={styles.small}>Plan 2D indisponible</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Vue 3D</Text>
          {input.render3dDataUrl ? <Image src={input.render3dDataUrl} style={styles.image} alt="" /> : <Text style={styles.small}>Vue 3D indisponible</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Description</Text>
          <Text style={styles.small}>Conception préliminaire. Validation technique et réglementaire obligatoire avant exécution.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Furniture</Text>
          <View style={styles.tableRow}>
            <Text style={styles.tableHead}>Label</Text>
            <Text style={styles.tableHead}>X</Text>
            <Text style={styles.tableHead}>Y</Text>
            <Text style={styles.tableHead}>Size</Text>
          </View>
          {input.furniture.map((f) => (
            <View style={styles.tableRow} key={f.id}>
              <Text style={styles.tableCell}>{f.label}</Text>
              <Text style={styles.tableCell}>{f.x.toFixed(2)}</Text>
              <Text style={styles.tableCell}>{f.z.toFixed(2)}</Text>
              <Text style={styles.tableCell}>
                {f.width_m.toFixed(2)}x{f.depth_m.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Checklist</Text>
          {[
            "Verifier cotes et echelle",
            "Verifier murs interieurs et ouvertures",
            "Verifier ventilation / eau / lumiere",
            "Verifier cheminements et ergonomie",
            "Valider avec un bureau d'etudes",
          ].map((item) => (
            <Text key={item} style={styles.listItem}>
              - {item}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Mode emploi (pedagogique)</Text>
          <Text style={styles.listItem}>- Lecture du plan: murs porteurs = traits epais, cloisons internes = traits fins.</Text>
          <Text style={styles.listItem}>- Legende: symboles air/eau/lumiere identifies dans la couche technique.</Text>
          <Text style={styles.listItem}>- Entretien: verifier regulierement les bouches extraction et filtres VMC.</Text>
          <Text style={styles.listItem}>- Recommandation: mise a jour annuelle des equipements de securite.</Text>
          {steps.length > 0 ? (
            <View style={{ marginTop: 4 }}>
              <Text style={styles.small}>Guide execution:</Text>
              {steps.slice(0, 8).map((s, i) => (
                <Text key={`${i}-${s}`} style={styles.listItem}>
                  {i + 1}. {s}
                </Text>
              ))}
            </View>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}

export async function generateExecutionDossierPdf(input: ExecutionDossierPdfInput): Promise<Blob> {
  return await pdf(DossierDocument(input)).toBlob();
}
