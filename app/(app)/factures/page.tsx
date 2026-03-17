"use client";

import { useState, useMemo, useRef } from "react";
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
import { FileText, Loader2 } from "lucide-react";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import type { Currency } from "@/lib/utils";
import { generateFacturesPDF } from "@/lib/factures-pdf";
import { createClient } from "@/lib/supabase/client";

const INVOICE_BUCKET = "factures";

export default function FacturesPage() {
  const { language } = useLanguage();
  const { displayCurrency, profile } = useProfile();
  const currency = displayCurrency;
  const { expenses, loading, refetch, updateExpense } = useAllExpenses();
  type ExpenseRow = typeof expenses[number];
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [addPhotoOpen, setAddPhotoOpen] = useState(false);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [formDate, setFormDate] = useState("");
  const [formVendor, setFormVendor] = useState("");
  const [formTtc, setFormTtc] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fullscreenImageUrl, setFullscreenImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => {
    let list = expenses;
    if (filterProjectId) list = list.filter((e) => e.project_id === filterProjectId);
    if (filterCurrency) list = list.filter(() => true);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
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
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `factures_${new Date().toISOString().slice(0, 10)}.csv`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (filtered.length === 0) {
      alert("Aucune donnée à exporter");
      return;
    }
    setPdfLoading(true);
    try {
      const rows = filtered.map((e) => {
        let amountHt = Number(e.amount_ht) || 0;
        let tvaAmount = amountHt * (Number(e.tva_rate) || 20) / 100;
        let ttc = amountHt + tvaAmount;
        const amountTtcFromDb = Number((e as ExpenseRow).amount_ttc);
        if (amountHt <= 0 && amountTtcFromDb > 0) {
          ttc = amountTtcFromDb;
          amountHt = Math.round((ttc / 1.2) * 100) / 100;
          tvaAmount = Math.round((ttc - amountHt) * 100) / 100;
        }
        const vendor = (e.description.split(" — ")[0] || e.description).trim();
        return {
          date: e.date,
          vendor,
          amountHt,
          tvaAmount,
          ttc,
          image_url: (e as ExpenseRow).image_url ?? null,
        };
      });
      console.log("Données envoyées au PDF:", rows);
      const headers = {
        date: t("invoiceDateCol", language),
        vendor: t("invoiceVendorCol", language),
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
    } catch (err) {
      console.error("Export PDF error", err);
      const msg = err instanceof Error ? err.message : String(err);
      alert("Erreur PDF : " + msg);
    } finally {
      setPdfLoading(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  const handleImportExpense = async (e: React.ChangeEvent<HTMLInputElement>) => {
    alert("Début de l'import");
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Veuillez sélectionner une image (photo de facture).");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      console.error("Factures import error: Supabase client indisponible");
      alert("Connexion à la base de données indisponible (Supabase).");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user ?? null;
    if (!user) {
      console.error("Factures import error: utilisateur non connecté");
      alert("Utilisateur non connecté.");
      return;
    }

    setImporting(true);
    const path = `${user.id}/invoices/${crypto.randomUUID()}.jpg`;
    const { error: uploadErr } = await supabase.storage.from(INVOICE_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
    setImporting(false);
    if (uploadErr) {
      console.error("Factures upload error:", uploadErr);
      alert("Erreur lors du stockage de la photo : " + uploadErr.message);
      return;
    }
    alert("Upload Storage réussi");
    const { data: urlData } = supabase.storage.from(INVOICE_BUCKET).getPublicUrl(path);
    console.log("Factures public URL:", urlData);
    const publicUrl = urlData?.publicUrl ?? null;
    if (!publicUrl) {
      alert("Erreur : impossible de récupérer l'URL publique de la photo.");
      return;
    }

    const vendor = window.prompt("Nom du fournisseur ?")?.trim() ?? "";
    if (!vendor) {
      alert("Import annulé : fournisseur manquant.");
      return;
    }
    const ttcInput = window.prompt("Montant TTC (€) ? (ex: 123.45)")?.trim() ?? "";
    const ttc = parseFloat(ttcInput.replace(",", "."));
    if (!ttcInput || Number.isNaN(ttc) || ttc < 0) {
      alert("Montant TTC invalide. Import annulé.");
      return;
    }
    const amountHt = Math.round((ttc / 1.2) * 100) / 100;

    const payload: Record<string, unknown> = {
      user_id: user.id,
      description: vendor,
      amount_ht: amountHt,
      tva_rate: 20,
      category: "achat_materiel",
      date: today,
      image_url: publicUrl,
      project_id: filterProjectId || null,
    };

    const { error: insertError } = await supabase.from("expenses").insert(payload);
    if (insertError) {
      console.error("Factures insert expense error:", insertError);
      alert("Erreur lors de l'insertion en base : " + insertError.message);
      return;
    }
    alert("Insertion Database réussie");
    window.location.reload();
  };

  const handleSubmitPhotoForm = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!pendingImageUrl) {
      alert("Erreur : aucune image à enregistrer (image_url vide).");
      return;
    }
    const vendor = formVendor.trim();
    if (!vendor) {
      setFormError("Indiquez le fournisseur.");
      return;
    }
    const ttc = parseFloat(formTtc.replace(",", "."));
    if (Number.isNaN(ttc) || ttc < 0) {
      setFormError("Montant TTC invalide.");
      return;
    }
    const amountHt = Math.round((ttc / 1.2) * 100) / 100;
    const supabase = createClient();
    if (!supabase) {
      console.error("Factures submit form error: Supabase client indisponible");
      alert("Connexion à la base de données indisponible (Supabase).");
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user ?? null;
    if (!user) {
      console.error("Factures submit form error: utilisateur non connecté");
      alert("Utilisateur non connecté.");
      return;
    }

    setFormSaving(true);
    setFormError(null);
    const payload: Record<string, unknown> = {
      user_id: user.id,
      description: vendor,
      amount_ht: amountHt,
      tva_rate: 20,
      category: "achat_materiel",
      date: formDate || today,
      image_url: pendingImageUrl,
      project_id: filterProjectId || null,
    };
    const { error } = await supabase.from("expenses").insert(payload);
    setFormSaving(false);
    if (error) {
      console.error("Factures insert expense error:", error);
      setFormError(error.message);
      return;
    }
    alert("Insertion Database réussie");
    setAddPhotoOpen(false);
    setPendingImageUrl(null);
    setFormVendor("");
    setFormTtc("");
    await refetch();
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

      <Card className={cn("overflow-visible transition-shadow hover:shadow-brand-glow")}>
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
            <div
              role="group"
              aria-label="Exports"
              onClick={(e) => e.stopPropagation()}
              className="flex flex-wrap items-center gap-2 z-10"
            >
              <button
                type="button"
                className="cursor-pointer bg-blue-600 text-white p-2 rounded min-h-[44px] disabled:opacity-50"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                {importing ? "Import…" : "Importer une facture"}
              </button>
              <button
                type="button"
                className="cursor-pointer bg-blue-600 text-white p-2 rounded min-h-[44px] disabled:opacity-50"
                disabled={filtered.length === 0 || pdfLoading || importing}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleExportPDF();
                }}
              >
                {pdfLoading ? "…" : t("exportPDFForAccountant", language)}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImportExpense}
            />
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
            <div className={cn("overflow-x-auto overflow-y-visible")}>
              <table className={cn("w-full text-sm")}>
                <thead>
                  <tr className={cn("border-b border-gray-200 text-left text-gray-500")}>
                    <th className={cn("w-14 pb-2 pr-2")} aria-label="Photo" />
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
                      <tr key={e.id} className={cn("border-b border-gray-100", deletingId === e.id && "opacity-60 pointer-events-none")}>
                        <td className={cn("py-2 pr-2 align-middle")}>
                          {(e as ExpenseRow).image_url ? (
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.preventDefault();
                                ev.stopPropagation();
                                setFullscreenImageUrl((e as ExpenseRow).image_url!);
                              }}
                              className="block w-10 h-10 rounded border border-gray-200 overflow-hidden bg-gray-100 hover:ring-2 hover:ring-brand-blue-400 focus:outline-none focus:ring-2 focus:ring-brand-blue-500"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={(e as ExpenseRow).image_url!} alt="" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <span className="block w-10 h-10 rounded border border-gray-100 bg-gray-50 flex items-center justify-center text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className={cn("py-3 pr-2")}>{formatDate(e.date)}</td>
                        <td className={cn("py-3 pr-2 font-medium")}>{vendor}</td>
                        <td className={cn("py-3 pr-2 text-gray-600")}>{e.project_name ?? "—"}</td>
                        <td className={cn("py-3 pr-2")}>{formatConvertedCurrency(e.amount_ht, currency)}</td>
                        <td className={cn("py-3 pr-2")}>{formatConvertedCurrency(tvaAmount, currency)}</td>
                        <td className={cn("py-3 pr-2 font-medium")}>{formatConvertedCurrency(ttc, currency)}</td>
                        <td className={cn("py-3 overflow-visible")}>
                          <RowActionsMenu
                            isOpen={openMenuId === e.id}
                            onOpenChange={(open) => setOpenMenuId(open ? e.id : null)}
                            onEdit={() => openEdit(e.id)}
                            onDelete={async () => {
                              if (!confirm("Supprimer?")) return;
                              setDeletingId(e.id);
                              const supabase = createClient();
                              if (!supabase) { setDeletingId(null); return; }
                              const { data: { user } } = await supabase.auth.getUser();
                              if (!user) { setDeletingId(null); return; }
                              const { error } = await supabase.from("expenses").delete().eq("id", e.id).eq("user_id", user.id);
                              if (error) { setDeletingId(null); alert("Erreur: " + error.message); }
                              else location.reload();
                            }}
                            isDeleting={deletingId === e.id}
                          />
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

      <Dialog open={addPhotoOpen} onOpenChange={(open) => { if (!open) { setAddPhotoOpen(false); setPendingImageUrl(null); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle facture — Saisie manuelle</DialogTitle>
            <p className="text-sm text-gray-500">La photo a été enregistrée. Renseignez les informations ci-dessous.</p>
          </DialogHeader>
          <form onSubmit={handleSubmitPhotoForm} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Date</label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="min-h-[44px]" required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Fournisseur</label>
              <Input value={formVendor} onChange={(e) => setFormVendor(e.target.value)} placeholder="Nom du fournisseur" className="min-h-[44px]" required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Montant TTC (€)</label>
              <Input type="number" step="0.01" min="0" value={formTtc} onChange={(e) => setFormTtc(e.target.value)} placeholder="0,00" className="min-h-[44px]" required />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setAddPhotoOpen(false); setPendingImageUrl(null); }} disabled={formSaving}>Annuler</Button>
              <Button type="submit" disabled={formSaving}>{formSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!fullscreenImageUrl} onOpenChange={(open) => !open && setFullscreenImageUrl(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-fit p-2 bg-black/95 border-gray-700">
          {fullscreenImageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fullscreenImageUrl} alt="Facture" className="max-h-[90vh] w-auto object-contain" />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => setFullscreenImageUrl(null)}
              >
                Fermer
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

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
