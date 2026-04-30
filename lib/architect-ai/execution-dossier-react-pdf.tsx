"use client";

import React from "react";
import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "./bim-types";
import type { ArchitectFurnitureItem } from "./ollamaArchitect";
import type { SerperSnippet } from "@/src/services/serperService";

export type ExecutionDossierPdfInput = {
  projectName: string;
  companyName: string | null;
  schema: ArchitecturalSchema;
  materialsById: Map<string, ArchitecturalLibraryRow>;
  render3dDataUrl: string | null;
  render2dDataUrl: string | null;
  render2dOverviewDataUrl?: string | null;
  render2dTechnicalDataUrl?: string | null;
  render2dFurnitureDataUrl?: string | null;
  furniture: ArchitectFurnitureItem[];
  webInsights: SerperSnippet[];
  language: "fr" | "en";
};

const styles = StyleSheet.create({
  page: { padding: 24, fontSize: 10, color: "#0f172a" },
  title: { fontSize: 18, marginBottom: 10, color: "#0c4a6e" },
  section: { marginBottom: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  sectionTitle: { fontSize: 12, marginBottom: 4, color: "#0c4a6e" },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  small: { fontSize: 9, color: "#334155" },
  image: { width: "100%", objectFit: "contain", marginTop: 2 },
  imageCaption: { fontSize: 9, color: "#64748b", marginBottom: 6 },
  listItem: { marginBottom: 2 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", paddingVertical: 2 },
  tableHead: { fontSize: 9, width: "25%", color: "#0f172a" },
  tableCell: { fontSize: 9, width: "25%", color: "#334155" },
});

function DossierDocument(input: ExecutionDossierPdfInput) {
  const steps = input.schema.meta.execution_guide ?? [];
  const isFr = input.language === "fr";
  const capOverview = isFr ? "Vue d\u0027ensemble" : "Overview";
  const capTechnical = isFr ? "Zoom technique" : "Technical zoom";
  const capDetails = isFr ? "Details (mobilier / equipements)" : "Details (furniture / equipment)";
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
          {input.render2dOverviewDataUrl || input.render2dTechnicalDataUrl || input.render2dFurnitureDataUrl ? (
            <>
              {input.render2dOverviewDataUrl ? (
                <View wrap={false}>
                  <Text style={styles.imageCaption}>{capOverview}</Text>
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image does not expose alt (see types) */}
                  <Image src={input.render2dOverviewDataUrl} style={styles.image} />
                </View>
              ) : null}
              {input.render2dTechnicalDataUrl ? (
                <View wrap={false}>
                  <Text style={styles.imageCaption}>{capTechnical}</Text>
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image does not expose alt (see types) */}
                  <Image src={input.render2dTechnicalDataUrl} style={styles.image} />
                </View>
              ) : null}
              {input.render2dFurnitureDataUrl ? (
                <View wrap={false}>
                  <Text style={styles.imageCaption}>{capDetails}</Text>
                  {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image does not expose alt (see types) */}
                  <Image src={input.render2dFurnitureDataUrl} style={styles.image} />
                </View>
              ) : null}
            </>
          ) : input.render2dDataUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image does not expose alt (see types)
            <Image src={input.render2dDataUrl} style={styles.image} />
          ) : (
            <Text style={styles.small}>Plan 2D indisponible</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Vue 3D</Text>
          {input.render3dDataUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image does not expose alt (see types)
            <Image src={input.render3dDataUrl} style={styles.image} />
          ) : (
            <Text style={styles.small}>Vue 3D indisponible</Text>
          )}
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
          <Text style={styles.sectionTitle}>{isFr ? "7. Mode emploi (genere)" : "7. User guide (generated)"}</Text>
          <Text style={styles.listItem}>- Lecture du plan: murs porteurs = traits epais, cloisons internes = traits fins.</Text>
          <Text style={styles.listItem}>- Legende: symboles air/eau/lumiere identifies dans la couche technique.</Text>
          <Text style={styles.listItem}>- Entretien: verifier regulierement les bouches extraction et filtres VMC.</Text>
          <Text style={styles.listItem}>- Recommandation: mise a jour annuelle des equipements de securite.</Text>
          {input.furniture.length > 0 ? (
            <View style={{ marginTop: 4 }}>
              <Text style={styles.small}>Installation des equipements cites:</Text>
              {input.furniture.slice(0, 6).map((f, i) => (
                <Text key={`install-${f.id}`} style={styles.listItem}>
                  {i + 1}. Positionner &quot;{f.label}&quot; a ({f.x.toFixed(2)}, {f.z.toFixed(2)}) puis verifier son degagement
                  minimal.
                </Text>
              ))}
            </View>
          ) : null}
          {input.webInsights.length > 0 ? (
            <View style={{ marginTop: 4 }}>
              <Text style={styles.small}>References web (Serper):</Text>
              {input.webInsights.slice(0, 4).map((w) => (
                <Text key={`${w.source}-${w.title}`} style={styles.listItem}>
                  - [{w.source}] {w.title}
                </Text>
              ))}
            </View>
          ) : null}
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
