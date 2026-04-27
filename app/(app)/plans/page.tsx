"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import { Loader2 } from "lucide-react";

const FloorPlanEditor = dynamic(
  () => import("@/components/floor-plan/FloorPlanEditor").then((m) => ({ default: m.FloorPlanEditor })),
  { ssr: false, loading: () => <FloorPlanEditorLoading /> }
);

function FloorPlanEditorLoading() {
  const { language } = useLanguage();
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-2 text-slate-600">
      <Loader2 className="h-6 w-6 animate-spin" />
      {t("floorPlanLoading", language)}
    </div>
  );
}

function PlansContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  return <FloorPlanEditor planId={id} />;
}

export default function PlansPage() {
  return (
    <Suspense fallback={<FloorPlanEditorLoading />}>
      <PlansContent />
    </Suspense>
  );
}
