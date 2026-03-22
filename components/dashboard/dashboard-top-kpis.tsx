"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FinanceKpiDetailModals, type FinanceKpiDetailKey } from "@/components/finance/finance-kpi-detail-modals";
import { useAssistant } from "@/context/assistant-context";
import { useLanguage } from "@/context/language-context";
import { t, tReplace } from "@/lib/translations";
import { formatConvertedCurrency, cn, type Currency } from "@/lib/utils";
import type { FinanceAnalytics } from "@/lib/finance-analytics-types";
import { TrendingUp, TrendingDown, Euro, Percent, AlertCircle, AlertTriangle } from "lucide-react";
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

type Props = {
  financeData: FinanceAnalytics;
  financeAnalyticsLoading: boolean;
  selectedYear: number;
  currentYear: number;
  yearCaDisplay: number;
  yearCaPending: boolean;
  displayCurrency: Currency;
  onRefetchFinance: () => void | Promise<void>;
};

export function DashboardTopKpis({
  financeData,
  financeAnalyticsLoading,
  selectedYear,
  currentYear,
  yearCaDisplay,
  yearCaPending,
  displayCurrency,
  onRefetchFinance,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const { setPageContext } = useAssistant();
  const [kpiModal, setKpiModal] = useState<FinanceKpiDetailKey | null>(null);

  useEffect(() => {
    const d = searchParams.get("detail");
    if (d === "month" || d === "year" || d === "margin" || d === "unpaid") {
      setKpiModal(d);
      router.replace("/dashboard", { scroll: false });
    }
  }, [searchParams, router]);

  useEffect(() => {
    setPageContext({
      activeSection: "dashboard",
      dashboardKpis:
        financeAnalyticsLoading || yearCaPending
          ? null
          : {
              caMonthEur: financeData.caMonthEur,
              caPrevMonthEur: financeData.caPrevMonthEur,
              caMonthMomPct: financeData.caMonthMomPct,
              caYearEur: yearCaDisplay,
              caYearLabel: String(selectedYear),
              marginEur: financeData.companyMarginEur,
              marginPct: financeData.companyMarginPct,
              unpaidEur: financeData.totalOutstandingEur,
              unpaidProjectCount: Object.values(financeData.projectBalanceDueEurById).filter((v) => v > 0.005).length,
            },
    });
    return () => setPageContext({});
  }, [
    setPageContext,
    financeAnalyticsLoading,
    yearCaPending,
    financeData,
    yearCaDisplay,
    selectedYear,
  ]);

  const momPct = financeData.caMonthMomPct;
  const momUp = momPct != null && momPct > 0;
  const momDown = momPct != null && momPct < 0;
  const nbOutstandingProjects = Object.values(financeData.projectBalanceDueEurById).filter((v) => v > 0.005).length;
  const currency = displayCurrency;

  const openKpi = (k: FinanceKpiDetailKey) => () => setKpiModal(k);

  return (
    <>
      {!financeAnalyticsLoading && financeData.materialAlerts.length > 0 && (
        <motion.div
          variants={item}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex gap-3 min-w-0">
            <AlertTriangle className="h-6 w-6 shrink-0 text-amber-600" aria-hidden />
            <p className="text-sm font-medium">{t("dashboardMaterialBudgetBanner", language)}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className={cn("shrink-0 border-amber-400 bg-white")}
            onClick={() => setKpiModal("margin")}
          >
            {t("dashboardMaterialBudgetCta", language)}
          </Button>
        </motion.div>
      )}

      <motion.div
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.08 },
          },
        }}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label={language === "fr" ? "Indicateurs financiers" : "Financial KPIs"}
      >
        <motion.div variants={item}>
          <button
            type="button"
            onClick={openKpi("month")}
            className="w-full text-left rounded-xl border-2 border-blue-400/80 bg-blue-50/40 shadow-sm transition-all duration-300 hover:shadow-brand-glow hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-800">{t("caMonth", language)}</CardTitle>
                <Euro className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                {financeAnalyticsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-9 w-36 max-w-full" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-blue-700 tabular-nums tracking-tight">
                      {formatConvertedCurrency(financeData.caMonthEur, currency)}
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-xs flex items-center gap-1",
                        momUp && "text-emerald-600",
                        momDown && "text-rose-600"
                      )}
                    >
                      {momPct != null ? (
                        <>
                          {momUp ? <TrendingUp className="h-3.5 w-3.5" /> : momDown ? <TrendingDown className="h-3.5 w-3.5" /> : null}
                          {tReplace("financeMomPct", language, { pct: Math.round(momPct * 10) / 10 })}
                        </>
                      ) : (
                        <span className="text-slate-400">{t("financeMomNa", language)}</span>
                      )}
                    </p>
                    <p className="text-xs text-blue-700 font-medium mt-2">{t("revenueCardTapDetail", language)}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </button>
        </motion.div>

        <motion.div variants={item}>
          <button
            type="button"
            onClick={openKpi("year")}
            className="w-full text-left rounded-xl border-2 border-blue-400/80 bg-blue-50/30 shadow-sm transition-all duration-300 hover:shadow-brand-glow hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-800">
                  {selectedYear === currentYear ? t("revenueCardYear", language) : t("caYear", language)}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                {yearCaPending ? (
                  <div className="space-y-2">
                    <Skeleton className="h-9 w-36 max-w-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-blue-700 tabular-nums tracking-tight">
                      {formatConvertedCurrency(yearCaDisplay, currency)}
                    </p>
                    <p className="text-xs text-blue-700/80 mt-1">
                      {tReplace("dashboardRevenueDetailYear", language, { year: String(selectedYear) })}
                    </p>
                    <p className="text-xs text-blue-700 font-medium mt-2">{t("revenueCardTapDetail", language)}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </button>
        </motion.div>

        <motion.div variants={item}>
          <button
            type="button"
            onClick={openKpi("margin")}
            className="w-full text-left rounded-xl border-2 border-emerald-400/80 bg-emerald-50/40 shadow-sm transition-all duration-300 hover:shadow-brand-glow hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-800">{t("revenueCardMargin", language)}</CardTitle>
                <Percent className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                {financeAnalyticsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-9 w-36 max-w-full" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-emerald-700 tabular-nums tracking-tight">
                      {formatConvertedCurrency(financeData.companyMarginEur, currency)}
                    </p>
                    <p className="text-xs text-emerald-800/90 mt-1">
                      {tReplace("financeMarginPctLabel", language, { pct: Math.round(financeData.companyMarginPct * 10) / 10 })}
                    </p>
                    <p className="text-xs text-emerald-800 font-medium mt-2">{t("revenueCardTapDetail", language)}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </button>
        </motion.div>

        <motion.div variants={item}>
          <button
            type="button"
            onClick={openKpi("unpaid")}
            className="w-full text-left rounded-xl border-2 border-red-400/90 bg-red-50/60 shadow-sm transition-all duration-300 hover:shadow-brand-glow hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-800">{t("revenueCardUnpaid", language)}</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                {financeAnalyticsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-9 w-36 max-w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-bold text-red-700 tabular-nums tracking-tight">
                      {formatConvertedCurrency(financeData.totalOutstandingEur, currency)}
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      {tReplace("dashboardOutstandingCount", language, { n: String(nbOutstandingProjects) })}
                    </p>
                    <p className="text-xs text-red-800 font-medium mt-2">{t("revenueCardTapDetail", language)}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </button>
        </motion.div>
      </motion.div>

      <FinanceKpiDetailModals
        data={financeData}
        open={kpiModal}
        onOpenChange={setKpiModal}
        displayCurrency={displayCurrency}
        detailYear={selectedYear}
        onRefetchFinance={onRefetchFinance}
      />
    </>
  );
}
