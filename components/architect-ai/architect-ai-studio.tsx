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
import { architecturalSchemaToFloorPlan } from "@/lib/architect-ai/schema-to-floor-plan";
import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "@/lib/architect-ai/bim-types";
import { generateExecutionDossierPdf } from "@/lib/architect-ai/execution-dossier-pdf";
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
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [show3D, setShow3D] = useState(true);
  const [planTitle, setPlanTitle] = useState("");
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

  const categoryChoices = useMemo(
    () =>
      [
        { id: "safe_room" as const, label: t("architectCategorySafeRoom", language) },
        { id: "house" as const, label: t("architectCategoryHouse", language) },
        { id: "technical_room" as const, label: t("architectCategoryTechnicalRoom", language) },
      ] satisfies Array<{ id: ArchitecturalProjectCategory; label: string }>,
    [language]
  );

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
    const inferredCategory: ArchitecturalProjectCategory = normalized.includes("safe room")
      ? "safe_room"
      : normalized.includes("local technique") || normalized.includes("technical room")
        ? "technical_room"
        : projectCategory;
    if (inferredCategory !== projectCategory) setProjectCategory(inferredCategory);
    setChatMessages((prev) => [...prev, { id: `${Date.now()}-u`, role: "user", text: p }]);
    setGenerating(true);
    try {
      const { schema: next, used_materials } = await generateArchitecturalSchema(p, language, inferredCategory);
      const snapped = snapAxisAlignedSchema(next);
      setSchema(snapped);
      setUsedMaterials(used_materials);
      const doc = architecturalSchemaToFloorPlan(snapped);
      updateDocument(() => doc);
      setPlanTitle((prev) => prev || snapped.meta.label);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: "assistant",
          text: t("architectChatGenerated", language),
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
      ]);
    } finally {
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

  const handleExportExecution = async () => {
    if (!schema) return;
    setExporting(true);
    try {
      await handleSave();
      await new Promise((r) => setTimeout(r, 450));
      const png3d = capture3dPng();
      const png2d = await capture2dPng();
      const blob = await generateExecutionDossierPdf({
        projectName: planTitle || schema.meta.label,
        companyName: profile?.company_name ?? null,
        schema,
        materialsById,
        render3dDataUrl: png3d,
        render2dDataUrl: png2d,
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
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md"
      >
        <div className="mx-auto flex max-w-[1600px] flex-col gap-2 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-sky-100 md:text-2xl">{t("architectPageTitle", language)}</h1>
            <p className="mt-0.5 text-sm text-slate-400">{t("architectPageSubtitle", language)}</p>
          </div>
          <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row sm:items-center">
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
        {error && <p className="rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-200">{error}</p>}

        <div className="rounded-2xl border border-cyan-500/35 bg-[#040b16] p-3 shadow-[0_0_22px_rgba(56,189,248,0.08)]">
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
          <div className="flex flex-col gap-2 md:flex-row md:items-end">
            <div className="flex-1 space-y-1">
              <label htmlFor="architect-prompt" className="text-xs font-semibold uppercase tracking-wider text-cyan-300/90">
              {t("architectPromptLabel", language)}
              </label>
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
                placeholder={t("architectPromptChatPlaceholder", language)}
                className="min-h-[48px] border-cyan-700/40 bg-[#050f1f] text-slate-100 placeholder:text-slate-500"
              />
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
              className="min-h-[48px] shrink-0 gap-2 bg-cyan-500 text-slate-950 hover:bg-cyan-400 md:mb-0.5"
              onClick={() => void handleGenerate()}
              disabled={generating || !prompt.trim()}
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t("architectGenerate", language)}
            </Button>
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

        <div className={`grid min-h-[min(78vh,860px)] grid-cols-1 gap-4 ${show3D ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            className="flex min-h-[360px] flex-col"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-500/90">{t("architectPanel2d", language)}</p>
            <ArchitectViewport2D
              schema={schema}
              materialsById={materialsById}
              cartouche={{
                projectName: planTitle || schema?.meta.label || "",
                clientName: profile?.company_name ?? "Client",
                scaleText: "1/50",
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
                <ArchitectViewport3D schema={schema} materialsById={materialsById} />
              </div>
            </motion.div>
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
