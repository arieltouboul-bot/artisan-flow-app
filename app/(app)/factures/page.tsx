"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLanguage } from "@/context/language-context";
import { useAllExpenses } from "@/hooks/use-all-expenses";
import { useProjects } from "@/hooks/use-projects";
import { t } from "@/lib/translations";
import { formatDate, formatConvertedCurrency, cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import {
  FileText,
  Loader2,
  Download,
  ImageIcon,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Currency } from "@/lib/utils";
import { generateFacturesPDF } from "@/lib/factures-pdf";
import { createClient } from "@/lib/supabase/client";

export default function FacturesPage() {
  const { language } = useLanguage();
  const { displayCurrency, profile } = useProfile();
  const currency = displayCurrency;
  const { expenses, loading, refetch, updateExpense } = useAllExpenses();
  const { projects } = useProjects();

  const [filterProjectId, setFilterProjectId] = useState<string>("");
  const [filterCurrency, setFilterCurrency] = useState<string>("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmountHt, setEditAmountHt] = useState("");
  const [editTvaRate, setEditTvaRate] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const filtered = useMemo(() => {
    let list = expenses;
    if (filterProjectId) list = list.filter((e) => e.project_id === filterProjectId);
    if (filterCurrency) list = list.filter(() => true);
    return list;
  }, [expenses, filterProjectId, filterCurrency]);

  const openEdit = (id: string) => {
    const ex = expenses.find((e) => e.id === id);
    if (!ex) return;
    setEditId(id);
    setEditDescription(ex.description);
    setEditAmountHt(String(ex.amount_ht));
    setEditTvaRate(String(ex.tva_rate));
    setEditDate(ex.date);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setEditError(null);
    const amountHt = parseFloat(editAmountHt.replace(",", "."));
    const tvaRate = parseFloat(editTvaRate.replace(",", "."));
    if (Number.isNaN(amountHt) || amountHt < 0) {
      setEditError(t("invalidAmountHt", language));
      return;
    }
    setEditSaving(true);
    const { error } = await updateExpense(editId, {
      description: editDescription.trim(),
      amount_ht: amountHt,
      tva_rate: Number.isNaN(tvaRate) ? 20 : tvaRate,
      date: editDate,
    });
    setEditSaving(false);
    if (error) {
      console.error("Factures updateExpense failed:", error);
      setEditError(error);
      return;
    }
    setEditId(null);
  };

  const handleExportCSV = () => {
    const headerRow = [
      t("invoiceDateCol", language),
      t("invoiceVendorCol", language),
      t("invoiceProjectCol", language),
      t("invoiceAmountHtCol", language),
      t("invoiceTvaCol", language),
      t("invoiceAmountTtcCol", language),
    ];
    const rows: string[][] = [headerRow];
    for (const e of filtered) {
      const tvaAmount = e.amount_ht * (e.tva_rate / 100);
      const ttc = e.amount_ht + tvaAmount;
      const vendor = (e.description.split(" — ")[0] || e.description).replace(/;/g, ",").replace(/\r?\n/g, " ");
      rows.push([
        e.date,
        vendor,
        e.project_name ?? "",
        String(e.amount_ht),
        String(tvaAmount.toFixed(2)),
        String(ttc.toFixed(2)),
      ]);
    }
    const csvContent = "\uFEFF" + rows.map((r) => r.join(";")).join("\n");
    window.location.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
  };

  const handleExportPDF = async () => {
    if (filtered.length === 0) return;
    alert("Génération PDF...");
    setPdfLoading(true);
    try {
      const rows = filtered.map((e) => {
        const tvaAmount = e.amount_ht * (e.tva_rate / 100);
        const ttc = e.amount_ht + tvaAmount;
        const vendor = (e.description.split(" — ")[0] || e.description).trim();
        return {
          date: e.date,
          vendor,
          projectName: e.project_name ?? "",
          amountHt: e.amount_ht,
          tvaAmount,
          ttc,
        };
      });
      const headers = {
        date: t("invoiceDateCol", language),
        vendor: t("invoiceVendorCol", language),
        project: t("invoiceProjectCol", language),
        amountHt: t("invoiceAmountHtCol", language),
        tva: t("invoiceTvaCol", language),
        amountTtc: t("invoiceAmountTtcCol", language),
      };
      const blob = await generateFacturesPDF({
        rows,
        headers,
        companyName: profile?.company_name ?? null,
        logoUrl: profile?.logo_url ?? null,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `factures_comptable_${new Date().toISOString().slice(0, 10)}.pdf`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className={cn("text-2xl font-bold tracking-tight text-gray-900 md:text-3xl")}>
          {t("invoices", language)}
        </h1>
        <p className={cn("mt-1 text-gray-500")}>{t("invoicesSubtitle", language)}</p>
      </div>

      <Card className={cn("overflow-hidden transition-shadow hover:shadow-brand-glow")}>
        <CardHeader className={cn("flex flex-row flex-wrap items-center justify-between gap-4")}>
          <CardTitle className={cn("flex items-center gap-2")}>
            <FileText className="h-5 w-5 text-brand-blue-500" />
            {t("invoices", language)}
          </CardTitle>
          <div className={cn("flex flex-wrap items-center gap-2")}>
            <select
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className={cn("min-h-[44px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm")}
              aria-label={t("filterByProject", language)}
            >
              <option value="">{t("allProjectsFilter", language)}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select
              value={filterCurrency}
              onChange={(e) => setFilterCurrency(e.target.value)}
              className={cn("min-h-[44px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm")}
              aria-label={t("filterByCurrency", language)}
            >
              <option value="">{t("allCurrenciesFilter", language)}</option>
              {(["EUR", "USD", "GBP", "ILS"] as Currency[]).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button type="button" onClick={handleExportCSV} style={{ zIndex: 9999 }} className="cursor-pointer bg-blue-600 text-white p-2 rounded min-h-[44px] disabled:opacity-50" disabled={filtered.length === 0}>
              {t("exportCSV", language)}
            </button>
            <button type="button" onClick={handleExportPDF} style={{ zIndex: 9999 }} className="cursor-pointer bg-blue-600 text-white p-2 rounded min-h-[44px] disabled:opacity-50" disabled={filtered.length === 0 || pdfLoading}>
              {pdfLoading ? "…" : t("exportPDFForAccountant", language)}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className={cn("flex items-center gap-2 py-12 text-gray-500")}>
              <Loader2 className="h-8 w-8 animate-spin" />
              <span>{t("loading", language)}</span>
            </div>
          ) : filtered.length === 0 ? (
            <p className={cn("py-12 text-center text-gray-500")}>{t("noInvoices", language)}</p>
          ) : (
            <div className={cn("overflow-x-auto")}>
              <table className={cn("w-full text-sm")}>
                <thead>
                  <tr className={cn("border-b border-gray-200 text-left text-gray-500")}>
                    <th className={cn("pb-2 pr-2")}>{t("invoiceDateCol", language)}</th>
                    <th className={cn("pb-2 pr-2")}>{t("invoiceVendorCol", language)}</th>
                    <th className={cn("pb-2 pr-2")}>{t("invoiceProjectCol", language)}</th>
                    <th className={cn("pb-2 pr-2")}>{t("invoiceAmountHtCol", language)}</th>
                    <th className={cn("pb-2 pr-2")}>{t("invoiceTvaCol", language)}</th>
                    <th className={cn("pb-2 pr-2")}>{t("invoiceAmountTtcCol", language)}</th>
                    <th className={cn("w-24 pb-2")} aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => {
                    const tvaAmount = e.amount_ht * (e.tva_rate / 100);
                    const ttc = e.amount_ht + tvaAmount;
                    const vendor = e.description.split(" — ")[0] || e.description;
                    return (
                      <tr key={e.id} className={cn("border-b border-gray-100")}>
                        <td className={cn("py-3 pr-2")}>{formatDate(e.date)}</td>
                        <td className={cn("py-3 pr-2 font-medium")}>{vendor}</td>
                        <td className={cn("py-3 pr-2 text-gray-600")}>{e.project_name ?? "—"}</td>
                        <td className={cn("py-3 pr-2")}>{formatConvertedCurrency(e.amount_ht, currency)}</td>
                        <td className={cn("py-3 pr-2")}>{formatConvertedCurrency(tvaAmount, currency)}</td>
                        <td className={cn("py-3 pr-2 font-medium")}>{formatConvertedCurrency(ttc, currency)}</td>
                        <td className={cn("py-3 flex gap-1")}>
                          <button
                            type="button"
                            className="z-50 p-2 bg-blue-600 text-white rounded cursor-pointer text-sm"
                            onClick={() => openEdit(e.id)}
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            style={{ zIndex: 9999 }}
                            className="p-2 bg-red-600 text-white rounded cursor-pointer text-sm"
                            onClick={async () => {
                              if (!confirm("Supprimer?")) return;
                              const supabase = createClient();
                              if (!supabase) return;
                              const { data: { user } } = await supabase.auth.getUser();
                              if (!user) return;
                              const { error } = await supabase.from("expenses").delete().eq("id", e.id).eq("user_id", user.id);
                              if (error) alert("Erreur: " + error.message);
                              else location.reload();
                            }}
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent className={cn("max-w-md")}>
          <DialogHeader>
            <DialogTitle>{t("editAmounts", language)}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className={cn("space-y-4")}>
            <div>
              <label className={cn("text-sm font-medium text-gray-700 mb-1 block")}>{t("invoiceVendorCol", language)}</label>
              <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className={cn("min-h-[44px]")} />
            </div>
            <div className={cn("grid grid-cols-2 gap-4")}>
              <div>
                <label className={cn("text-sm font-medium text-gray-700 mb-1 block")}>{t("invoiceAmountHtCol", language)}</label>
                <Input type="number" step="0.01" min="0" value={editAmountHt} onChange={(e) => setEditAmountHt(e.target.value)} className={cn("min-h-[44px]")} required />
              </div>
              <div>
                <label className={cn("text-sm font-medium text-gray-700 mb-1 block")}>{t("invoiceTvaCol", language)} %</label>
                <Input type="number" min="0" max="100" step="0.1" value={editTvaRate} onChange={(e) => setEditTvaRate(e.target.value)} className={cn("min-h-[44px]")} />
              </div>
            </div>
            <div>
              <label className={cn("text-sm font-medium text-gray-700 mb-1 block")}>{t("invoiceDateCol", language)}</label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className={cn("min-h-[44px]")} required />
            </div>
            {editError && <p className={cn("text-sm text-red-600")}>{editError}</p>}
            <DialogFooter className={cn("gap-2")}>
              <Button type="button" variant="outline" onClick={() => setEditId(null)} disabled={editSaving}>{t("cancel", language)}</Button>
              <Button type="submit" disabled={editSaving}>{editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("saveChanges", language)}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
