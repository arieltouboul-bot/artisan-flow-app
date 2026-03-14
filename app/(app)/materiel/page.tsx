"use client";

import { useState } from "react";
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
import { t } from "@/lib/translations";
import { formatCurrency, cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import { Package, Plus, Trash2, Loader2, Truck, Calendar, ExternalLink, Sparkles } from "lucide-react";

const VAT_OPTIONS = [0, 5.5, 10, 20];
const GOOGLE_MAPS_SEARCH_URL = "https://www.google.com/maps/search/magasin+de+bricolage+materiaux+hardware+store/";

export default function MaterielPage() {
  const { language } = useLanguage();
  const { profile } = useProfile();
  const currency = profile?.currency ?? "EUR";
  const { items, loading, error, addItem, deleteItem } = useInventory();
  const { suppliers, loading: suppliersLoading, error: suppliersError, addSupplier, deleteSupplier, refetch: refetchSuppliers } = useSuppliers();

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

  const [deleteSupplierId, setDeleteSupplierId] = useState<string | null>(null);

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
              <Button onClick={() => setAddOpen(true)} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" />
                {t("addArticle", language)}
              </Button>
            </CardHeader>
            <CardContent>
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
                          <td className="py-3 pr-2">{formatCurrency(item.unit_price_ht, currency)}</td>
                          <td className="py-3 pr-2">{item.default_tva_rate} %</td>
                          <td className="py-3 pr-2">{item.stock_quantity}</td>
                          <td className="py-3 pr-2 text-gray-600">
                            {item.supplier_id ? suppliers.find((s) => s.id === item.supplier_id)?.name ?? "—" : "—"}
                          </td>
                          <td className="py-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50"
                              onClick={() => deleteItem(item.id)}
                              aria-label="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
                          <td className="py-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:bg-red-50"
                              onClick={() => setDeleteSupplierId(s.id)}
                              aria-label={t("deleteSupplier", language)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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

      {/* Delete supplier confirm */}
      <Dialog open={!!deleteSupplierId} onOpenChange={(open) => !open && setDeleteSupplierId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteSupplier", language)}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            {language === "fr" ? "Supprimer ce fournisseur de votre liste ?" : "Remove this supplier from your list?"}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSupplierId(null)}>{t("cancel", language)}</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleteSupplierId) {
                  await deleteSupplier(deleteSupplierId);
                  setDeleteSupplierId(null);
                }
              }}
            >
              {t("deleteSupplier", language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
