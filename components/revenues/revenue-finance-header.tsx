"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/context/language-context";
import { useProfile } from "@/hooks/use-profile";
import { useFinanceAnalytics } from "@/hooks/use-finance-analytics";
import { t, tReplace } from "@/lib/translations";
import { formatConvertedCurrency } from "@/lib/utils";
import { generateFinanceSummaryPDF } from "@/lib/finance-summary-pdf";
import { pdfLocaleFromAppLanguage } from "@/lib/finance-pdf-labels";
import { cn } from "@/lib/utils";
import type { CashFlowLine } from "@/lib/finance-analytics-types";
import { AlertTriangle, Download, TrendingDown, TrendingUp } from "lucide-react";

type DetailKey = "month" | "year" | "margin" | "unpaid";

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

function inCurrentMonth(dateStr: string): boolean {
  const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function inCurrentYear(dateStr: string): boolean {
  const d = new Date(dateStr.includes("T") ? dateStr : `${dateStr}T12:00:00`);
  return d.getFullYear() === new Date().getFullYear();
}

function cumulativeByDay(lines: CashFlowLine[]): { day: string; cum: number }[] {
  const byDay = new Map<string, number>();
  for (const l of lines) {
    const day = l.date.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + l.amountEur);
  }
  const sorted = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  let cum = 0;
  return sorted.map(([day, v]) => {
    cum += v;
    return { day, cum };
  });
}

