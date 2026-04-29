"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";

const ArchitectAiStudio = dynamic(
  () => import("@/components/architect-ai/architect-ai-studio").then((m) => ({ default: m.ArchitectAiStudio })),
  { ssr: false, loading: () => <ArchitectAiLoading /> }
);

function ArchitectAiLoading() {
  const { language } = useLanguage();
  return (
    <div className="flex min-h-[50vh] items-center justify-center gap-2 text-slate-600">
      <Loader2 className="h-6 w-6 animate-spin" />
      {t("architectLoadingPlan", language)}
    </div>
  );
}

function ArchitectAiPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  return <ArchitectAiStudio planId={id} />;
}

export default function ArchitectAiPage() {
  return (
    <Suspense fallback={<ArchitectAiLoading />}>
      <ArchitectAiPageContent />
    </Suspense>
  );
}
