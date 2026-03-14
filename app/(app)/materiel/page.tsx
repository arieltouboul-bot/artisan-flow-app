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
import { t } from "@/lib/translations";
import { formatCurrency } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import { Package, Plus, Trash2, Loader2, Truck, Calendar } from "lucide-react";

const VAT_OPTIONS = [0, 5.5, 10, 20];

export default function MaterielPage() {
  const { language } = useLanguage();
  const { profile } = useProfile();
  const currency = profile?.currency ?? "EUR";
  const { items, loading, error, addItem, deleteItem } = useInventory();
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addStock, setAddStock] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addTva, setAddTva] = useState(20);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

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
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid min-h-[48px] p-1">
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
                <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 mb-4">
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-brand-blue-500" />
                {t("suppliers", language)}
              </CardTitle>
              <p className="text-sm text-gray-500">{t("suppliersDesc", language)}</p>
            </CardHeader>
            <CardContent>
              <p className="py-8 text-center text-gray-500">{t("noSuppliers", language)}</p>
              <p className="text-center text-xs text-gray-400">
                {language === "fr" ? "Table fournisseurs à créer dans Supabase pour activer cette section." : "Suppliers table to be created in Supabase to enable this section."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("unitPriceHT", language)}</label>
                <Input type="number" step="0.01" min="0" value={addPrice} onChange={(e) => setAddPrice(e.target.value)} className="min-h-[44px]" required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("defaultVAT", language)} %</label>
                <select value={addTva} onChange={(e) => setAddTva(Number(e.target.value))} className="w-full min-h-[44px] rounded-lg border border-gray-200 px-3 py-2">
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
    </motion.div>
  );
}
