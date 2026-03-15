"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useInventory } from "@/hooks/use-inventory";
import { useSuppliers } from "@/hooks/use-suppliers";
import { useProjects } from "@/hooks/use-projects";
import { t } from "@/lib/translations";
import { formatConvertedCurrency, cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";
import { Package, Plus, Trash2, Pencil, Loader2, Truck, Calendar, ExternalLink, Sparkles, Scan, Camera, Upload } from "lucide-react";
import type { InventoryItem } from "@/hooks/use-inventory";
import type { Supplier } from "@/hooks/use-suppliers";
import { parseInvoiceText, type ScanInvoiceResult } from "@/lib/invoice-ocr";

const VAT_OPTIONS = [0, 5.5, 10, 20];
const GOOGLE_MAPS_SEARCH_URL = "https://www.google.com/maps/search/magasin+de+bricolage+materiaux+hardware+store/";

export default function MaterielPage() {
  const { language } = useLanguage();
  const { displayCurrency } = useProfile();
  const currency = displayCurrency;
  const { items, loading, error, addItem, updateItem, deleteItem } = useInventory();
  const { suppliers, loading: suppliersLoading, error: suppliersError, addSupplier, updateSupplier, deleteSupplier, refetch: refetchSuppliers } = useSuppliers();
  const { projects } = useProjects();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addStock, setAddStock] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addTva, setAddTva] = useState(20);
  const [addSupplierId, setAddSupplierId] = useState<string>("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [supplierPhone, setSupplierPhone] = useState("");
  const [supplierAddress, setSupplierAddress] = useState("");
  const [supplierSaving, setSupplierSaving] = useState(false);
  const [supplierFormError, setSupplierFormError] = useState<string | null>(null);

  const [pasteText, setPasteText] = useState("");
  const [extractLoading, setExtractLoading] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);

  const [scanOpen, setScanOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanInvoiceResult | null>(null);
  const [scanVendor, setScanVendor] = useState("");
  const [scanDate, setScanDate] = useState("");
  const [scanAmountHt, setScanAmountHt] = useState("");
  const [scanTva, setScanTva] = useState("");
  const [scanAmountTtc, setScanAmountTtc] = useState("");
  const [scanItemsText, setScanItemsText] = useState("");
  const [scanProjectId, setScanProjectId] = useState<string>("");
  const [saveExpenseLoading, setSaveExpenseLoading] = useState(false);
  const [saveExpenseError, setSaveExpenseError] = useState<string | null>(null);
  const [saveExpenseSuccess, setSaveExpenseSuccess] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const price = parseFloat(addPrice.replace(",", "."));
    if (!addName.trim()) {
      setAddError("Nom requis.");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setAddError("Prix invalide.");
      return;
    }
    setAddSaving(true);
    const { error: err } = await addItem({
      name: addName.trim(),
      unit_price_ht: price,
      stock_quantity: Number(addStock) || 0,
      category: addCategory.trim(),
      default_tva_rate: addTva,
      supplier_id: addSupplierId || null,
    });
    setAddSaving(false);
    if (err) {
      setAddError(err);
      return;
    }
    setAddOpen(false);
    setAddName("");
    setAddPrice("");
    setAddStock("");
    setAddCategory("");
    setAddTva(20);
    setAddSupplierId("");
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupplierFormError(null);
    if (!supplierName.trim()) {
      setSupplierFormError(language === "fr" ? "Nom requis." : "Name required.");
      return;
    }
    setSupplierSaving(true);
    const { error: err } = await addSupplier({
      name: supplierName.trim(),
      phone: supplierPhone.trim(),
      address: supplierAddress.trim(),
      category: "",
    });
    setSupplierSaving(false);
    if (err) {
      setSupplierFormError(err);
      return;
    }
    setSupplierFormOpen(false);
    setSupplierName("");
    setSupplierPhone("");
    setSupplierAddress("");
    refetchSuppliers();
  };

  const openScanInvoice = () => {
    setScanError(null);
    setScanResult(null);
    setScanLoading(false);
    setSaveExpenseError(null);
    setSaveExpenseSuccess(false);
    setScanProjectId("");
    setScanOpen(true);
  };

  const applyScanResult = (result: ScanInvoiceResult) => {
    setScanResult(result);
    setScanVendor(result.vendor);
    setScanDate(result.date);
    setScanAmountHt(String(result.amount_ht));
    setScanTva(String(result.tva));
    setScanAmountTtc(String(result.amount_ttc));
    setScanItemsText(result.items.join("\n"));
  };

  /** Prétraitement CamScanner : grayscale + binarisation (noir et blanc pur) pour maximiser la précision OCR. */
  const imageFileToProcessedBlob = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const threshold = 128;
        for (let i = 0; i < data.length; i += 4) {
          const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const bin = gray >= threshold ? 255 : 0;
          data[i] = data[i + 1] = data[i + 2] = bin;
        }
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : resolve(file)),
          "image/jpeg",
          0.92
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  };

  /** Auto-scan : déclenché directement par l'onChange de l'input photo/fichier. Langue : FR -> fra+eng, HE -> heb+eng (pas de mélange). */
  const onScanFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      setScanError(t("invalidImage", language));
      return;
    }
    setScanError(null);
    setScanResult(null);
    setScanLoading(true);
    try {
      const processedBlob = await imageFileToProcessedBlob(file);
      const Tesseract = (await import("tesseract.js")).default;
      const lang = (language as string).toLowerCase();
      const tesseractLang = lang.startsWith("he") ? "heb+eng" : lang.startsWith("fr") ? "fra+eng" : "eng";
      const { data } = await Tesseract.recognize(processedBlob, tesseractLang);
      const parsed = parseInvoiceText(data.text);
      const result: ScanInvoiceResult = {
        vendor: parsed.vendor,
        date: parsed.date || new Date().toISOString().slice(0, 10),
        amount_ht: parsed.amount_ht,
        tva: parsed.tva,
        amount_ttc: parsed.amount_ttc,
        items: parsed.items,
        currency: parsed.currency || displayCurrency || "EUR",
      };
      applyScanResult(result);
    } catch {
      setScanError(t("scanOcrError", language));
    }
    setScanLoading(false);
  };

  const handleSaveScannedExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveExpenseError(null);
    if (!scanProjectId) {
      setSaveExpenseError(t("noProjectSelected", language));
      return;
    }
    const amountHt = parseFloat(scanAmountHt.replace(",", "."));
    if (Number.isNaN(amountHt) || amountHt < 0) {
      setSaveExpenseError(t("invalidAmountHt", language));
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setSaveExpenseError(t("connectionError", language));
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaveExpenseError(t("notLoggedIn", language));
      return;
    }
    const tvaRate = amountHt > 0 && parseFloat(scanTva.replace(",", "."))
      ? (parseFloat(scanTva.replace(",", ".")) / amountHt) * 100
      : 20;
    const description = [scanVendor, scanItemsText.trim()].filter(Boolean).join(" — ") || t("scannedInvoice", language);
    setSaveExpenseLoading(true);
    const { error: insertError } = await supabase.from("expenses").insert({
      project_id: scanProjectId,
      user_id: user.id,
      description,
      amount_ht: amountHt,
      tva_rate: Math.round(tvaRate * 10) / 10,
      category: "achat_materiel",
      date: scanDate || new Date().toISOString().slice(0, 10),
    });
    setSaveExpenseLoading(false);
    if (insertError) {
      setSaveExpenseError(insertError.message);
      return;
    }
    setSaveExpenseSuccess(true);
    setTimeout(() => {
      setScanOpen(false);
      setScanResult(null);
    }, 1500);
  };

  const handleExtractFromPaste = async () => {
    const text = pasteText.trim();
    if (!text) return;
    setExtractError(null);
    setExtractLoading(true);
    try {
      const res = await fetch("/api/parse-supplier-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExtractError(data.error || "Erreur");
        setExtractLoading(false);
        return;
      }
      setSupplierName(data.name ?? "");
      setSupplierPhone(data.phone ?? "");
      setSupplierAddress(data.address ?? "");
      setPasteText("");
      setExtractError(null);
    } catch {
      setExtractError(language === "fr" ? "Erreur réseau." : "Network error.");
    }
    setExtractLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
          {t("materialManagement", language)}
        </h1>
        <p className="mt-1 text-gray-500">
          {language === "fr" ? "Catalogue, location et fournisseurs" : "Catalogue, rental and suppliers"}
        </p>
      </div>

      <Tabs defaultValue="catalogue" className="space-y-4">
        <TabsList className={cn("grid w-full grid-cols-3 lg:w-auto lg:inline-grid min-h-[48px] p-1")}>
          <TabsTrigger value="catalogue" className="min-h-[44px] gap-2">
            <Package className="h-4 w-4" />
            {t("catalogue", language)}
          </TabsTrigger>
          <TabsTrigger value="rental" className="min-h-[44px] gap-2">
            <Calendar className="h-4 w-4" />
            {t("rental", language)}
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="min-h-[44px] gap-2">
            <Truck className="h-4 w-4" />
            {t("suppliers", language)}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogue" className="space-y-4">
          <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-brand-blue-500" />
                  {t("catalogue", language)}
                </CardTitle>
                <p className="text-sm text-gray-500">{t("catalogueDesc", language)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={openScanInvoice} className="min-h-[44px]">
                  <Scan className="h-4 w-4 mr-2" />
                  {t("scanInvoice", language)}
                </Button>
                <Button onClick={() => setAddOpen(true)} className="min-h-[44px]">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addArticle", language)}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onScanFileChange} className="hidden" aria-hidden />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onScanFileChange} className="hidden" aria-hidden />
              {error && (
                <div className={cn("rounded-lg bg-red-50 p-4 text-sm text-red-700 mb-4")}>
                  {error}
                  {error.includes("exist") && (
                    <p className="mt-2 text-xs">
                      {language === "fr" ? "Exécutez le script SQL de création de la table inventory dans Supabase." : "Run the inventory table SQL script in Supabase."}
                    </p>
                  )}
                </div>
              )}
              {loading ? (
                <div className="flex items-center gap-2 py-12 text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span>{t("loading", language)}</span>
                </div>
              ) : items.length === 0 ? (
                <p className="py-12 text-center text-gray-500">{t("noItems", language)}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="pb-2 pr-2">{t("name", language)}</th>
                        <th className="pb-2 pr-2">{t("category", language)}</th>
                        <th className="pb-2 pr-2">{t("unitPriceHT", language)}</th>
                        <th className="pb-2 pr-2">{t("defaultVAT", language)}</th>
                        <th className="pb-2 pr-2">{t("stock", language)}</th>
                        <th className="pb-2 pr-2">{t("selectSupplier", language)}</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100">
                          <td className="py-3 pr-2 font-medium">{item.name}</td>
                          <td className="py-3 pr-2 text-gray-600">{item.category || "—"}</td>
                          <td className="py-3 pr-2">{formatConvertedCurrency(item.unit_price_ht, currency)}</td>
                          <td className="py-3 pr-2">{item.default_tva_rate} %</td>
                          <td className="py-3 pr-2">{item.stock_quantity}</td>
                          <td className="py-3 pr-2 text-gray-600">
                            {item.supplier_id ? suppliers.find((s) => s.id === item.supplier_id)?.name ?? "—" : "—"}
                          </td>
                          <td className="py-3 flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-brand-blue-600 hover:bg-brand-blue-50"
                              onClick={() => setEditItem(item)}
                              aria-label={t("edit", language)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm("Supprimer?")) return;
                                const supabase = createClient();
                                if (!supabase) return;
                                const { error } = await supabase.from("inventory").delete().eq("id", item.id);
                                if (error) {
                                  console.error("Inventory delete failed:", error);
                                  return;
                                }
                                location.reload();
                              }}
                              className="h-8 w-8 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                              aria-label={t("delete", language)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rental" className="space-y-4">
          <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-brand-blue-500" />
                {t("rental", language)}
              </CardTitle>
              <p className="text-sm text-gray-500">{t("rentalDesc", language)}</p>
            </CardHeader>
            <CardContent>
              <p className="py-8 text-center text-gray-500">
                {language === "fr" ? "Suivi des locations par chantier à venir (lié aux projets)." : "Rental tracking per project coming soon."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
            <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-brand-blue-500" />
                  {t("suppliers", language)}
                </CardTitle>
                <p className="text-sm text-gray-500">{t("suppliersDesc", language)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setSupplierFormOpen(true)} className="min-h-[44px]">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addSupplier", language)}
                </Button>
                <a
                  href={GOOGLE_MAPS_SEARCH_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn("inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium min-h-[44px] text-gray-700 hover:bg-gray-50")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t("searchOnGoogleMaps", language)}
                </a>
              </div>
            </CardHeader>
            <CardContent>
              {suppliersError && (
                <div className={cn("rounded-lg bg-red-50 p-4 text-sm text-red-700 mb-4")}>{suppliersError}</div>
              )}
              {suppliersLoading ? (
                <div className="flex items-center gap-2 py-12 text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span>{t("loading", language)}</span>
                </div>
              ) : suppliers.length === 0 ? (
                <p className="py-8 text-center text-gray-500">{t("noSuppliers", language)}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="pb-2 pr-2">{t("name", language)}</th>
                        <th className="pb-2 pr-2">{t("phone", language)}</th>
                        <th className="pb-2 pr-2">{t("address", language)}</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppliers.map((s) => (
                        <tr key={s.id} className="border-b border-gray-100">
                          <td className="py-3 pr-2 font-medium">{s.name}</td>
                          <td className="py-3 pr-2 text-gray-600">{s.phone || "—"}</td>
                          <td className="py-3 pr-2 text-gray-600 max-w-[200px] truncate">{s.address || "—"}</td>
                          <td className="py-3 flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-brand-blue-600 hover:bg-brand-blue-50"
                              onClick={() => setEditSupplier(s)}
                              aria-label={t("edit", language)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm("Supprimer?")) return;
                                const supabase = createClient();
                                if (!supabase) return;
                                const { error } = await supabase.from("suppliers").delete().eq("id", s.id);
                                if (error) {
                                  console.error("Suppliers delete failed:", error);
                                  return;
                                }
                                location.reload();
                              }}
                              className="h-8 w-8 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                              aria-label={t("deleteSupplier", language)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit article dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("edit", language)} — {editItem?.name}</DialogTitle>
          </DialogHeader>
          {editItem && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editItem) return;
                const name = (e.currentTarget.querySelector("[name=editName]") as HTMLInputElement)?.value?.trim() ?? editItem.name;
                const price = parseFloat((e.currentTarget.querySelector("[name=editPrice]") as HTMLInputElement)?.value?.replace(",", ".") ?? String(editItem.unit_price_ht));
                const stock = Number((e.currentTarget.querySelector("[name=editStock]") as HTMLInputElement)?.value ?? editItem.stock_quantity);
                const category = (e.currentTarget.querySelector("[name=editCategory]") as HTMLInputElement)?.value?.trim() ?? editItem.category;
                const tva = Number((e.currentTarget.querySelector("[name=editTva]") as HTMLSelectElement)?.value ?? editItem.default_tva_rate);
                const supplierId = (e.currentTarget.querySelector("[name=editSupplierId]") as HTMLSelectElement)?.value || null;
                const err = await updateItem(editItem.id, { name, unit_price_ht: price, stock_quantity: stock, category, default_tva_rate: tva, supplier_id: supplierId });
                if (err?.error) {
                  console.error("Inventory updateItem failed:", err.error);
                } else setEditItem(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("name", language)}</label>
                <Input name="editName" defaultValue={editItem.name} className="min-h-[44px]" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("category", language)}</label>
                <Input name="editCategory" defaultValue={editItem.category} className="min-h-[44px]" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("unitPriceHT", language)}</label>
                <Input name="editPrice" type="number" step="0.01" min="0" defaultValue={editItem.unit_price_ht} className="min-h-[44px]" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("defaultVAT", language)} %</label>
                <select name="editTva" defaultValue={editItem.default_tva_rate} className={cn("w-full min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 bg-white")}>
                  {VAT_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v} %</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("stock", language)}</label>
                <Input name="editStock" type="number" min="0" defaultValue={editItem.stock_quantity} className="min-h-[44px]" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("selectSupplier", language)}</label>
                <select name="editSupplierId" defaultValue={editItem.supplier_id ?? ""} className={cn("w-full min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 bg-white")}>
                  <option value="">—</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>{t("cancel", language)}</Button>
                <Button type="submit">{t("save", language)}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit supplier dialog */}
      <Dialog open={!!editSupplier} onOpenChange={(open) => !open && setEditSupplier(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("edit", language)} — {editSupplier?.name}</DialogTitle>
          </DialogHeader>
          {editSupplier && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!editSupplier) return;
                const name = (e.currentTarget.querySelector("[name=editSupName]") as HTMLInputElement)?.value?.trim() ?? editSupplier.name;
                const phone = (e.currentTarget.querySelector("[name=editSupPhone]") as HTMLInputElement)?.value?.trim() ?? editSupplier.phone;
                const address = (e.currentTarget.querySelector("[name=editSupAddress]") as HTMLInputElement)?.value?.trim() ?? editSupplier.address;
                const category = (e.currentTarget.querySelector("[name=editSupCategory]") as HTMLInputElement)?.value?.trim() ?? editSupplier.category;
                const err = await updateSupplier(editSupplier.id, { name, phone, address, category });
                if (err?.error) {
                  console.error("Suppliers updateSupplier failed:", err.error);
                } else setEditSupplier(null);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("name", language)}</label>
                <Input name="editSupName" defaultValue={editSupplier.name} className="min-h-[44px]" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("phone", language)}</label>
                <Input name="editSupPhone" defaultValue={editSupplier.phone} className="min-h-[44px]" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("address", language)}</label>
                <Input name="editSupAddress" defaultValue={editSupplier.address} className="min-h-[44px]" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("category", language)}</label>
                <Input name="editSupCategory" defaultValue={editSupplier.category} className="min-h-[44px]" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditSupplier(null)}>{t("cancel", language)}</Button>
                <Button type="submit">{t("save", language)}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Add article dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("addArticle", language)}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t("name", language)}</label>
              <Input value={addName} onChange={(e) => setAddName(e.target.value)} className="min-h-[44px]" required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t("category", language)}</label>
              <Input value={addCategory} onChange={(e) => setAddCategory(e.target.value)} placeholder="Ex: Peinture" className="min-h-[44px]" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t("supplierOptional", language)}</label>
              <select
                value={addSupplierId}
                onChange={(e) => setAddSupplierId(e.target.value)}
                className={cn("w-full min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 bg-white")}
              >
                <option value="">—</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("unitPriceHT", language)}</label>
                <Input type="number" step="0.01" min="0" value={addPrice} onChange={(e) => setAddPrice(e.target.value)} className="min-h-[44px]" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("defaultVAT", language)} %</label>
                <select value={addTva} onChange={(e) => setAddTva(Number(e.target.value))} className={cn("w-full min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 bg-white")}>
                  {VAT_OPTIONS.map((v) => (
                    <option key={v} value={v}>{v} %</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t("stock", language)}</label>
              <Input type="number" min="0" value={addStock} onChange={(e) => setAddStock(e.target.value)} className="min-h-[44px]" />
            </div>
            {addError && <p className="text-sm text-red-600">{addError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={addSaving}>{t("cancel", language)}</Button>
              <Button type="submit" disabled={addSaving}>{addSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save", language)}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add supplier: formulaire express + zone paste IA */}
      <Dialog open={supplierFormOpen} onOpenChange={setSupplierFormOpen}>
        <DialogContent className={cn("max-w-md")}>
          <DialogHeader>
            <DialogTitle>{t("addSupplier", language)}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className={cn("rounded-lg border border-dashed border-gray-300 bg-gray-50/50 p-3")}>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t("pasteGoogleMapsInfo", language)}</label>
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={language === "fr" ? "Ex: Brico Dépôt, 12 rue des pros, 0123456789" : "e.g. Brico Dépôt, 12 rue des pros, 0123456789"}
                rows={3}
                className={cn("w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm min-h-[80px] resize-y")}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={handleExtractFromPaste}
                disabled={!pasteText.trim() || extractLoading}
              >
                {extractLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : <><Sparkles className="h-4 w-4 mr-1 inline" />{t("extractFields", language)}</>}
              </Button>
              {extractError && <p className="text-xs text-red-600 mt-1">{extractError}</p>}
            </div>

            <form onSubmit={handleAddSupplier} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("name", language)}</label>
                <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="min-h-[44px]" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("phone", language)}</label>
                <Input value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} className="min-h-[44px]" placeholder="+33 1 23 45 67 89" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("address", language)}</label>
                <Input value={supplierAddress} onChange={(e) => setSupplierAddress(e.target.value)} className="min-h-[44px]" placeholder="123 rue Example, 75000 Paris" />
              </div>
              {supplierFormError && <p className="text-sm text-red-600">{supplierFormError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSupplierFormOpen(false)} disabled={supplierSaving}>{t("cancel", language)}</Button>
                <Button type="submit" disabled={supplierSaving}>{supplierSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save", language)}</Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scan invoice — 100% local OCR (Tesseract), no API */}
      <Dialog
        open={scanOpen}
        onOpenChange={(open) => {
          setScanOpen(open);
          if (!open) {
            setScanError(null);
            setScanResult(null);
          }
        }}
      >
        <DialogContent className={cn("max-w-md")}>
          <DialogHeader>
            <DialogTitle>{t("scanInvoice", language)}</DialogTitle>
          </DialogHeader>
          {scanError && (
            <p className={cn("text-sm text-red-600 rounded-lg bg-red-50 p-2")}>{scanError}</p>
          )}
          {scanLoading ? (
            <div className={cn("flex items-center justify-center gap-2 py-12 text-gray-500")}>
              <Loader2 className="h-8 w-8 animate-spin" />
              <span>{t("scanOcrReading", language)}</span>
            </div>
          ) : scanResult ? (
            <form onSubmit={handleSaveScannedExpense} className="space-y-4">
              <p className={cn("text-sm text-gray-500")}>{t("verifyAndSave", language)}</p>
              <div>
                <label className={cn("text-sm font-medium text-gray-700 mb-1 block")}>{t("invoiceVendor", language)}</label>
                <Input value={scanVendor} onChange={(e) => setScanVendor(e.target.value)} className={cn("min-h-[44px]")} />
              </div>
              <div>
                <label className={cn("text-sm font-medium text-gray-700 mb-1 block")}>{t("invoiceDate", language)}</label>
                <Input type="date" value={scanDate} onChange={(e) => setScanDate(e.target.value)} className={cn("min-h-[44px]")} />
              </div>
              <div className={cn("grid grid-cols-2 gap-4")}>
                <div>
                  <label className={cn("text-sm font-medium text-gray-700 mb-1 block")}>{t("invoiceAmountHt", language)}</label>
                  <Input type="number" step="0.01" min="0" value={scanAmountHt} onChange={(e) => setScanAmountHt(e.target.value)} className={cn("min-h-[44px]")} />
                </div>
                <div>
                  <label className={cn("text-sm font-medium text-gray-700 mb-1 block")}>{t("invoiceTva", language)}</label>
                  <Input type="number" step="0.01" min="0" value={scanTva} onChange={(e) => setScanTva(e.target.value)} className={cn("min-h-[44px]")} />
                </div>
              </div>
              <div>
                <label className={cn("text-sm font-medium text-gray-700 mb-1 block")}>{t("invoiceAmountTtc", language)}</label>
                <Input type="number" step="0.01" min="0" value={scanAmountTtc} onChange={(e) => setScanAmountTtc(e.target.value)} className={cn("min-h-[44px]")} />
              </div>
              <div>
                <label className={cn("text-sm font-medium text-gray-700 mb-1 block")}>{t("invoiceItems", language)}</label>
                <textarea
                  value={scanItemsText}
                  onChange={(e) => setScanItemsText(e.target.value)}
                  rows={3}
                  className={cn("w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm min-h-[80px] resize-y")}
                />
              </div>
              <div>
                <label className={cn("text-sm font-medium text-gray-700 mb-1 block")}>{t("selectProjectForExpense", language)}</label>
                <select
                  value={scanProjectId}
                  onChange={(e) => setScanProjectId(e.target.value)}
                  className={cn("w-full min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 bg-white")}
                  required
                >
                  <option value="">—</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              {saveExpenseError && <p className={cn("text-sm text-red-600")}>{saveExpenseError}</p>}
              {saveExpenseSuccess && <p className={cn("text-sm text-emerald-600")}>{t("expenseSaved", language)}</p>}
              <DialogFooter className={cn("gap-2")}>
                <Button type="button" variant="outline" onClick={() => setScanOpen(false)} disabled={saveExpenseLoading} className={cn("min-h-[44px]")}>
                  {t("cancel", language)}
                </Button>
                <Button type="submit" disabled={saveExpenseLoading} className={cn("min-h-[44px]")}>
                  {saveExpenseLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("saveToExpenses", language)}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className={cn("py-6 space-y-4")}>
              <p className={cn("text-sm text-gray-600 text-center")}>{t("scanChooseSource", language)}</p>
              <div className={cn("flex flex-col sm:flex-row gap-3 justify-center")}>
                <Button type="button" onClick={() => cameraInputRef.current?.click()} className={cn("min-h-[48px]")}>
                  <Camera className="h-5 w-5 mr-2" />
                  {t("takePhoto", language)}
                </Button>
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className={cn("min-h-[48px]")}>
                  <Upload className="h-5 w-5 mr-2" />
                  {t("importFile", language)}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
