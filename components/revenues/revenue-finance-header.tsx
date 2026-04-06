"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/context/language-context";
import { useProfile } from "@/hooks/use-profile";
import { useFinanceAnalytics } from "@/hooks/use-finance-analytics";
import { t, tReplace } from "@/lib/translations";
import { formatConvertedCurrency } from "@/lib/utils";
import { generateFinanceSummaryPDF } from "@/lib/finance-summary-pdf";
import { pdfLocaleFromAppLanguage } from "@/lib/finance-pdf-labels";
import { cn } from "@/lib/utils";
import { FinanceKpiDetailModals, type FinanceKpiDetailKey } from "@/components/finance/finance-kpi-detail-modals";
import { AlertTriangle, Download, TrendingDown, TrendingUp } from "lucide-react";

function StatSkeleton() {
  return (
    <Card className="border-slate-100 shadow-sm">
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-full max-w-[140px]" />
        <Skeleton className="mt-2 h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function RevenueFinanceHeaderInner() {
  const { language } = useLanguage();
  const { profile, displayCurrency } = useProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, loading, error, refetch: refetchFinance } = useFinanceAnalytics();
  const [open, setOpen] = useState<FinanceKpiDetailKey | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const detailYear = new Date().getFullYear();

  useEffect(() => {
    const d = searchParams.get("detail");
    if (d === "month" || d === "year" || d === "margin" || d === "unpaid") {
      setOpen(d);
      router.replace("/revenus", { scroll: false });
    }
  }, [searchParams, router]);

  const exportPdf = async () => {
    setPdfBusy(true);
    try {
      const blob = await generateFinanceSummaryPDF({
        companyName: profile?.company_name ?? null,
        data,
        locale: pdfLocaleFromAppLanguage(language),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finance-summary-${new Date().toISOString().slice(0, 10)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfBusy(false);
    }
  };

  const mom = data.caMonthMomPct;
  const momUp = mom != null && mom > 0;
  const momDown = mom != null && mom < 0;
  const marginValueEur = data.companyTotalRevenueEur - data.companyTotalExpensesEur;
  const marginPositive = marginValueEur >= 0;
  const marginPct = data.companyTotalRevenueEur > 0 ? (marginValueEur / data.companyTotalRevenueEur) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 gap-2"
          disabled={loading || pdfBusy}
          onClick={() => void exportPdf()}
        >
          <Download className="h-4 w-4" />
          {pdfBusy ? t("financeExporting", language) : t("financeExportPdf", language)}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => refetchFinance()}>
            {t("financeRetry", language)}
          </button>
        </div>
      )}

      {data.materialAlerts.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 flex gap-3 items-start">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-semibold">{t("financeMaterialOverrunTitle", language)}</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              {data.materialAlerts.map((a) => (
                <li key={a.projectId}>
                  <Link href={`/projets/${a.projectId}`} className="text-indigo-700 underline font-medium">
                    {a.projectName}
                  </Link>
                  {" — "}
                  {tReplace("financeMaterialOverrunLine", language, {
                    spent: formatConvertedCurrency(a.spentMaterialsEur, displayCurrency),
                    budget: formatConvertedCurrency(a.budgetMaterialsEur, displayCurrency),
                  })}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setOpen("month")}
              className={cn(
                "text-left rounded-xl border border-indigo-100 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              )}
            >
              <p className="text-xs font-medium text-slate-600">{t("revenueCardMonth", language)}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {formatConvertedCurrency(data.caMonthEur, displayCurrency)}
              </p>
              <p
                className={cn(
                  "mt-1 text-xs flex items-center gap-1",
                  momUp && "text-emerald-600",
                  momDown && "text-rose-600"
                )}
              >
                {mom != null ? (
                  <>
                    {momUp ? <TrendingUp className="h-3.5 w-3.5" /> : momDown ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                    {tReplace("financeMomPct", language, { pct: Math.round(mom * 10) / 10 })}
                  </>
                ) : (
                  <span className="text-slate-400">{t("financeMomNa", language)}</span>
                )}
              </p>
              <p className="mt-2 text-xs text-indigo-600 font-medium">{t("revenueCardTapDetail", language)}</p>
            </button>

            <button
              type="button"
              onClick={() => setOpen("year")}
              className={cn(
                "text-left rounded-xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              )}
            >
              <p className="text-xs font-medium text-slate-600">{t("revenueCardYear", language)}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {formatConvertedCurrency(data.caYtdEur, displayCurrency)}
              </p>
              <p className="mt-1 text-xs text-slate-500">{t("revenueCardYearHint", language)}</p>
              <p className="mt-2 text-xs text-emerald-700 font-medium">{t("revenueCardTapDetail", language)}</p>
            </button>

            <button
              type="button"
              onClick={() => setOpen("margin")}
              className={cn(
                "text-left rounded-xl border bg-white p-4 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2",
                marginPositive
                  ? "border-emerald-100 hover:border-emerald-300 focus-visible:ring-emerald-500"
                  : "border-rose-100 hover:border-rose-300 focus-visible:ring-rose-500"
              )}
            >
              <p className="text-xs font-medium text-slate-600">{t("revenueCardMargin", language)}</p>
              <p className={cn("mt-1 text-xl font-bold tabular-nums", marginPositive ? "text-emerald-700" : "text-red-700")}>
                {formatConvertedCurrency(marginValueEur, displayCurrency)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {tReplace("financeMarginPctLabel", language, { pct: Math.round(marginPct * 10) / 10 })}
              </p>
              <p className={cn("mt-2 text-xs font-medium", marginPositive ? "text-emerald-700" : "text-red-700")}>
                {t("revenueCardTapDetail", language)}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setOpen("unpaid")}
              className={cn(
                "text-left rounded-xl border border-rose-100 bg-white p-4 shadow-sm transition hover:border-rose-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              )}
            >
              <p className="text-xs font-medium text-slate-600">{t("revenueCardUnpaid", language)}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {formatConvertedCurrency(data.totalOutstandingEur, displayCurrency)}
              </p>
              <p className="mt-1 text-xs text-slate-500">{t("financeCardOutstandingHint", language)}</p>
              <p className="mt-2 text-xs text-rose-700 font-medium">{t("revenueCardTapDetail", language)}</p>
            </button>
          </>
        )}
      </div>

      <FinanceKpiDetailModals
        data={data}
        open={open}
        onOpenChange={setOpen}
        displayCurrency={displayCurrency}
        detailYear={detailYear}
        onRefetchFinance={refetchFinance}
      />
    </div>
  );
}

export function RevenueFinanceHeader() {
  return (
    <Suspense
      fallback={
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
      }
    >
      <RevenueFinanceHeaderInner />
    </Suspense>
  );
}
