"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, FileDown, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFloorPlan } from "@/hooks/use-floor-plan";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import { useProfile } from "@/hooks/use-profile";
import { generateArchitecturalSchema } from "@/lib/architect-ai/generate-architectural-schema";
import { architecturalSchemaToFloorPlan } from "@/lib/architect-ai/schema-to-floor-plan";
import type { ArchitecturalLibraryRow, ArchitecturalSchema } from "@/lib/architect-ai/bim-types";
import { generateExecutionDossierPdf } from "@/lib/architect-ai/execution-dossier-pdf";
import { ArchitectViewport2D } from "./architect-viewport-2d";
import { ArchitectViewport3D } from "./architect-viewport-3d";
import { BlueprintLoader } from "./blueprint-loader";

type ArchitectAiStudioProps = {
  planId: string | null;
};

export function ArchitectAiStudio({ planId }: ArchitectAiStudioProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { profile } = useProfile();
  const [prompt, setPrompt] = useState("");
  const [schema, setSchema] = useState<ArchitecturalSchema | null>(null);
  const [usedMaterials, setUsedMaterials] = useState<ArchitecturalLibraryRow[]>([]);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
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

  const handleGenerate = async () => {
    const p = prompt.trim();
    if (!p || generating) return;
    setGenerating(true);
    try {
      const { schema: next, used_materials } = await generateArchitecturalSchema(p, language);
      setSchema(next);
      setUsedMaterials(used_materials);
      const doc = architecturalSchemaToFloorPlan(next);
      updateDocument(() => doc);
      setPlanTitle((prev) => prev || next.meta.label);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!schema) return;
    cancelScheduledSave();
    const doc = architecturalSchemaToFloorPlan(schema);
    await persist(
      {
        ...doc,
        meta: { ...doc.meta, planName: planTitle || schema.meta.label },
      },
      {
        name: planTitle || schema.meta.label,
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

  const handleExportExecution = async () => {
    if (!schema) return;
    setExporting(true);
    try {
      await handleSave();
      await new Promise((r) => setTimeout(r, 450));
      const png3d = capture3dPng();
      const blob = await generateExecutionDossierPdf({
        projectName: planTitle || schema.meta.label,
        companyName: profile?.company_name ?? null,
        schema,
        materialsById,
        render3dDataUrl: png3d,
        render2dDataUrl: null,
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

        <div className="flex flex-col gap-2 rounded-2xl border border-sky-900/40 bg-slate-900/50 p-3 shadow-[inset_0_1px_0_rgba(56,189,248,0.08)] backdrop-blur-sm md:flex-row md:items-end">
          <div className="flex-1 space-y-1">
            <label htmlFor="architect-prompt" className="text-xs font-semibold uppercase tracking-wider text-sky-400/90">
              {t("architectPromptLabel", language)}
            </label>
            <textarea
              id="architect-prompt"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t("architectPromptPlaceholder", language)}
              className="min-h-[88px] w-full resize-y rounded-lg border border-slate-700 bg-[#060d18] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50"
            />
          </div>
          <Button
            type="button"
            className="min-h-[48px] shrink-0 gap-2 bg-sky-600 text-white hover:bg-sky-500 md:mb-0.5"
            onClick={() => void handleGenerate()}
            disabled={generating || !prompt.trim()}
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t("architectGenerate", language)}
          </Button>
        </div>

        <div className="grid min-h-[min(78vh,860px)] grid-cols-1 gap-4 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35 }}
            className="flex min-h-[360px] flex-col"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-500/90">{t("architectPanel2d", language)}</p>
            <ArchitectViewport2D schema={schema} />
          </motion.div>
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
            className="min-h-[44px] gap-2 bg-indigo-600 text-white hover:bg-indigo-500"
            onClick={() => void handleExportExecution()}
            disabled={!schema || exporting}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {t("architectExportExecution", language)}
          </Button>
        </div>
      </main>
    </div>
  );
}
