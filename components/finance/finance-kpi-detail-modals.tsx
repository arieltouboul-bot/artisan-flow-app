"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/context/language-context";
import { t, tReplace } from "@/lib/translations";
import type { FinanceAnalytics } from "@/lib/finance-analytics-types";
import { formatConvertedCurrency, type Currency } from "@/lib/utils";
import {
  cumulativeByDay,
  inCalendarYear,
  inCurrentMonth,
  monthlyCaFromCashFlowLines,
} from "@/lib/finance-kpi-modal-helpers";

export type FinanceKpiDetailKey = "month" | "year" | "margin" | "unpaid";

type Props = {
  data: FinanceAnalytics;
  open: FinanceKpiDetailKey | null;
  onOpenChange: (open: FinanceKpiDetailKey | null) => void;
  displayCurrency: Currency;
  /** Année civile pour le détail « CA année » (graph + lignes). */
  detailYear: number;
};

export function FinanceKpiDetailModals({ data, open, onOpenChange, displayCurrency, detailYear }: Props) {
  const { language } = useLanguage();
  const dateLocale = language === "fr" ? fr : enUS;
  const currentCalendarYear = new Date().getFullYear();

  const linesMonth = useMemo(
    () => data.cashFlowLines.filter((l) => inCurrentMonth(l.date)),
    [data.cashFlowLines]
  );

  const linesYear = useMemo(
    () => data.cashFlowLines.filter((l) => inCalendarYear(l.date, detailYear)),
    [data.cashFlowLines, detailYear]
  );

  const cumMonth = useMemo(() => cumulativeByDay(linesMonth), [linesMonth]);

  const yearBarData = useMemo(() => {
    if (detailYear === currentCalendarYear) {
      return data.ytdByMonth;
    }
    return monthlyCaFromCashFlowLines(data.cashFlowLines, detailYear, (mi) =>
      format(new Date(detailYear, mi, 1), "MMM", { locale: dateLocale })
    );
  }, [data.ytdByMonth, data.cashFlowLines, detailYear, currentCalendarYear, dateLocale]);

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

  const setOpen = (v: FinanceKpiDetailKey | null) => onOpenChange(v);

  return (
    <>
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
                <Line type="monotone" dataKey="cum" stroke="#2563eb" strokeWidth={2} dot={false} name={t("revenueModalCum", language)} />
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
          {detailYear !== currentCalendarYear && (
            <p className="text-xs text-slate-500">{tReplace("dashboardKpiYearModalNote", language, { year: String(detailYear) })}</p>
          )}
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearBarData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v: number) => [formatConvertedCurrency(Number(v), displayCurrency), t("financeTooltipCa", language)]}
                />
                <Bar dataKey="caEur" fill="#2563eb" radius={[4, 4, 0, 0]} name={t("financeTooltipCa", language)} />
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
          <p className="text-sm font-semibold text-slate-800 rounded-md bg-emerald-50 border border-emerald-100 px-3 py-2">
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
              <span className="tabular-nums text-emerald-700">{formatConvertedCurrency(data.companyMarginEur, displayCurrency)}</span>
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
                <span className="tabular-nums text-emerald-700 shrink-0">
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
    </>
  );
}
