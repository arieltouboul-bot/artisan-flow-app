"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FileDown, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFloorPlan } from "@/hooks/use-floor-plan";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import { useProfile } from "@/hooks/use-profile";
import { generateArchitecturalSchema, type ArchitecturalProjectCategory } from "@/lib/architect-ai/generate-architectural-schema";
import type { ArchitectFurnitureItem, ArchitectRoom } from "@/lib/architect-ai/ollamaArchitect";
import type { SerperSnippet } from "@/src/services/serperService";
import { architecturalSchemaToFloorPlan } from "@/lib/architect-ai/schema-to-floor-plan";
import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "@/lib/architect-ai/bim-types";
import { generateExecutionDossierPdf } from "@/lib/architect-ai/execution-dossier-react-pdf";
import { ArchitectViewport2D } from "./architect-viewport-2d";
import { ArchitectViewport3D } from "./architect-viewport-3d";
import { BlueprintLoader } from "./blueprint-loader";

type ArchitectAiStudioProps = {
  planId: string | null;
};

function parseAreaM2FromPrompt(text: string): number | null {
  const normalized = text.replace(/\s+/g, " ");
  const m =
    normalized.match(/(\d+(?:[.,]\d+)?)\s*m(?:²|\^?2\b)/i) ?? normalized.match(/(\d+(?:[.,]\d+)?)\s*m2\b/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function inferProjectCategory(raw: string): ArchitecturalProjectCategory {
  const q = raw.toLowerCase();
  if (/\bsafe room\b|panic room|salle refuge|piece refuge|bunker|panic/i.test(q)) return "safe_room";
  if (/local technique|technical room|salle serveur|cfe|data.?center/i.test(q)) return "technical_room";
  return "house";
}

export function ArchitectAiStudio({ planId }: ArchitectAiStudioProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { profile } = useProfile();
  const [prompt, setPrompt] = useState("");
  const [schema, setSchema] = useState<ArchitecturalSchema | null>(null);
  const [usedMaterials, setUsedMaterials] = useState<ArchitecturalLibraryRow[]>([]);
  const [furniture, setFurniture] = useState<ArchitectFurnitureItem[]>([]);
  const [rooms, setRooms] = useState<ArchitectRoom[]>([]);
  const [webInsights, setWebInsights] = useState<SerperSnippet[]>([]);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [generationFeedback, setGenerationFeedback] = useState<string | null>(null);
  const root3dRef = useRef<HTMLDivElement>(null);
  const blueprintRootRef = useRef<HTMLDivElement>(null);

  const onPlanCreated = useCallback(
    (id: string) => {
      router.replace(`/plans?id=${id}`);
    },
    [router]
  );

  const { row, updateDocument, loading, error, persist, cancelScheduledSave } = useFloorPlan(planId, {
    onPlanCreated,
  });

  const materialsById = useMemo(() => {
    const m = new Map<string, ArchitecturalLibraryRow>();
    for (const r of usedMaterials) m.set(r.id, r);
    return m;
  }, [usedMaterials]);

  const cleanedSchema = useMemo<ArchitecturalSchema | null>(() => {
    if (!schema) return null;
    const cleanedWalls = schema.structure.walls.filter(
      (w) =>
        Number.isFinite(w.x1) &&
        Number.isFinite(w.x2) &&
        Number.isFinite(w.z1) &&
        Number.isFinite(w.z2) &&
        Number.isFinite(w.height_m) &&
        Number.isFinite(w.thickness_m)
    );
    if (!cleanedWalls.length) return null;
    return { ...schema, structure: { ...schema.structure, walls: cleanedWalls } };
  }, [schema]);

  const snapAxisAlignedSchema = useCallback((input: ArchitecturalSchema): ArchitecturalSchema => {
    const snap = (value: number) => Math.round(value / 0.05) * 0.05;
    const snappedWalls = input.structure.walls.map((w) => {
      const dx = w.x2 - w.x1;
      const dz = w.z2 - w.z1;
      const horizontal = Math.abs(dx) >= Math.abs(dz);
      const x1 = snap(w.x1);
      const z1 = snap(w.z1);
      const x2 = horizontal ? snap(w.x2) : x1;
      const z2 = horizontal ? z1 : snap(w.z2);
      return { ...w, x1, z1, x2, z2 };
    });
    return { ...input, structure: { ...input.structure, walls: snappedWalls } };
  }, []);

  const geometryStats = useMemo(() => {
    if (!schema) return { areaM2: 0 };
    const areaM2 = schema.zones.reduce((sum, zone) => sum + zone.area_m2, 0);
    return { areaM2 };
  }, [schema]);

  const targetAreaFromPrompt = useMemo(() => parseAreaM2FromPrompt(prompt), [prompt]);

  const handleGenerate = async () => {
    const p = prompt.trim();
    if (generating) return;
    setStatusMessage(null);
    if (!p) {
      setStatusMessage(t("architectPromptSuggestions", language));
      return;
    }
    if (p.length < 8 && !/\d|safe|studio|garage|extension|room|maison|plan|m2|m²/i.test(p)) {
      setStatusMessage(t("architectPromptSuggestions", language));
      return;
    }
    const inferredCategory = inferProjectCategory(p);
    setGenerating(true);
    setGenerationFeedback(t("architectWorkingWebNorms", language));
    let feedbackTimer: number | undefined = window.setTimeout(() => {
      setGenerationFeedback(t("architectWorkingOllamaOptimize", language));
    }, 1000);
    try {
      const {
        schema: next,
        used_materials,
        warning,
        furniture: generatedFurniture,
        rooms: generatedRooms,
        technical_nodes,
        web_context_snippets,
      } = await generateArchitecturalSchema(p, language, inferredCategory);
      const snapped = snapAxisAlignedSchema(next);
      setSchema(snapped);
      setUsedMaterials(used_materials);
      setFurniture(generatedFurniture ?? []);
      setRooms(generatedRooms ?? []);
      setWebInsights(web_context_snippets ?? []);
      const doc = architecturalSchemaToFloorPlan(snapped);
      updateDocument(() => doc);
      const msg = warning
        ? `${t("architectChatGenerated", language)} ${warning}`
        : t("architectChatGenerated", language);
      setStatusMessage(msg);
      setPrompt("");
    } catch (e) {
      console.error("[architect.studio] generation failed", {
        promptPreview: p.slice(0, 180),
        error: e instanceof Error ? e.message : String(e),
      });
      setStatusMessage(t("architectChatError", language));
    } finally {
      if (feedbackTimer !== undefined) window.clearTimeout(feedbackTimer);
      setGenerationFeedback(null);
      setGenerating(false);
    }
  };

  const handleSave = async (schemaForSave: ArchitecturalSchema = schema as ArchitecturalSchema) => {
    if (!schemaForSave) return;
    cancelScheduledSave();
    const doc = architecturalSchemaToFloorPlan(schemaForSave);
    await persist(
      {
        ...doc,
        meta: { ...doc.meta, planName: schemaForSave.meta.label },
      },
      {
        name: schemaForSave.meta.label,
        project_id: row?.project_id ?? null,
      }
    );
  };

  const capture3dPng = (): string | null => {
    const canvas = root3dRef.current?.querySelector("canvas");
    if (!canvas) return null;
    try {
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  };

  const capture2dPng = async (): Promise<string | null> => {
    const svg = blueprintRootRef.current?.querySelector("svg");
    if (!svg) return null;
    try {
      const serialized = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const image = new window.Image();
      const loaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("SVG image load failed"));
      });
      image.src = url;
      await loaded;
      const canvas = window.document.createElement("canvas");
      canvas.width = image.width || 1280;
      canvas.height = image.height || 720;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        return null;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      return canvas.toDataURL("image/png");
    } catch {
      return null;
    }
  };

  const cropDataUrl = (dataUrl: string, crop: { x: number; y: number; w: number; h: number }): Promise<string | null> =>
    new Promise((resolve) => {
      const image = new window.Image();
      image.onload = () => {
        const canvas = window.document.createElement("canvas");
        canvas.width = Math.max(1, Math.floor(crop.w));
        canvas.height = Math.max(1, Math.floor(crop.h));
        const context = canvas.getContext("2d");
        if (!context) return resolve(null);
        context.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/png"));
      };
      image.onerror = () => resolve(null);
      image.src = dataUrl;
    });

  const capture2dVariants = async (): Promise<{ overview: string | null; technical: string | null; furniture: string | null }> => {
    const base = await capture2dPng();
    if (!base) return { overview: null, technical: null, furniture: null };
    const image = new window.Image();
    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("capture2dVariants load failed"));
    });
    image.src = base;
    await loaded;
    const w = image.width || 1280;
    const h = image.height || 720;
    const overview = base;
    const technical = await cropDataUrl(base, { x: 0, y: 0, w: w * 0.58, h: h * 0.62 });
    const furnitureView = await cropDataUrl(base, { x: w * 0.35, y: h * 0.2, w: w * 0.58, h: h * 0.68 });
    return { overview, technical, furniture: furnitureView };
  };

  const handleExportExecution = async () => {
    if (!schema) return;
    setExporting(true);
    try {
      await handleSave();
      await new Promise((r) => setTimeout(r, 450));
      const png3d = capture3dPng();
      const png2d = await capture2dPng();
      const variants2d = await capture2dVariants();
      const blob = await generateExecutionDossierPdf({
        projectName: schema.meta.label,
        companyName: profile?.company_name ?? null,
        schema,
        materialsById,
        render3dDataUrl: png3d,
        render2dDataUrl: png2d,
        render2dOverviewDataUrl: variants2d.overview,
        render2dTechnicalDataUrl: variants2d.technical,
        render2dFurnitureDataUrl: variants2d.furniture,
        furniture,
        webInsights,
        language,
      });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `dossier-execution-${schema.meta.label.replace(/\s+/g, "-").slice(0, 48)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const dateStr = useMemo(() => new Date().toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB"), [language]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sky-200/80">
        <Loader2 className="h-6 w-6 animate-spin" />
        {t("architectLoadingPlan", language)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a1424] to-slate-950 text-slate-100">
      {generating && <BlueprintLoader />}
      <motion.header initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-slate-800/70 bg-slate-950/60 backdrop-blur-md">
        <div className="mx-auto max-w-3xl px-4 py-10 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-sky-100" style={{ fontFamily: "Inter, sans-serif" }}>
            {t("architectPageTitle", language)}
          </h1>
          <p className="mt-2 text-sm text-slate-400">{t("architectPageSubtitle", language)}</p>
        </div>
      </motion.header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-28 pt-8">
        <p className="rounded-lg border border-amber-500/35 bg-amber-950/25 px-3 py-2 text-center text-xs text-amber-100/95">
          {t("architectDisclaimer", language)}
        </p>

        {error ? <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p> : null}

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <Input
              id="architect-intelligence-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleGenerate();
                }
              }}
              placeholder={t("architectIntelligencePromptPlaceholder", language)}
              className="min-h-[56px] flex-1 rounded-2xl border border-cyan-400/55 bg-transparent/80 text-base text-slate-100 shadow-[0_0_24px_rgba(34,211,238,0.12)] backdrop-blur-md placeholder:text-slate-500 transition-[box-shadow,border-color] focus-visible:border-cyan-300 focus-visible:shadow-[0_0_36px_rgba(34,211,238,0.22)]"
              aria-label={t("architectIntelligencePromptPlaceholder", language)}
            />
            <Button
              type="button"
              className="min-h-[56px] shrink-0 rounded-2xl bg-cyan-500 px-8 text-base font-medium text-slate-950 hover:bg-cyan-400"
              onClick={() => void handleGenerate()}
              disabled={generating}
            >
              {generating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5" />}
              {t("architectIntelligenceGenerate", language)}
            </Button>
          </div>
          {generating && generationFeedback ? (
            <p className="text-center text-xs font-medium tracking-wide text-cyan-200/95">{generationFeedback}</p>
          ) : null}
          {statusMessage ? (
            <p className="rounded-md border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-center text-sm text-slate-300">{statusMessage}</p>
          ) : null}
        </motion.div>

        {cleanedSchema ? (
          <>
            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs text-cyan-300 underline-offset-4 hover:text-cyan-200 hover:underline"
                onClick={() => setShow3D((v) => !v)}
              >
                {show3D ? t("architectHide3d", language) : t("architectShow3d", language)}
              </button>
            </div>
            <motion.div
              layout
              className={`relative grid gap-4 ${show3D ? "lg:grid-cols-[1.35fr_1fr]" : "grid-cols-1"}`}
              style={{ minHeight: "min(72vh, 820px)" }}
            >
              <div className="flex min-h-[420px] flex-col">
                <ArchitectViewport2D
                  schema={cleanedSchema}
                  materialsById={materialsById}
                  furniture={furniture}
                  rooms={rooms}
                  targetAreaM2={targetAreaFromPrompt ?? geometryStats.areaM2}
                  isGenerating={generating}
                  containerRef={blueprintRootRef}
                  cartouche={{
                    projectName: cleanedSchema.meta.label.slice(0, 80),
                    clientName: dateStr,
                    scaleText: t("architectScaleAuto", language),
                    dateText: dateStr,
                  }}
                />
              </div>
              {show3D ? (
                <div ref={root3dRef} className="min-h-[360px]">
                  <ArchitectViewport3D schema={cleanedSchema} materialsById={materialsById} furniture={furniture} />
                </div>
              ) : null}
              <Button
                type="button"
                className="fixed bottom-6 right-6 z-[120] min-h-[52px] rounded-full bg-indigo-600 px-5 text-white shadow-2xl hover:bg-indigo-500"
                onClick={() => void handleExportExecution()}
                disabled={exporting}
              >
                {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
                {t("architectExportConstructionPdf", language)}
              </Button>
            </motion.div>
          </>
        ) : null}
      </main>
    </div>
  );
}
