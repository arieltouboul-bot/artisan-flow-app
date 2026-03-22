"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/context/language-context";
import { useProfile } from "@/hooks/use-profile";
import { useFinanceAnalytics } from "@/hooks/use-finance-analytics";
import { t, tReplace } from "@/lib/translations";
import { formatConvertedCurrency } from "@/lib/utils";
import { generateFinanceSummaryPDF } from "@/lib/finance-summary-pdf";
import { AlertTriangle, Download, PieChart, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function FinancePage() {
  const { language } = useLanguage();
  const { profile, displayCurrency } = useProfile();
  const { data, loading, error, refetch } = useFinanceAnalytics();
  const [pdfBusy, setPdfBusy] = useState(false);

  const outstandingGrouped = useMemo(() => {
    const rows = data.outstandingRows;
    const map = new Map<string, typeof rows>();
    for (const r of rows) {
      const list = map.get(r.clientName) ?? [];
      list.push(r);
      map.set(r.clientName, list);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const sum = (list: typeof rows) => list.reduce((s, x) => s + x.balanceEur, 0);
      return sum(b[1]) - sum(a[1]);
    });
  }, [data.outstandingRows]);

  const exportPdf = async () => {
    setPdfBusy(true);
    try {
      const blob = await generateFinanceSummaryPDF({
        companyName: profile?.company_name ?? null,
        data,
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

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl flex items-center gap-2">
            <PieChart className="h-8 w-8 text-indigo-600" />
            {t("finance", language)}
          </h1>
          <p className="mt-1 text-gray-500">{t("financePageSubtitle", language)}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 gap-2"
          disabled={loading || pdfBusy}
          onClick={() => void exportPdf()}
        >
          <Download className="h-4 w-4" />
          {pdfBusy ? t("financeExporting", language) : t("financeExportPdf", language)}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => refetch()}>
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <Card className="border-indigo-50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{t("financeCardCaMonth", language)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {formatConvertedCurrency(data.caMonthEur, displayCurrency)}
                </p>
                <p
                  className={cn(
                    "mt-1 text-xs flex items-center gap-1",
                    momUp && "text-emerald-600",
                    momDown && "text-rose-600",
                    mom != null && !momUp && !momDown && "text-slate-500"
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
              </CardContent>
            </Card>
            <Card className="border-emerald-50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{t("financeCardCaYtd", language)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {formatConvertedCurrency(data.caYtdEur, displayCurrency)}
                </p>
                <p className="mt-1 text-xs text-slate-500">{t("financeCardCaYtdHint", language)}</p>
              </CardContent>
            </Card>
            <Card className="border-violet-50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{t("financeCardMargin", language)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {formatConvertedCurrency(data.companyMarginEur, displayCurrency)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {tReplace("financeMarginPctLabel", language, { pct: Math.round(data.companyMarginPct * 10) / 10 })}
                </p>
              </CardContent>
            </Card>
            <Card className="border-rose-50 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{t("financeCardOutstanding", language)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums text-slate-900">
                  {formatConvertedCurrency(data.totalOutstandingEur, displayCurrency)}
                </p>
                <p className="mt-1 text-xs text-slate-500">{t("financeCardOutstandingHint", language)}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("financeYtdChartTitle", language)}</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <Skeleton className="h-full w-full rounded-lg" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.ytdByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}`} />
                  <Tooltip
                    formatter={(value: number) => [formatConvertedCurrency(Number(value), displayCurrency), t("financeTooltipCa", language)]}
                  />
                  <Bar dataKey="caEur" fill="#6366f1" radius={[4, 4, 0, 0]} name={t("financeTooltipCa", language)} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">{t("financeMarginsByProjectTitle", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : data.projectMargins.length === 0 ? (
              <p className="text-sm text-slate-500">{t("financeNoProjects", language)}</p>
            ) : (
              <ul className="max-h-[280px] overflow-y-auto divide-y divide-slate-100 text-sm">
                {data.projectMargins.map((row) => (
                  <li key={row.projectId} className="py-2 flex flex-col gap-0.5">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-slate-900">{row.projectName}</span>
                      <span className="tabular-nums text-violet-700 font-semibold">
                        {formatConvertedCurrency(row.marginEur, displayCurrency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>{row.clientName}</span>
                      <span>{tReplace("financeMarginPctShort", language, { pct: Math.round(row.marginPct * 10) / 10 })}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t("financeOutstandingTitle", language)}</CardTitle>
          <p className="text-sm text-slate-500">{t("financeOutstandingHint", language)}</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : outstandingGrouped.length === 0 ? (
            <p className="text-sm text-slate-500">{t("financeNoOutstanding", language)}</p>
          ) : (
            <div className="space-y-6">
              {outstandingGrouped.map(([client, rows]) => (
                <div key={client}>
                  <h3 className="text-sm font-semibold text-slate-800 border-b border-slate-200 pb-1 mb-2">{client}</h3>
                  <ul className="space-y-2">
                    {rows.map((r) => (
                      <li
                        key={r.projectId}
                        className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                      >
                        <Link href={`/projets/${r.projectId}`} className="font-medium text-indigo-700 hover:underline">
                          {r.projectName}
                        </Link>
                        <span className="tabular-nums font-semibold text-rose-700">
                          {formatConvertedCurrency(r.balanceEur, displayCurrency)}
                        </span>
                        <span className="w-full text-xs text-slate-500">
                          {tReplace("financeOutstandingRowMeta", language, {
                            budget: formatConvertedCurrency(r.budgetEur, displayCurrency),
                            paid: formatConvertedCurrency(r.paidEur, displayCurrency),
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
