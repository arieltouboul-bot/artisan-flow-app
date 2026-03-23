"use client";

import { useState, useRef, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { OmniTabSearch } from "@/components/ui/omni-tab-search";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { SwipeActionsRow } from "@/components/ui/swipe-actions-row";
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
import { useRentals, rentalDurationDays, rentalTotalCostEur } from "@/hooks/use-rentals";
import { t } from "@/lib/translations";
import { formatConvertedCurrency, cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import { createClient } from "@/lib/supabase/client";
import { Package, Plus, Loader2, Truck, Calendar, ExternalLink, Sparkles, Scan, Camera, Upload } from "lucide-react";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import type { InventoryItem } from "@/hooks/use-inventory";
import type { Supplier } from "@/hooks/use-suppliers";
import { parseInvoiceText, imageFileToBinarizedBlob, type ScanInvoiceResult } from "@/lib/invoice-ocr";
import type { ExpenseInsertPayload } from "@/lib/types";
import { InlineEditableAmountEur } from "@/components/finance/inline-editable-amount";

const VAT_OPTIONS = [0, 5.5, 10, 20];
const GOOGLE_MAPS_SEARCH_URL = "https://www.google.com/maps/search/magasin+de+bricolage+materiaux+hardware+store/";
const INVOICE_BUCKET = "factures";

export default function MaterielPage() {
  const { language } = useLanguage();
  const { displayCurrency } = useProfile();
  const currency = displayCurrency;
  const { items, loading, error, addItem, updateItem, deleteItem } = useInventory();
  const { suppliers, loading: suppliersLoading, error: suppliersError, addSupplier, updateSupplier, deleteSupplier, refetch: refetchSuppliers } = useSuppliers();
  const { projects } = useProjects();
  const { rentals, loading: rentalsLoading, error: rentalsError, addRental, updateRental, deleteRental } = useRentals();
  const isMobile = useIsMobile();
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [rentalAddOpen, setRentalAddOpen] = useState(false);
  const [rentalName, setRentalName] = useState("");
  const [rentalRenter, setRentalRenter] = useState("");
  const [rentalProjectId, setRentalProjectId] = useState("");
  const [rentalStartDate, setRentalStartDate] = useState("");
  const [rentalEndDate, setRentalEndDate] = useState("");
  const [rentalPricePerDay, setRentalPricePerDay] = useState("");
  const [rentalEditId, setRentalEditId] = useState<string | null>(null);
  const [rentalSaving, setRentalSaving] = useState(false);
  const [rentalError, setRentalError] = useState<string | null>(null);

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
  const [scanImageFile, setScanImageFile] = useState<File | null>(null);
  const [saveExpenseLoading, setSaveExpenseLoading] = useState(false);
  const [saveExpenseError, setSaveExpenseError] = useState<string | null>(null);
  const [saveExpenseSuccess, setSaveExpenseSuccess] = useState(false);

  const [tabSearch, setTabSearch] = useState("");
  const debouncedTabSearch = useDebouncedValue(tabSearch, 300);

  const filteredItems = useMemo(() => {
    const q = debouncedTabSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        (it.category || "").toLowerCase().includes(q) ||
        String(it.stock_quantity).includes(q) ||
        String(it.unit_price_ht ?? "").includes(q)
    );
  }, [items, debouncedTabSearch]);

  const filteredSuppliers = useMemo(() => {
    const q = debouncedTabSearch.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone || "").toLowerCase().includes(q) ||
        (s.address || "").toLowerCase().includes(q)
    );
  }, [suppliers, debouncedTabSearch]);

  const filteredRentals = useMemo(() => {
    const q = debouncedTabSearch.trim().toLowerCase();
    if (!q) return rentals;
    return rentals.filter((r) => {
      const projectName = projects.find((p) => p.id === r.project_id)?.name ?? "";
      return (
        r.equipment_name.toLowerCase().includes(q) ||
        r.renter_name.toLowerCase().includes(q) ||
        projectName.toLowerCase().includes(q)
      );
    });
  }, [rentals, projects, debouncedTabSearch]);

  const handleAddRental = async (e: React.FormEvent) => {
    e.preventDefault();
    setRentalError(null);
    const price = parseFloat(rentalPricePerDay.replace(",", "."));
    if (!rentalName.trim() || !rentalRenter.trim() || !rentalProjectId || !rentalStartDate || !rentalEndDate) {
      setRentalError(language === "fr" ? "Tous les champs sont requis." : "All fields are required.");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setRentalError(language === "fr" ? "Prix/jour invalide." : "Invalid daily price.");
      return;
    }
    if (new Date(`${rentalEndDate}T00:00:00`) < new Date(`${rentalStartDate}T00:00:00`)) {
      setRentalError(language === "fr" ? "La date de fin doit être après le début." : "End date must be after start date.");
      return;
    }
    setRentalSaving(true);
    const payload = {
      equipment_name: rentalName.trim(),
      renter_name: rentalRenter.trim(),
      project_id: rentalProjectId,
      start_date: rentalStartDate,
      end_date: rentalEndDate,
      price_per_day: price,
    };
    const { error: err } = rentalEditId ? await updateRental(rentalEditId, payload) : await addRental(payload);
    setRentalSaving(false);
    if (err) {
      setRentalError(err);
      return;
    }
    setRentalAddOpen(false);
    setRentalName("");
    setRentalRenter("");
    setRentalProjectId("");
    setRentalStartDate("");
    setRentalEndDate("");
    setRentalPricePerDay("");
    setRentalEditId(null);
  };

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
    setScanImageFile(null);
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

  /** Auto-scan : déclenché directement par l'onChange de l'input photo/fichier. Langue : FR -> fra+eng, HE -> heb+eng (pas de mélange). */
  const onScanFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !file.type.startsWith("image/")) {
      setScanError(t("invalidImage", language));
      return;
    }
    setScanImageFile(file);
    setScanError(null);
    setScanResult(null);
    setScanLoading(true);
    try {
      const processedBlob = await imageFileToBinarizedBlob(file);
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
    const amountTtc = parseFloat(scanAmountTtc.replace(",", "."));
    const tvaAmount = parseFloat(scanTva.replace(",", "."));
    setSaveExpenseLoading(true);

    let imageUrl: string | null = null;
    if (scanImageFile) {
      const storagePath = `${user.id}/materials/${crypto.randomUUID()}.jpg`;
      const { error: uploadErr } = await supabase.storage
        .from(INVOICE_BUCKET)
        .upload(storagePath, scanImageFile, { upsert: false, contentType: scanImageFile.type });
      if (uploadErr) {
        setSaveExpenseLoading(false);
        setSaveExpenseError(uploadErr.message);
        return;
      }
      const { data: urlData } = supabase.storage.from(INVOICE_BUCKET).getPublicUrl(storagePath);
      imageUrl = urlData?.publicUrl ?? null;
    }

    const expensePayload: ExpenseInsertPayload = {
      project_id: scanProjectId,
      user_id: user.id,
      vendor: scanVendor || undefined,
      description,
      amount_ht: amountHt,
      tva_rate: Math.round(tvaRate * 10) / 10,
      // Champs supplémentaires de confort pour les exports / comptabilité
      amount_ttc: Number.isFinite(amountTtc) ? amountTtc : null,
      tva_amount: Number.isFinite(tvaAmount) ? tvaAmount : null,
      image_url: imageUrl,
      category: "achat_materiel",
      date: scanDate || new Date().toISOString().slice(0, 10),
      invoice_date: scanDate || new Date().toISOString().slice(0, 10),
    };
    const { error: insertError } = await supabase.from("expenses").insert(expensePayload);
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

      <OmniTabSearch
        value={tabSearch}
        onChange={setTabSearch}
        placeholder={t("omniSearchMateriel", language)}
        className="max-w-xl"
      />

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
          <Card className="overflow-visible transition-shadow hover:shadow-brand-glow">
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
              ) : filteredItems.length === 0 ? (
                <p className="py-12 text-center text-gray-500">{t("noItems", language)}</p>
              ) : isMobile ? (
                <div className="space-y-3 px-1">
                  {filteredItems.map((item) => {
                    const runDel = async () => {
                      if (!confirm(language === "en" ? "Delete this item?" : "Supprimer cet article ?")) return;
                      setDeletingId(`item-${item.id}`);
                      const supabase = createClient();
                      if (!supabase) { setDeletingId(null); return; }
                      const { error } = await supabase.from("inventory").delete().eq("id", item.id);
                      if (error) { setDeletingId(null); alert("Erreur: " + error.message); }
                      else location.reload();
                    };
                    return (
                      <SwipeActionsRow
                        key={item.id}
                        onEdit={() => setEditItem(item)}
                        onDelete={runDel}
                        disabled={deletingId === `item-${item.id}`}
                        editLabel={t("edit", language)}
                        deleteLabel={t("delete", language)}
                      >
                        <div className={cn("p-3", deletingId === `item-${item.id}` && "opacity-60 pointer-events-none")}>
                          <p className="font-semibold text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.category || "—"} · {t("stock", language)}: {item.stock_quantity}
                          </p>
                          <p className="mt-1 text-sm">
                            {formatConvertedCurrency(item.unit_price_ht, currency)} HT · TVA {item.default_tva_rate}%
                          </p>
                        </div>
                      </SwipeActionsRow>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-visible">
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
                      {filteredItems.map((item) => (
                        <tr key={item.id} className={cn("border-b border-gray-100", deletingId === `item-${item.id}` && "opacity-60 pointer-events-none")}>
                          <td className="py-3 pr-2 font-medium">{item.name}</td>
                          <td className="py-3 pr-2 text-gray-600">{item.category || "—"}</td>
                          <td className="py-3 pr-2">{formatConvertedCurrency(item.unit_price_ht, currency)}</td>
                          <td className="py-3 pr-2">{item.default_tva_rate} %</td>
                          <td className="py-3 pr-2">{item.stock_quantity}</td>
                          <td className="py-3 pr-2 text-gray-600">
                            {item.supplier_id ? suppliers.find((s) => s.id === item.supplier_id)?.name ?? "—" : "—"}
                          </td>
                          <td className="py-3 overflow-visible">
                            <RowActionsMenu
                              isOpen={openMenuId === `item-${item.id}`}
                              onOpenChange={(open) => setOpenMenuId(open ? `item-${item.id}` : null)}
                              onEdit={() => setEditItem(item)}
                              onDelete={async () => {
                                if (!confirm("Supprimer?")) return;
                                setDeletingId(`item-${item.id}`);
                                const supabase = createClient();
                                if (!supabase) { setDeletingId(null); return; }
                                const { error } = await supabase.from("inventory").delete().eq("id", item.id);
                                if (error) { setDeletingId(null); alert("Erreur: " + error.message); }
                                else location.reload();
                              }}
                              isDeleting={deletingId === `item-${item.id}`}
                            />
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
          <Card className="overflow-visible transition-shadow hover:shadow-brand-glow">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-brand-blue-500" />
                  {t("rental", language)}
                </CardTitle>
                <p className="text-sm text-gray-500">{t("rentalDesc", language)}</p>
              </div>
              <Button onClick={() => setRentalAddOpen(true)} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" />
                {t("add", language)}
              </Button>
            </CardHeader>
            <CardContent>
              {rentalsError && (
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 mb-4">{rentalsError}</div>
              )}
              {rentalsLoading ? (
                <div className="flex items-center gap-2 py-12 text-gray-500">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span>{t("loading", language)}</span>
                </div>
              ) : filteredRentals.length === 0 ? (
                <p className="py-8 text-center text-gray-500">{t("rentalNoEntries", language)}</p>
              ) : (
                <div className="space-y-3 px-1">
                  {filteredRentals.map((r) => {
                    const duration = rentalDurationDays(r.start_date, r.end_date);
                    const total = rentalTotalCostEur(r);
                    const now = new Date();
                    const end = new Date(`${r.end_date}T23:59:59`);
                    const late = now > end;
                    const projectName = projects.find((p) => p.id === r.project_id)?.name ?? "—";
                    const delId = `rental-${r.id}`;
                    const card = (
                      <div className={cn("rounded-lg border border-gray-100 bg-white p-3", deletingId === delId && "opacity-60 pointer-events-none")}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{r.equipment_name}</p>
                            <p className="text-xs text-gray-500">
                              {t("invoiceVendor", language)}: {r.renter_name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{t("projectName", language)}: {projectName}</p>
                          </div>
                          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", late ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>
                            {late ? t("rentalStatusToReturn", language) : t("rentalStatusOnSite", language)}
                          </span>
                        </div>
                        <div className="mt-2 grid gap-1 text-xs text-gray-600">
                          <span>{t("startDate", language)}: {r.start_date} · {t("endDate", language)}: {r.end_date}</span>
                          <span>{t("rentalDurationDays", language)}: {duration}</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{t("rentalDailyPrice", language)}:</span>
                            <InlineEditableAmountEur
                              amountEur={r.price_per_day}
                              displayCurrency={currency}
                              className="text-brand-blue-700"
                              aria-label={t("financeEditAmountAria", language)}
                              onCommit={async (newEur) => {
                                const res = await updateRental(r.id, { price_per_day: newEur });
                                if (res.error) alert(res.error);
                              }}
                            />
                            <span className="text-gray-400">·</span>
                            <span>{t("rentalTotalCost", language)}:</span>
                            <span className="font-semibold text-gray-900 tabular-nums">{formatConvertedCurrency(total, currency)}</span>
                          </div>
                        </div>
                      </div>
                    );
                    if (isMobile) {
                      return (
                        <SwipeActionsRow
                          key={r.id}
                          onEdit={() => {
                            setRentalEditId(r.id);
                            setRentalName(r.equipment_name);
                            setRentalRenter(r.renter_name);
                            setRentalProjectId(r.project_id);
                            setRentalStartDate(r.start_date);
                            setRentalEndDate(r.end_date);
                            setRentalPricePerDay(String(r.price_per_day));
                            setRentalError(null);
                            setRentalAddOpen(true);
                          }}
                          onDelete={async () => {
                            if (!confirm(language === "fr" ? "Supprimer cette location ?" : "Delete this rental?")) return;
                            setDeletingId(delId);
                            const res = await deleteRental(r.id);
                            setDeletingId(null);
                            if (res.error) alert(res.error);
                          }}
                          disabled={deletingId === delId}
                          editLabel={t("edit", language)}
                          deleteLabel={t("delete", language)}
                        >
                          {card}
                        </SwipeActionsRow>
                      );
                    }
                    return (
                      <div key={r.id} className="flex items-stretch gap-2">
                        <div className="flex-1">{card}</div>
                        <RowActionsMenu
                          isOpen={openMenuId === delId}
                          onOpenChange={(open) => setOpenMenuId(open ? delId : null)}
                          onEdit={() => {
                            setRentalEditId(r.id);
                            setRentalName(r.equipment_name);
                            setRentalRenter(r.renter_name);
                            setRentalProjectId(r.project_id);
                            setRentalStartDate(r.start_date);
                            setRentalEndDate(r.end_date);
                            setRentalPricePerDay(String(r.price_per_day));
                            setRentalError(null);
                            setRentalAddOpen(true);
                          }}
                          onDelete={async () => {
                            if (!confirm(language === "fr" ? "Supprimer cette location ?" : "Delete this rental?")) return;
                            setDeletingId(delId);
                            const res = await deleteRental(r.id);
                            setDeletingId(null);
                            if (res.error) alert(res.error);
                          }}
                          isDeleting={deletingId === delId}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card className="overflow-visible transition-shadow hover:shadow-brand-glow">
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
            <CardContent className="overflow-visible">
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
              ) : isMobile ? (
                <div className="space-y-3 px-1">
                  {suppliers.map((s) => {
                    const runDel = async () => {
                      if (!confirm(language === "en" ? "Delete this supplier?" : "Supprimer ce fournisseur ?")) return;
                      setDeletingId(`supplier-${s.id}`);
                      const supabase = createClient();
                      if (!supabase) { setDeletingId(null); return; }
                      const { error } = await supabase.from("suppliers").delete().eq("id", s.id);
                      if (error) { setDeletingId(null); alert("Erreur: " + error.message); }
                      else location.reload();
                    };
                    return (
                      <SwipeActionsRow
                        key={s.id}
                        onEdit={() => setEditSupplier(s)}
                        onDelete={runDel}
                        disabled={deletingId === `supplier-${s.id}`}
                        editLabel={t("edit", language)}
                        deleteLabel={t("deleteSupplier", language)}
                      >
                        <div className={cn("p-3", deletingId === `supplier-${s.id}` && "opacity-60 pointer-events-none")}>
                          <p className="font-semibold text-gray-900">{s.name}</p>
                          <p className="text-sm text-gray-600">{s.phone || "—"}</p>
                          <p className="text-xs text-gray-500 truncate">{s.address || "—"}</p>
                        </div>
                      </SwipeActionsRow>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto overflow-y-visible">
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
                        <tr key={s.id} className={cn("border-b border-gray-100", deletingId === `supplier-${s.id}` && "opacity-60 pointer-events-none")}>
                          <td className="py-3 pr-2 font-medium">{s.name}</td>
                          <td className="py-3 pr-2 text-gray-600">{s.phone || "—"}</td>
                          <td className="py-3 pr-2 text-gray-600 max-w-[200px] truncate">{s.address || "—"}</td>
                          <td className="py-3 overflow-visible">
                            <RowActionsMenu
                              isOpen={openMenuId === `supplier-${s.id}`}
                              onOpenChange={(open) => setOpenMenuId(open ? `supplier-${s.id}` : null)}
                              onEdit={() => setEditSupplier(s)}
                              onDelete={async () => {
                                if (!confirm("Supprimer?")) return;
                                setDeletingId(`supplier-${s.id}`);
                                const supabase = createClient();
                                if (!supabase) { setDeletingId(null); return; }
                                const { error } = await supabase.from("suppliers").delete().eq("id", s.id);
                                if (error) { setDeletingId(null); alert("Erreur: " + error.message); }
                                else location.reload();
                              }}
                              isDeleting={deletingId === `supplier-${s.id}`}
                            />
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
      <Dialog
        open={rentalAddOpen}
        onOpenChange={(open) => {
          setRentalAddOpen(open);
          if (!open) {
            setRentalEditId(null);
            setRentalError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{rentalEditId ? t("edit", language) : t("rentalAddTitle", language)}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddRental} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t("name", language)}</label>
              <Input value={rentalName} onChange={(e) => setRentalName(e.target.value)} className="min-h-[44px]" required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t("invoiceVendor", language)}</label>
              <Input value={rentalRenter} onChange={(e) => setRentalRenter(e.target.value)} className="min-h-[44px]" required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t("selectProjectForExpense", language)}</label>
              <select value={rentalProjectId} onChange={(e) => setRentalProjectId(e.target.value)} className={cn("w-full min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 bg-white")} required>
                <option value="">—</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("startDate", language)}</label>
                <Input type="date" value={rentalStartDate} onChange={(e) => setRentalStartDate(e.target.value)} className="min-h-[44px]" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("endDate", language)}</label>
                <Input type="date" value={rentalEndDate} onChange={(e) => setRentalEndDate(e.target.value)} className="min-h-[44px]" required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t("rentalDailyPrice", language)}</label>
              <Input type="number" min="0" step="0.01" value={rentalPricePerDay} onChange={(e) => setRentalPricePerDay(e.target.value)} className="min-h-[44px]" required />
            </div>
            {rentalError && <p className="text-sm text-red-600">{rentalError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRentalAddOpen(false)} disabled={rentalSaving}>{t("cancel", language)}</Button>
              <Button type="submit" disabled={rentalSaving}>{rentalSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save", language)}</Button>
            </DialogFooter>
          </form>
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
            setScanImageFile(null);
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
