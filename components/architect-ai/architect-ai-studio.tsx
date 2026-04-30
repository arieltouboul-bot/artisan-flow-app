"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, FileDown, Save, Loader2, Ruler, Cuboid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFloorPlan } from "@/hooks/use-floor-plan";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import { useProfile } from "@/hooks/use-profile";
import {
  generateArchitecturalSchema,
  type ArchitecturalProjectCategory,
} from "@/lib/architect-ai/generate-architectural-schema";
import type { ArchitectFurnitureItem, ArchitectRoom, ArchitectTechnicalNode } from "@/lib/architect-ai/ollamaArchitect";
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

type ArchitectChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

export function ArchitectAiStudio({ planId }: ArchitectAiStudioProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { profile } = useProfile();
  const [prompt, setPrompt] = useState("");
  const [chatMessages, setChatMessages] = useState<ArchitectChatMessage[]>([]);
  const [projectCategory, setProjectCategory] = useState<ArchitecturalProjectCategory>("house");
  const [schema, setSchema] = useState<ArchitecturalSchema | null>(null);
  const [usedMaterials, setUsedMaterials] = useState<ArchitecturalLibraryRow[]>([]);
  const [furniture, setFurniture] = useState<ArchitectFurnitureItem[]>([]);
  const [rooms, setRooms] = useState<ArchitectRoom[]>([]);
  const [technicalNodes, setTechnicalNodes] = useState<ArchitectTechnicalNode[]>([]);
  const [webInsights, setWebInsights] = useState<SerperSnippet[]>([]);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [show3D, setShow3D] = useState(true);
  const [planTitle, setPlanTitle] = useState("");
  const [housingType, setHousingType] = useState("Appartement");
  const [surfaceM2, setSurfaceM2] = useState("24");
  const [securityLevel, setSecurityLevel] = useState("Moyen");
  const [occupants, setOccupants] = useState("2");
  const [variant, setVariant] = useState<"basic" | "optimized" | "premium">("basic");
  const [webAnalysisInProgress, setWebAnalysisInProgress] = useState(false);
  const [thinkingStep, setThinkingStep] = useState<string | null>(null);
  const root3dRef = useRef<HTMLDivElement>(null);

  const onPlanCreated = useCallback(
    (id: string) => {
      router.replace(`/plans?id=${id}`);
    },
    [router]
  );

  const { row, updateDocument, loading, saving, error, persist, cancelScheduledSave } = useFloorPlan(planId, {
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

  const categoryChoices = useMemo(
    () =>
      [
        { id: "safe_room" as const, label: t("architectCategorySafeRoom", language) },
        { id: "house" as const, label: t("architectCategoryHouse", language) },
        { id: "technical_room" as const, label: t("architectCategoryTechnicalRoom", language) },
      ] satisfies Array<{ id: ArchitecturalProjectCategory; label: string }>,
    [language]
  );

  const familyColor = (family: ArchitecturalLibraryRow["material_family"]) => {
    if (family === "concrete") return "bg-slate-600/50 text-slate-100 border-slate-400/40";
    if (family === "metal") return "bg-cyan-700/35 text-cyan-100 border-cyan-500/40";
    if (family === "wood") return "bg-amber-700/35 text-amber-100 border-amber-500/40";
    if (family === "glass") return "bg-sky-700/35 text-sky-100 border-sky-500/40";
    return "bg-indigo-700/35 text-indigo-100 border-indigo-500/40";
  };

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
    if (!schema) return { areaM2: 0, volumeM3: 0 };
    const areaM2 = schema.zones.reduce((sum, zone) => sum + zone.area_m2, 0);
    const volumeM3 = schema.structure.walls.reduce((sum, w) => {
      const len = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
      return sum + len * w.height_m * w.thickness_m;
    }, 0);
    return { areaM2, volumeM3 };
  }, [schema]);

  const thoughtStepIndex = useMemo(() => {
    if (!thinkingStep) return -1;
    if (thinkingStep.toLowerCase().includes("recherche")) return 0;
    if (thinkingStep.toLowerCase().includes("analyse")) return 1;
    if (thinkingStep.toLowerCase().includes("optimisation")) return 2;
    return -1;
  }, [thinkingStep]);

  const handleGenerate = async () => {
    const p = prompt.trim();
    if (generating) return;
    if (!p) {
      setChatMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-suggest`, role: "assistant", text: t("architectPromptSuggestions", language) },
      ]);
      return;
    }
    if (p.length < 8 && !/\d|safe|studio|garage|extension|room|maison|plan/i.test(p)) {
      setChatMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-vague`, role: "assistant", text: t("architectPromptSuggestions", language) },
      ]);
      return;
    }
    const normalized = p.toLowerCase();
    const businessBrief = [
      `Type logement: ${housingType}`,
      `Taille: ${surfaceM2} m2`,
      `Niveau securite: ${securityLevel}`,
      `Nombre personnes: ${occupants}`,
      `Variante: ${variant}`,
      variant === "premium" ? "Ajouter obligatoirement un sas de securite." : "",
      variant === "optimized" ? "Priorite survie 24h avec stockage eau et alimentation." : "",
      variant === "basic" ? "Priorite protection intrusion sans surequipement." : "",
    ]
      .filter(Boolean)
      .join("\n");
    const inferredCategory: ArchitecturalProjectCategory = normalized.includes("safe room")
      ? "safe_room"
      : normalized.includes("local technique") || normalized.includes("technical room")
        ? "technical_room"
        : projectCategory;
    if (inferredCategory !== projectCategory) setProjectCategory(inferredCategory);
    setChatMessages((prev) => [...prev, { id: `${Date.now()}-u`, role: "user", text: p }]);
    setGenerating(true);
    setWebAnalysisInProgress(true);
    setThinkingStep("Recherche web en cours...");
    const step1 = window.setTimeout(() => setThinkingStep("Analyse structurelle..."), 900);
    const step2 = window.setTimeout(() => setThinkingStep("Optimisation du mobilier..."), 1900);
    try {
      const {
        schema: next,
        used_materials,
        warning,
        furniture: generatedFurniture,
        rooms: generatedRooms,
        technical_nodes,
        rag_query,
        thought_steps,
        web_context_snippets,
      } =
        await generateArchitecturalSchema(`${p}\n\nContraintes metier:\n${businessBrief}`, language, inferredCategory);
      if (thought_steps?.length) setThinkingStep(thought_steps[thought_steps.length - 1] ?? null);
      const snapped = snapAxisAlignedSchema(next);
      setSchema(snapped);
      setUsedMaterials(used_materials);
      setFurniture(generatedFurniture ?? []);
      setRooms(generatedRooms ?? []);
      setTechnicalNodes(technical_nodes ?? []);
      setWebInsights(web_context_snippets ?? []);
      setWebAnalysisInProgress(false);
      const doc = architecturalSchemaToFloorPlan(snapped);
      updateDocument(() => doc);
      setPlanTitle((prev) => prev || snapped.meta.label);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: "assistant",
          text: warning
            ? `${t("architectChatGenerated", language)} ${warning}`
            : rag_query
              ? `${t("architectChatGenerated", language)} Requete web: ${rag_query}`
              : t("architectChatGenerated", language),
        },
        {
          id: `${Date.now()}-disclaimer`,
          role: "assistant",
          text: t("architectDisclaimer", language),
        },
      ]);
      setPrompt("");
    } catch (e) {
      console.error("[architect.studio] generation failed", {
        promptPreview: p.slice(0, 180),
        projectCategory: inferredCategory,
        error: e instanceof Error ? e.message : String(e),
      });
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          role: "assistant",
          text: t("architectChatError", language),
        },
        {
          id: `${Date.now()}-disclaimer-err`,
          role: "assistant",
          text: t("architectDisclaimer", language),
        },
      ]);
    } finally {
      window.clearTimeout(step1);
      window.clearTimeout(step2);
      setWebAnalysisInProgress(false);
      setThinkingStep(null);
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
        meta: { ...doc.meta, planName: planTitle || schemaForSave.meta.label },
      },
      {
        name: planTitle || schemaForSave.meta.label,
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
    const svg = window.document.querySelector("svg");
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
        projectName: planTitle || schema.meta.label,
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
      a.download = `dossier-execution-${(planTitle || "bim").replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handleRegenerate = () => {
    setPrompt("");
    setChatMessages([]);
    setFurniture([]);
    setRooms([]);
    setTechnicalNodes([]);
    setWebInsights([]);
    setThinkingStep(null);
  };

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
      <motion.header initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md">
        <div className="mx-auto max-w-[1200px] px-4 py-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-sky-100" style={{ fontFamily: "Inter, sans-serif" }}>
            {t("architectPageTitle", language)}
          </h1>
          <p className="mt-2 text-sm text-slate-400">{t("architectPageSubtitle", language)}</p>
          <div className="mx-auto mt-4 max-w-md">
            <Input
              value={planTitle}
              onChange={(e) => setPlanTitle(e.target.value)}
              placeholder={t("architectPlanNamePh", language)}
              className="min-h-[44px] border-slate-700 bg-slate-900/80 text-slate-100 placeholder:text-slate-500"
            />
          </div>
        </div>
      </motion.header>

      <main className="mx-auto max-w-[1600px] space-y-4 px-4 py-6">
        <div className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
          {t("architectDisclaimer", language)}
        </div>
        {webAnalysisInProgress ? (
          <div className="rounded-md border border-cyan-700/50 bg-cyan-950/25 px-3 py-2 text-xs text-cyan-200">
            {thinkingStep ?? "Recherche web en cours..."}
          </div>
        ) : null}
        {error && <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p>}

        <div className="rounded-2xl border border-cyan-500/35 bg-[#040b16] p-4 shadow-[0_0_22px_rgba(56,189,248,0.08)]">
          <div className="mb-3 max-h-[200px] space-y-2 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/70 p-3">
            {chatMessages.length === 0 ? (
              <p className="text-sm text-slate-400">{t("architectChatEmpty", language)}</p>
            ) : (
              chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "ml-auto bg-cyan-600/25 text-cyan-100"
                      : "border border-lime-500/25 bg-lime-500/10 text-lime-100"
                  }`}
                >
                  {m.text}
                </div>
              ))
            )}
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1 space-y-1">
              <Input
                id="architect-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleGenerate();
                  }
                }}
                placeholder={t("architectSearchPlaceholder", language)}
                className="min-h-[58px] rounded-2xl border-cyan-700/40 bg-[#050f1f] text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <div className="grid w-full grid-cols-2 gap-2 md:max-w-[440px]">
              <Input value={housingType} onChange={(e) => setHousingType(e.target.value)} placeholder={t("architectHousingType", language)} className="min-h-[44px] border-cyan-700/40 bg-[#050f1f] text-slate-100" />
              <Input value={surfaceM2} onChange={(e) => setSurfaceM2(e.target.value)} placeholder={t("architectSurfaceM2", language)} className="min-h-[44px] border-cyan-700/40 bg-[#050f1f] text-slate-100" />
              <Input value={securityLevel} onChange={(e) => setSecurityLevel(e.target.value)} placeholder={t("architectSecurityLevel", language)} className="min-h-[44px] border-cyan-700/40 bg-[#050f1f] text-slate-100" />
              <Input value={occupants} onChange={(e) => setOccupants(e.target.value)} placeholder={t("architectOccupants", language)} className="min-h-[44px] border-cyan-700/40 bg-[#050f1f] text-slate-100" />
            </div>
            <div className="w-full space-y-1 md:max-w-[340px]">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300/90">
                {t("architectCategoryLabel", language)}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 md:grid-cols-1">
                {categoryChoices.map((choice) => (
                  <Button
                    key={choice.id}
                    type="button"
                    variant={projectCategory === choice.id ? "default" : "secondary"}
                    className={
                      projectCategory === choice.id
                        ? "justify-start bg-lime-500 text-slate-950 hover:bg-lime-400"
                        : "justify-start border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                    }
                    onClick={() => setProjectCategory(choice.id)}
                  >
                    {choice.label}
                  </Button>
                ))}
              </div>
            </div>
            <Button
              type="button"
              className="min-h-[58px] shrink-0 gap-2 rounded-2xl bg-cyan-500 px-6 text-slate-950 hover:bg-cyan-400 md:mb-0.5"
              onClick={() => void handleGenerate()}
              disabled={generating}
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t("architectGenerateExpert", language)}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[
              { key: t("architectStepSerper", language), idx: 0 },
              { key: t("architectStepOllama", language), idx: 1 },
              { key: t("architectStepVector", language), idx: 2 },
            ].map((step) => {
              const active = thoughtStepIndex >= step.idx || (!generating && schema);
              return (
                <motion.span
                  key={step.key}
                  animate={{ opacity: active ? 1 : 0.55, scale: active ? 1 : 0.98 }}
                  className={`rounded-full border px-3 py-1 text-xs ${active ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-200" : "border-slate-700 text-slate-400"}`}
                >
                  {step.key}
                </motion.span>
              );
            })}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(
              [
                { key: "basic", label: t("architectVariantBasic", language) },
                { key: "optimized", label: t("architectVariantOptimized", language) },
                { key: "premium", label: t("architectVariantPremium", language) },
              ] as const
            ).map((option) => (
              <Button
                key={option.key}
                type="button"
                variant={variant === option.key ? "default" : "secondary"}
                className={variant === option.key ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400" : "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"}
                onClick={() => setVariant(option.key)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-200">
            <p className="flex items-center gap-2 text-sky-300">
              <Ruler className="h-4 w-4" />
              {t("architectHabitableSurface", language)}: {geometryStats.areaM2.toFixed(2)} m2
            </p>
          </div>
          <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 px-3 py-2 text-sm text-slate-200">
            <p className="flex items-center gap-2 text-indigo-300">
              <Cuboid className="h-4 w-4" />
              {t("architectWallVolume", language)}: {geometryStats.volumeM3.toFixed(2)} m3
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-lg border border-slate-800/70 bg-slate-900/40 p-2">
          {[
            { k: t("architectBadgeStructural", language), c: "bg-slate-600/60" },
            { k: t("architectBadgeInsulation", language), c: "bg-cyan-700/50" },
            { k: t("architectBadgeFinishing", language), c: "bg-indigo-700/50" },
            { k: t("architectBadgeRoofing", language), c: "bg-amber-700/50" },
          ].map((badge) => (
            <span key={badge.k} className={`rounded border border-slate-500/30 px-2 py-1 text-xs ${badge.c}`}>
              {badge.k}
            </span>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="secondary"
            className="border-cyan-700/60 bg-slate-900 text-cyan-200 hover:bg-slate-800"
            onClick={() => setShow3D((prev) => !prev)}
          >
            {show3D ? t("architectHide3d", language) : t("architectShow3d", language)}
          </Button>
        </div>

        <div className={`relative grid min-h-[min(78vh,860px)] grid-cols-1 gap-4 ${show3D ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            className="flex min-h-[360px] flex-col"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-500/90">{t("architectPanel2d", language)}</p>
            <ArchitectViewport2D
              schema={cleanedSchema}
              materialsById={materialsById}
              furniture={furniture}
              rooms={rooms}
              targetAreaM2={Number(surfaceM2) || geometryStats.areaM2}
              isGenerating={generating}
              cartouche={{
                projectName: "Projet : AI Generated",
                clientName: new Date().toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB"),
                scaleText: "Échelle : Auto",
                dateText: new Date().toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB"),
              }}
            />
          </motion.div>
          {show3D ? (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="flex min-h-[360px] flex-col"
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-500/90">{t("architectPanel3d", language)}</p>
              <div ref={root3dRef} className="min-h-[360px] flex-1">
                <ArchitectViewport3D schema={cleanedSchema} materialsById={materialsById} furniture={furniture} />
              </div>
            </motion.div>
          ) : null}
          <div className="rounded-lg border border-slate-700/80 bg-slate-950/70 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">{t("architectInventoryTitle", language)}</p>
            <div className="max-h-[420px] space-y-2 overflow-y-auto">
              {usedMaterials.length === 0 ? (
                <p className="text-xs text-slate-500">{t("architectInventoryEmpty", language)}</p>
              ) : (
                usedMaterials.map((m) => (
                  <div key={m.id} className={`rounded border px-2 py-1 text-xs ${familyColor(m.material_family)}`}>
                    <p className="font-medium">{m.name}</p>
                    <p className="opacity-80">{m.category ?? t("architectCategoryGeneral", language)}</p>
                  </div>
                ))
              )}
            </div>
            {technicalNodes.length > 0 ? (
              <div className="mt-3 border-t border-slate-800 pt-2">
                <p className="mb-1 text-[11px] uppercase tracking-wider text-slate-400">Technical nodes</p>
                {technicalNodes.map((node) => (
                  <p key={node.id} className="text-[11px] text-slate-300">
                    {node.type} ({node.x.toFixed(2)}, {node.y.toFixed(2)})
                  </p>
                ))}
              </div>
            ) : null}
          </div>
          {schema ? (
            <Button
              type="button"
              className="fixed bottom-6 right-6 z-[120] min-h-[52px] rounded-full bg-indigo-600 px-5 text-white shadow-2xl hover:bg-indigo-500"
              onClick={() => void handleExportExecution()}
              disabled={exporting}
            >
              {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
              {t("architectDownloadProPdf", language)}
            </Button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-800/80 pt-4">
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] gap-2 border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700"
            onClick={() => void handleSave()}
            disabled={!schema || saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("architectSaveJson", language)}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-[44px] gap-2 border-cyan-700/60 bg-slate-900 text-cyan-200 hover:bg-slate-800"
            onClick={handleRegenerate}
          >
            {t("architectRegenerate", language)}
          </Button>
          <Button
            type="button"
            className="min-h-[44px] gap-2 bg-indigo-600 text-white hover:bg-indigo-500"
            onClick={() => void handleExportExecution()}
            disabled={!schema || exporting}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {t("architectExportExecutionComplete", language)}
          </Button>
        </div>
      </main>
    </div>
  );
}
