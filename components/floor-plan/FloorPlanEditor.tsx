"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Stage as KonvaStage } from "konva/lib/Stage";
import { FloorPlanCanvas } from "@/components/floor-plan/FloorPlanCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useFloorPlan } from "@/hooks/use-floor-plan";
import { MaterialSelector } from "@/components/floor-plan/MaterialSelector";
import { useFloorPlanInteraction } from "@/hooks/use-floor-plan-interaction";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import { useProfile } from "@/hooks/use-profile";
import { useProjects } from "@/hooks/use-projects";
import { createClient } from "@/lib/supabase/client";
import { buildNomenclature, collectInstallationNotices } from "@/lib/floor-plan/nomenclature";
import { estimateLargestEnclosedAreaM2 } from "@/lib/floor-plan/room-area-grid";
import { generateTechnicalFloorPlanPdf } from "@/lib/floor-plan/export-technical-pdf";
import type { FloorPlanTool } from "@/hooks/use-floor-plan-interaction";
import { Loader2, FileDown, Save } from "lucide-react";

type FloorPlanEditorProps = {
  planId: string | null;
};

export function FloorPlanEditor({ planId }: FloorPlanEditorProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const { profile } = useProfile();
  const { projects } = useProjects();
  const stageRef = useRef<KonvaStage>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1000, h: 620 });
  const [planTitle, setPlanTitle] = useState("");
  const [projectId, setProjectId] = useState<string | null>(null);
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const onPlanCreated = useCallback(
    (id: string) => {
      router.replace(`/plans?id=${id}`);
    },
    [router]
  );

  const {
    row,
    document: planDoc,
    updateDocument,
    materials,
    materialsById,
    loading,
    saving,
    error,
    persist,
    setCmPerPixel,
    cmPerPixel,
    cancelScheduledSave,
  } = useFloorPlan(planId, { onPlanCreated });

  const defaultMat = materials[0];
  const effectiveMaterialId = materialId ?? defaultMat?.id ?? null;
  const effectiveMaterialLabel = useMemo(() => {
    if (!effectiveMaterialId) return language === "fr" ? "Sans catalogue" : "No catalogue";
    return materialsById.get(effectiveMaterialId)?.name ?? (language === "fr" ? "Matériau" : "Material");
  }, [effectiveMaterialId, materialsById, language]);

  const interaction = useFloorPlanInteraction(planDoc, updateDocument, {
    language,
    defaultMaterialId: effectiveMaterialId,
    defaultMaterialLabel: effectiveMaterialLabel,
  });

  useEffect(() => {
    if (!row) return;
    setPlanTitle(row.name);
    setProjectId(row.project_id);
  }, [row]);

  useEffect(() => {
    if (!materialId && defaultMat?.id) setMaterialId(defaultMat.id);
  }, [defaultMat?.id, materialId]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const w = Math.max(480, Math.floor(r.width));
      const h = Math.max(360, Math.min(720, Math.floor(w * 0.55)));
      setSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const walls = useMemo(() => planDoc.elements.filter((e) => e.type === "mur"), [planDoc.elements]);
  const rooms = useMemo(
    () => estimateLargestEnclosedAreaM2(walls, planDoc.meta.cmPerPixel),
    [walls, planDoc.meta.cmPerPixel]
  );
  const nomenclature = useMemo(
    () => buildNomenclature(planDoc, materialsById, language),
    [planDoc, materialsById, language]
  );
  const notices = useMemo(
    () => collectInstallationNotices(planDoc, materialsById),
    [planDoc, materialsById]
  );

  const handleSaveNow = async () => {
    cancelScheduledSave();
    await persist(planDoc, { name: planTitle || undefined, project_id: projectId });
  };

  const handleExportPdf = async () => {
    if (!createClient()) return;
    setExporting(true);
    try {
      await handleSaveNow();
      const dataUrl =
        stageRef.current?.toDataURL({
          mimeType: "image/png",
          quality: 1,
          pixelRatio: 2,
        }) ?? null;
      const thumb = stageRef.current?.toDataURL({
        mimeType: "image/png",
        quality: 0.85,
        pixelRatio: 0.35,
      }) ?? null;
      const blob = await generateTechnicalFloorPlanPdf({
        projectName: planTitle || t("floorPlanPlanName", language),
        companyName: profile?.company_name ?? null,
        planImageDataUrl: dataUrl,
        thumbnailDataUrl: thumb,
        doc: planDoc,
        nomenclature,
        rooms,
        notices,
        language,
      });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `dossier-technique-${(planTitle || "plan").replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const toolBtn = (tool: FloorPlanTool, label: string) => (
    <Button
      key={tool}
      type="button"
      variant={interaction.tool === tool ? "default" : "outline"}
      size="sm"
      className="min-h-[40px]"
      onClick={() => interaction.setTool(tool)}
    >
      {label}
    </Button>
  );

  const supabase = createClient();
  if (!supabase) {
    return <p className="p-6 text-sm text-red-600">{t("floorPlanSupabaseMissing", language)}</p>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        {t("floorPlanLoading", language)}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("floorPlanPageTitle", language)}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("floorPlanPageSubtitle", language)}</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("floorPlanScaleLabel", language)}</CardTitle>
              <p className="text-xs text-slate-500">{t("floorPlanScaleHelp", language)}</p>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600" htmlFor="cm-per-px">
                  cm / px
                </label>
                <Input
                  id="cm-per-px"
                  type="number"
                  step={0.01}
                  min={0.0001}
                  className="w-36 min-h-[44px]"
                  value={cmPerPixel}
                  onChange={(e) => setCmPerPixel(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {toolBtn("mur", t("floorPlanToolWall", language))}
                {toolBtn("porte", t("floorPlanToolDoor", language))}
                {toolBtn("fenetre", t("floorPlanToolWindow", language))}
                {toolBtn("meuble", t("floorPlanToolFurniture", language))}
              </div>
            </CardContent>
          </Card>

          <div ref={wrapRef} className="w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 p-2">
            <FloorPlanCanvas
              ref={stageRef}
              width={size.w}
              height={size.h}
              document={planDoc}
              draftStart={interaction.draftStart}
              draftEnd={interaction.draftEnd}
              wallLengthLabel={interaction.wallLengthLabel}
              language={language}
              onPointerDown={interaction.onPointerDown}
              onPointerMove={interaction.onPointerMove}
              onPointerUp={interaction.onPointerUp}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" className="min-h-[44px] gap-2" onClick={() => void handleSaveNow()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("floorPlanSave", language)}
            </Button>
            <Button type="button" className="min-h-[44px] gap-2" onClick={() => void handleExportPdf()} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
              {t("floorPlanExportPdf", language)}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("floorPlanPlanName", language)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                className="min-h-[44px]"
                value={planTitle}
                onChange={(e) => setPlanTitle(e.target.value)}
                onBlur={() => void persist(planDoc, { name: planTitle || undefined, project_id: projectId })}
              />
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">{t("floorPlanProject", language)}</label>
                <select
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={projectId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value || null;
                    setProjectId(v);
                    void persist(planDoc, { name: planTitle || undefined, project_id: v });
                  }}
                >
                  <option value="">{t("floorPlanNoProject", language)}</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="floor-plan-material-select" className="text-xs font-medium text-slate-600">
                  {t("floorPlanMaterial", language)}
                </label>
                <MaterialSelector
                  id="floor-plan-material-select"
                  value={effectiveMaterialId}
                  onValueChange={(id) => setMaterialId(id)}
                  materials={materials}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("floorPlanSurfaceEst", language)}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {rooms.length === 0 ? (
                <p className="text-slate-500">{language === "fr" ? "Tracez des murs pour estimer." : "Draw walls to estimate."}</p>
              ) : (
                rooms.map((r) => (
                  <div key={r.id} className="flex justify-between gap-2 border-b border-slate-100 py-1">
                    <span className="text-slate-700">{r.label}</span>
                    <span className="font-medium">
                      {r.area_m2.toFixed(2)} m²
                      {r.approximate ? " *" : ""}
                    </span>
                  </div>
                ))
              )}
              <p className="text-xs text-amber-800">{t("floorPlanNoticeApprox", language)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("floorPlanNomenclature", language)}</CardTitle>
            </CardHeader>
            <CardContent className="max-h-64 space-y-2 overflow-y-auto text-xs">
              {nomenclature.length === 0 ? (
                <p className="text-slate-500">{language === "fr" ? "Aucun élément." : "No elements yet."}</p>
              ) : (
                nomenclature.map((n, i) => (
                  <div key={i} className="rounded border border-slate-100 p-2">
                    <div className="font-medium text-slate-800">{n.label}</div>
                    <div className="text-slate-600">
                      {n.quantity.toFixed(2)} {n.unit} — {n.detail}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
