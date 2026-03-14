"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClients } from "@/hooks/use-clients";
import { useProfile } from "@/hooks/use-profile";
import { useLanguage } from "@/context/language-context";
import { formatConvertedCurrency } from "@/lib/utils";
import { t } from "@/lib/translations";
import { getDevisPDFBlob, type DevisPDFData } from "@/components/devis/devis-pdf";
import type { QuoteItem } from "@/types/database";
import { Plus, Trash2, Download } from "lucide-react";

const VAT_OPTIONS = [0, 5.5, 10, 20] as const;

const defaultItem: QuoteItem = {
  description: "",
  quantity: 1,
  unit: "u",
  unit_price_buy: 0,
  unit_price_sell: 0,
  total_buy: 0,
  total_sell: 0,
  margin: 0,
  tva_rate: 20,
};

export default function NouveauDevisPage() {
  const { language } = useLanguage();
  const { profile, displayCurrency } = useProfile();
  const currency = displayCurrency;
  const { clients } = useClients();
  const [clientId, setClientId] = useState("");
  useEffect(() => {
    if (clients.length > 0 && !clientId) setClientId(clients[0].id);
  }, [clients, clientId]);
  const [validUntil, setValidUntil] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [acomptePercentage, setAcomptePercentage] = useState(30);
  const [items, setItems] = useState<QuoteItem[]>([{ ...defaultItem }]);
  const [companyName, setCompanyName] = useState("Mon entreprise");
  const [companyAddress, setCompanyAddress] = useState("123 rue Example, 75000 Paris");
  const [companySiret, setCompanySiret] = useState("123 456 789 00012");

  const updateItem = (index: number, field: keyof QuoteItem, value: number | string | null | undefined) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[index], [field]: value };
      if (field === "quantity" || field === "unit_price_buy" || field === "unit_price_sell") {
        const q = Number(item.quantity) || 0;
        const buy = Number(item.unit_price_buy) || 0;
        const sell = Number(item.unit_price_sell) || 0;
        item.total_buy = q * buy;
        item.total_sell = q * sell;
        item.margin = item.total_sell - item.total_buy;
      }
      if (field === "tva_rate") item.tva_rate = typeof value === "number" ? value : 20;
      next[index] = item;
      return next;
    });
  };

  const totals = useMemo(() => {
    const total_ht = items.reduce((s, i) => s + i.total_sell, 0);
    const total_ttc = items.reduce((s, i) => {
      const rate = i.tva_rate ?? 20;
      return s + i.total_sell * (1 + rate / 100);
    }, 0);
    const total_tva = total_ttc - total_ht;
    const total_buy = items.reduce((s, i) => s + i.total_buy, 0);
    const marge = total_ht - total_buy;
    const tauxMarge = total_ht > 0 ? (marge / total_ht) * 100 : 0;
    return { total_ht, total_ttc, total_tva, total_buy, marge, tauxMarge };
  }, [items]);

  const addLine = () => setItems((prev) => [...prev, { ...defaultItem }]);
  const removeLine = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const handleGeneratePDF = async () => {
    const client = clients.find((c) => c.id === clientId);
    const data: DevisPDFData = {
      companyName,
      companyAddress,
      companySiret,
      clientName: client?.name ?? "Client",
      clientAddress: client?.address ?? "",
      devisNumber: `DEV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
      validUntil: new Date(validUntil).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB"),
      notes: notes.trim() || undefined,
      acomptePercentage,
      items: items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unit: i.unit,
        unit_price_sell: i.unit_price_sell,
        total_sell: i.total_sell,
        lineType: i.lineType ?? undefined,
        tva_rate: i.tva_rate ?? 20,
      })),
      totalHT: totals.total_ht,
      totalTVA: totals.total_tva,
      totalTTC: totals.total_ttc,
      currency,
    };
    const blob = await getDevisPDFBlob(data);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `devis-${data.devisNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
          {t("newQuoteTitle", language)}
        </h1>
        <p className="mt-1 text-gray-500">
          {language === "fr" ? "Créez un devis avec calcul de marge en temps réel" : "Create a quote with real-time margin calculation"}
        </p>
      </div>

      <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
        <CardHeader>
          <CardTitle>{language === "fr" ? "Vos informations" : "Your details"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{language === "fr" ? "Raison sociale" : "Company name"}</label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">SIRET</label>
              <Input value={companySiret} onChange={(e) => setCompanySiret(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-gray-700 mb-1 block">{language === "fr" ? "Adresse" : "Address"}</label>
              <Input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
        <CardHeader>
          <CardTitle>{language === "fr" ? "Client & validité" : "Client & validity"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t("clients", language)}</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="flex h-11 min-h-[44px] w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t("validUntil", language)}</label>
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t("depositPercent", language)}</label>
            <Input
              type="number"
              min={0}
              max={100}
              step={5}
              value={acomptePercentage}
              onChange={(e) => setAcomptePercentage(Number(e.target.value) || 0)}
              className="min-h-[48px] w-full max-w-[120px]"
            />
            <p className="text-xs text-gray-500 mt-1">{t("depositHint", language)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{t("notesObservations", language)}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === "fr" ? "Instructions, conditions particulières, rappels..." : "Instructions, special conditions, reminders..."}
              rows={3}
              className="flex min-h-[80px] w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("quoteLines", language)}</CardTitle>
          <Button onClick={addLine} size="sm" className="min-h-[44px]">
            <Plus className="mr-2 h-4 w-4" />
            {t("addLine", language)}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="pb-2 pr-2">{t("description", language)}</th>
                  <th className="pb-2 pr-2 w-24">{t("type", language)}</th>
                  <th className="pb-2 pr-2 w-20">{t("quantity", language)}</th>
                  <th className="pb-2 pr-2 w-16">{t("unit", language)}</th>
                  <th className="pb-2 pr-2 w-24">{t("vat", language)} %</th>
                  <th className="pb-2 pr-2 w-28">{t("purchasePrice", language)}</th>
                  <th className="pb-2 pr-2 w-28">{t("salePrice", language)}</th>
                  <th className="pb-2 pr-2 w-28">{t("margin", language)}</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 align-top">
                    <td className="py-2 pr-2">
                      <Input
                        placeholder={t("description", language)}
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        className="h-10"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        value={item.lineType ?? ""}
                        onChange={(e) => updateItem(index, "lineType", e.target.value === "material" ? "material" : e.target.value === "pose" ? "pose" : undefined)}
                        className="h-10 w-full rounded-md border border-gray-200 bg-white px-2 text-sm"
                      >
                        <option value="">—</option>
                        <option value="material">{t("materialType", language)}</option>
                        <option value="pose">{t("laborType", language)}</option>
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity || ""}
                        onChange={(e) => updateItem(index, "quantity", Number(e.target.value) || 0)}
                        className="h-10"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        placeholder="u"
                        value={item.unit}
                        onChange={(e) => updateItem(index, "unit", e.target.value)}
                        className="h-10 w-16"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <select
                        value={item.tva_rate ?? 20}
                        onChange={(e) => updateItem(index, "tva_rate", Number(e.target.value) as typeof VAT_OPTIONS[number])}
                        className="h-10 w-full rounded-md border border-gray-200 bg-white px-2 text-sm"
                      >
                        {VAT_OPTIONS.map((v) => (
                          <option key={v} value={v}>{v} %</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unit_price_buy || ""}
                        onChange={(e) => updateItem(index, "unit_price_buy", Number(e.target.value) || 0)}
                        className="h-10"
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={item.unit_price_sell || ""}
                        onChange={(e) => updateItem(index, "unit_price_sell", Number(e.target.value) || 0)}
                        className="h-10"
                      />
                    </td>
                    <td className="py-2 pr-2 font-medium text-emerald-600">
                      {formatConvertedCurrency(item.margin, currency)}
                    </td>
                    <td className="py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLine(index)}
                        disabled={items.length === 1}
                        className="min-h-[44px] min-w-[44px] text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-col items-end gap-2 rounded-lg bg-brand-blue-50/50 p-4">
            <div className="flex justify-end gap-8 text-sm">
              <span className="text-gray-600">{t("totalHT", language)}</span>
              <span className="font-bold">{formatConvertedCurrency(totals.total_ht, currency)}</span>
            </div>
            <div className="flex justify-end gap-8 text-sm">
              <span className="text-gray-600">{t("totalMargin", language)}</span>
              <span className="font-bold text-emerald-600">{formatConvertedCurrency(totals.marge, currency)}</span>
            </div>
            <div className="flex justify-end gap-8 text-sm">
              <span className="text-gray-600">{t("marginRate", language)}</span>
              <span className="font-bold text-brand-blue-600">{totals.tauxMarge.toFixed(1)} %</span>
            </div>
            <div className="flex justify-end gap-8 text-base border-t border-brand-blue-200 pt-2 mt-2">
              <span className="text-gray-700">{t("totalTTC", language)}</span>
              <span className="font-bold text-gray-900">{formatConvertedCurrency(totals.total_ttc, currency)}</span>
            </div>
          </div>

          <Button onClick={handleGeneratePDF} className="mt-6 min-h-[48px] w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            {t("downloadPDF", language)}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
