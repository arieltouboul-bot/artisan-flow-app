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
import {
  updateCashFlowLineAmountEur,
  updateProjectContractBudgetEur,
  updateProjectMarginByTargetMarginEur,
} from "@/lib/finance-kpi-modal-mutations";
import { InlineEditableAmountEur } from "@/components/finance/inline-editable-amount";

export type FinanceKpiDetailKey = "month" | "year" | "margin" | "unpaid";

type Props = {
  data: FinanceAnalytics;
  open: FinanceKpiDetailKey | null;
  onOpenChange: (open: FinanceKpiDetailKey | null) => void;
  displayCurrency: Currency;
  detailYear: number;
  onRefetchFinance?: () => void | Promise<void>;
};

export function FinanceKpiDetailModals({
  data,
  open,
  onOpenChange,
  displayCurrency,
  detailYear,
  onRefetchFinance,
}: Props) {
  const { language } = useLanguage();
  const dateLocale = language === "fr" ? fr : enUS;
  const currentCalendarYear = new Date().getFullYear();
  const canEdit = Boolean(onRefetchFinance);

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

  const refetch = async () => {
    await onRefetchFinance?.();
  };

  const saveErr = () => alert(t("financeEditSaveError", language));

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
              <li key={l.id} className="py-2 flex flex-wrap justify-between gap-2 items-center">
                <span className="text-slate-600">{l.date}</span>
                <span className="font-medium flex-1 min-w-0">{l.projectName}</span>
                {canEdit ? (
                  <InlineEditableAmountEur
                    amountEur={l.amountEur}
                    displayCurrency={displayCurrency}
                    className="text-emerald-700 shrink-0"
                    aria-label={t("financeEditAmountAria", language)}
                    onCommit={async (newEur) => {
                      const { error } = await updateCashFlowLineAmountEur(l, newEur);
                      if (error) saveErr();
                      else await refetch();
                    }}
                  />
                ) : (
                  <span className="tabular-nums text-emerald-700 shrink-0">
                    {formatConvertedCurrency(l.amountEur, displayCurrency)}
                  </span>
                )}
              </li>
            ))}
            {linesMonth.length === 0 && <li className="text-slate-500 py-2">{t("revenueModalEmptyPeriod", language)}</li>}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "year"} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-lg sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {detailYear !== currentCalendarYear
                ? tReplace("revenueModalYearTitleWithYear", language, { year: String(detailYear) })
                : t("revenueModalYearTitle", language)}
            </DialogTitle>
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
              <li key={l.id} className="py-2 flex flex-wrap justify-between gap-2 items-center">
                <span className="text-slate-600">{l.date}</span>
                <span className="font-medium flex-1 min-w-0">{l.projectName}</span>
                <span className="text-xs text-slate-500 w-full sm:w-auto">{l.kind === "transaction" ? t("revenueKindTx", language) : t("revenueKindRow", language)}</span>
                {canEdit ? (
                  <InlineEditableAmountEur
                    amountEur={l.amountEur}
                    displayCurrency={displayCurrency}
                    className="text-emerald-700 w-full sm:w-auto text-right"
                    aria-label={t("financeEditAmountAria", language)}
                    onCommit={async (newEur) => {
                      const { error } = await updateCashFlowLineAmountEur(l, newEur);
                      if (error) saveErr();
                      else await refetch();
                    }}
                  />
                ) : (
                  <span className="tabular-nums text-emerald-700 w-full sm:w-auto text-right">
                    {formatConvertedCurrency(l.amountEur, displayCurrency)}
                  </span>
                )}
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
            <div className="flex justify-between gap-2">
              <span>{t("revenueModalTotalEarned", language)}</span>
              <span className="font-semibold tabular-nums">{formatConvertedCurrency(data.companyTotalRevenueEur, displayCurrency)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span>{t("revenueModalTotalExpenses", language)}</span>
              <span className="font-semibold tabular-nums text-rose-700">
                − {formatConvertedCurrency(data.companyTotalExpensesEur, displayCurrency)}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 font-bold gap-2">
              <span>{t("revenueModalNetProfit", language)}</span>
              <span className="tabular-nums text-emerald-700">{formatConvertedCurrency(data.companyMarginEur, displayCurrency)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">{t("revenueModalMarginFormula", language)}</p>
          <h4 className="text-sm font-semibold text-slate-800">{t("revenueModalTopProjects", language)}</h4>
          <ul className="max-h-[200px] overflow-y-auto divide-y divide-slate-100 text-sm">
            {data.projectMargins.slice(0, 15).map((row) => (
              <li key={row.projectId} className="py-2 flex justify-between gap-2 items-center">
                <Link href={`/projets/${row.projectId}`} className="text-indigo-600 hover:underline font-medium truncate min-w-0">
                  {row.projectName}
                </Link>
                {canEdit ? (
                  <InlineEditableAmountEur
                    amountEur={row.marginEur}
                    displayCurrency={displayCurrency}
                    className="text-emerald-700 shrink-0"
                    aria-label={t("financeEditAmountAria", language)}
                    onCommit={async (newEur) => {
                      const { error } = await updateProjectMarginByTargetMarginEur(row, newEur);
                      if (error === "NEGATIVE_MATERIAL") alert(t("financeEditMarginInvalid", language));
                      else if (error) saveErr();
                      else await refetch();
                    }}
                  />
                ) : (
                  <span className="tabular-nums text-emerald-700 shrink-0">
                    {formatConvertedCurrency(row.marginEur, displayCurrency)}
                  </span>
                )}
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
                        <div className="flex flex-col gap-1 mt-1 sm:flex-row sm:flex-wrap sm:justify-between sm:items-center">
                          <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span>{t("contractAmount", language)}:</span>
                            {canEdit ? (
                              <InlineEditableAmountEur
                                amountEur={r.budgetEur}
                                displayCurrency={displayCurrency}
                                className="text-slate-800"
                                aria-label={t("financeEditAmountAria", language)}
                                onCommit={async (newEur) => {
                                  const { error } = await updateProjectContractBudgetEur(r.projectId, newEur);
                                  if (error) saveErr();
                                  else await refetch();
                                }}
                              />
                            ) : (
                              <span className="font-medium tabular-nums">{formatConvertedCurrency(r.budgetEur, displayCurrency)}</span>
                            )}
                            <span className="text-slate-400">·</span>
                            <span>
                              {t("revenueModalTotalEarned", language)}: {formatConvertedCurrency(r.paidEur, displayCurrency)}
                            </span>
                          </div>
                          <span className="font-semibold text-rose-700 tabular-nums sm:ml-auto">
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
