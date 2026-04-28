"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import { Loader2 } from "lucide-react";

const ArchitectAiStudio = dynamic(
  () => import("@/components/architect-ai/architect-ai-studio").then((m) => ({ default: m.ArchitectAiStudio })),
  { ssr: false, loading: () => <FloorPlanEditorLoading /> }
);

function FloorPlanEditorLoading() {
  const { language } = useLanguage();
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-2 text-slate-600">
      <Loader2 className="h-6 w-6 animate-spin" />
      {t("architectLoadingPlan", language)}
    </div>
  );
}

function PlansContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  return <ArchitectAiStudio planId={id} />;
}

export default function PlansPage() {
  return (
    <Suspense fallback={<FloorPlanEditorLoading />}>
      <PlansContent />
    </Suspense>
  );
}