function RevenueFinanceHeaderInner() {
  const { language } = useLanguage();
  const { profile, displayCurrency } = useProfile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data, loading, error, refetch } = useFinanceAnalytics();
  const [open, setOpen] = useState<DetailKey | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    const d = searchParams.get("detail");
    if (d === "month" || d === "year" || d === "margin" || d === "unpaid") {
      setOpen(d);
      router.replace("/revenus", { scroll: false });
    }
  }, [searchParams, router]);

  const linesMonth = useMemo(
    () => data.cashFlowLines.filter((l) => inCurrentMonth(l.date)),
    [data.cashFlowLines]
  );
  const linesYear = useMemo(
    () => data.cashFlowLines.filter((l) => inCurrentYear(l.date)),
    [data.cashFlowLines]
  );
  const cumMonth = useMemo(() => cumulativeByDay(linesMonth), [linesMonth]);

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
              className="text-left rounded-xl border border-emerald-100 bg-white p-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
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
              className="text-left rounded-xl border border-violet-100 bg-white p-4 shadow-sm transition hover:border-violet-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <p className="text-xs font-medium text-slate-600">{t("revenueCardMargin", language)}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-slate-900">
                {formatConvertedCurrency(data.companyMarginEur, displayCurrency)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {tReplace("financeMarginPctLabel", language, { pct: Math.round(data.companyMarginPct * 10) / 10 })}
              </p>
              <p className="mt-2 text-xs text-violet-700 font-medium">{t("revenueCardTapDetail", language)}</p>
            </button>

            <button
              type="button"
              onClick={() => setOpen("unpaid")}
              className="text-left rounded-xl border border-rose-100 bg-white p-4 shadow-sm transition hover:border-rose-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
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

      <Dialog open={open === "month"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("revenueModalMonthTitle", language)}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">{t("revenueModalMonthSubtitle", language)}</p>
          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cumMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number) => [formatConvertedCurrency(Number(v), displayCurrency), t("revenueModalCum", language)]}
                />
                <Line type="monotone" dataKey="cum" stroke="#6366f1" strokeWidth={2} dot={false} name={t("revenueModalCum", language)} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <ul className="max-h-[220px] overflow-y-auto divide-y divide-slate-100 text-sm">
            {linesMonth.map((l) => (
              <li key={l.id} className="py-2 flex justify-between gap-2">
                <span className="text-slate-600">{l.date}</span>
                <span className="font-medium">{l.projectName}</span>
                <span className="tabular-nums text-emerald-700">{formatConvertedCurrency(l.amountEur, displayCurrency)}</span>
              </li>
            ))}
            {linesMonth.length === 0 && <li className="text-slate-500 py-2">{t("revenueModalEmptyPeriod", language)}</li>}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "year"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("revenueModalYearTitle", language)}</DialogTitle>
          </DialogHeader>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.ytdByMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number) => [formatConvertedCurrency(Number(v), displayCurrency), t("financeTooltipCa", language)]}
                />
                <Bar dataKey="caEur" fill="#10b981" radius={[4, 4, 0, 0]} name={t("financeTooltipCa", language)} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="max-h-[240px] overflow-y-auto divide-y divide-slate-100 text-sm">
            {linesYear.map((l) => (
              <li key={l.id} className="py-2 flex justify-between gap-2 flex-wrap">
                <span className="text-slate-600">{l.date}</span>
                <span className="font-medium">{l.projectName}</span>
                <span className="text-xs text-slate-500">{l.kind === "transaction" ? t("revenueKindTx", language) : t("revenueKindRow", language)}</span>
                <span className="tabular-nums text-emerald-700 w-full sm:w-auto text-right">
                  {formatConvertedCurrency(l.amountEur, displayCurrency)}
                </span>
              </li>
            ))}
            {linesYear.length === 0 && <li className="text-slate-500 py-2">{t("revenueModalEmptyPeriod", language)}</li>}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "margin"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("revenueModalMarginTitle", language)}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">{t("revenueModalMarginHint", language)}</p>
          <p className="text-sm font-semibold text-slate-800 rounded-md bg-violet-50 border border-violet-100 px-3 py-2">
            {t("revenueModalMarginEquation", language)}
          </p>
          <div className="rounded-lg bg-slate-50 p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>{t("revenueModalTotalEarned", language)}</span>
              <span className="font-semibold tabular-nums">{formatConvertedCurrency(data.companyTotalRevenueEur, displayCurrency)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("revenueModalTotalExpenses", language)}</span>
              <span className="font-semibold tabular-nums text-rose-700">
                − {formatConvertedCurrency(data.companyTotalExpensesEur, displayCurrency)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
              <span>{t("revenueModalNetProfit", language)}</span>
              <span className="tabular-nums text-violet-700">{formatConvertedCurrency(data.companyMarginEur, displayCurrency)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">{t("revenueModalMarginFormula", language)}</p>
          <h4 className="text-sm font-semibold text-slate-800">{t("revenueModalTopProjects", language)}</h4>
          <ul className="max-h-[200px] overflow-y-auto divide-y divide-slate-100 text-sm">
            {data.projectMargins.slice(0, 15).map((row) => (
              <li key={row.projectId} className="py-2 flex justify-between gap-2">
                <Link href={`/projets/${row.projectId}`} className="text-indigo-600 hover:underline font-medium truncate">
                  {row.projectName}
                </Link>
                <span className="tabular-nums text-violet-700 shrink-0">
                  {formatConvertedCurrency(row.marginEur, displayCurrency)}
                </span>
              </li>
            ))}
            {data.projectMargins.length === 0 && <li className="text-slate-500">{t("financeNoProjects", language)}</li>}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "unpaid"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t("financeOutstandingTitle", language)}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">{t("financeOutstandingHint", language)}</p>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {outstandingGrouped.length === 0 ? (
              <p className="text-sm text-slate-500">{t("financeNoOutstanding", language)}</p>
            ) : (
              outstandingGrouped.map(([client, rows]) => (
                <div key={client}>
                  <h4 className="text-sm font-semibold border-b border-slate-200 pb-1 mb-2">{client}</h4>
                  <ul className="space-y-2">
                    {rows.map((r) => (
                      <li key={r.projectId} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <Link href={`/projets/${r.projectId}`} className="font-medium text-indigo-700 hover:underline">
                          {r.projectName}
                        </Link>
                        <div className="flex justify-between mt-1">
                          <span className="text-xs text-slate-500">
                            {tReplace("financeOutstandingRowMeta", language, {
                              budget: formatConvertedCurrency(r.budgetEur, displayCurrency),
                              paid: formatConvertedCurrency(r.paidEur, displayCurrency),
                            })}
                          </span>
                          <span className="font-semibold text-rose-700 tabular-nums">
                            {formatConvertedCurrency(r.balanceEur, displayCurrency)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
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
