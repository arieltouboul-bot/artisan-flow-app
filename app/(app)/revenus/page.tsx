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
import { t } from "@/lib/translations";
import { useRevenues } from "@/hooks/use-revenues";
import { useProjects } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { createClient } from "@/lib/supabase/client";
import { formatAmountInCurrency, formatDate, cn, type RevenueCurrency } from "@/lib/utils";
import { Banknote, Loader2 } from "lucide-react";
import { OmniTabSearch } from "@/components/ui/omni-tab-search";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const REV_CURRENCIES: RevenueCurrency[] = ["EUR", "USD", "ILS"];

export default function RevenusPage() {
  const { language } = useLanguage();
  const { rows, loading, error: revenuesError, insertRevenue } = useRevenues();
  const { projects, refetch: refetchProjects } = useProjects();
  const { clients, refetch: refetchClients } = useClients();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [amount, setAmount] = useState("");
  const [revenueCurrency, setRevenueCurrency] = useState<RevenueCurrency>("EUR");
  const [receivedAt, setReceivedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [projectId, setProjectId] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectClientId, setNewProjectClientId] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  const filteredRows = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) => {
      const pn = r.project?.name?.toLowerCase() ?? "";
      const n = (r.description ?? "").toLowerCase();
      return pn.includes(q) || n.includes(q);
    });
  }, [rows, debouncedSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const n = parseFloat(amount.replace(",", "."));
    if (Number.isNaN(n) || n <= 0) {
      setFormError(language === "en" ? "Invalid amount." : "Montant invalide.");
      return;
    }
    if (!projectId) {
      setFormError(language === "en" ? "Select a project." : "Sélectionnez un projet.");
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setSubmitting(true);
    const { error } = await insertRevenue({
      user_id: user.id,
      project_id: projectId,
      amount: n,
      date: receivedAt,
      currency: revenueCurrency,
      description: description.trim() || null,
    });
    setSubmitting(false);
    if (error) setFormError(error);
    else {
      setAmount("");
      setDescription("");
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const supabase = createClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setCreatingProject(true);
    setFormError(null);
    try {
      let cid: string | undefined;
      if (clients.length > 0) {
        if (!newProjectClientId) {
          setFormError(t("revenueModalPickClient", language));
          return;
        }
        cid = newProjectClientId;
      } else {
        if (!newClientName.trim()) {
          setFormError(t("revenueModalPickClient", language));
          return;
        }
        const { data: c, error: ce } = await supabase
          .from("clients")
          .insert({
            user_id: user.id,
            name: newClientName.trim().slice(0, 200),
            contract_amount: 0,
            material_costs: 0,
            amount_collected: 0,
          })
          .select("id")
          .single();
        if (ce || !c) {
          console.error("[revenues] create client:", ce);
          setFormError(ce?.message ?? "Client error");
          return;
        }
        cid = (c as { id: string }).id;
        await refetchClients();
      }
      const { data: p, error: pe } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          client_id: cid!,
          name: newProjectName.trim().slice(0, 200),
          status: "en_preparation",
          address: null,
          contract_amount: 0,
          material_costs: 0,
          amount_collected: 0,
          start_date: new Date().toISOString().slice(0, 10),
          started_at: null,
          ended_at: null,
          notes: null,
        })
        .select("id")
        .single();
      if (pe || !p) {
        console.error("[revenues] create project:", pe);
        setFormError(pe?.message ?? "Project error");
        return;
      }
      await refetchProjects();
      setProjectId((p as { id: string }).id);
      setNewProjectOpen(false);
      setNewProjectName("");
      setNewProjectClientId("");
      setNewClientName("");
    } finally {
      setCreatingProject(false);
    }
  };

  const currencyLabel = (c: RevenueCurrency) => {
    if (c === "EUR") return t("revenueCurrencyOptionEUR", language);
    if (c === "USD") return t("revenueCurrencyOptionUSD", language);
    return t("revenueCurrencyOptionILS", language);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl flex items-center gap-2">
          <Banknote className="h-8 w-8 text-emerald-600" />
          {t("revenues", language)}
        </h1>
        <p className="mt-1 text-gray-500">{t("revenuePageSubtitle", language)}</p>
      </div>

      {revenuesError && (
        <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900 border border-amber-200">
          {revenuesError}
        </div>
      )}

      <OmniTabSearch
        value={search}
        onChange={setSearch}
        placeholder={t("revenueSearchPlaceholder", language)}
        className="max-w-xl"
      />

      <Card className="overflow-visible border-emerald-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t("revenueAddForm", language)}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t("revenueAmountLabel", language)}</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="min-h-[44px]"
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="min-w-[140px]">
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t("revenueCurrencyLabel", language)}</label>
                  <select
                    value={revenueCurrency}
                    onChange={(e) => setRevenueCurrency(e.target.value as RevenueCurrency)}
                    className={cn(
                      "w-full min-h-[44px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    )}
                    disabled={submitting}
                  >
                    {REV_CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {currencyLabel(c)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t("revenueDateLabel", language)}</label>
                <Input
                  type="date"
                  value={receivedAt}
                  onChange={(e) => setReceivedAt(e.target.value)}
                  className="min-h-[44px]"
                  required
                  disabled={submitting}
                />
              </div>
            </div>
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <label className="block text-sm font-medium text-gray-700">{t("revenueProjectLabel", language)}</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setNewProjectOpen(true);
                    setNewProjectName("");
                    setNewProjectClientId(clients[0]?.id ?? "");
                    setNewClientName("");
                  }}
                >
                  {t("revenueNewProjectBtn", language)}
                </Button>
              </div>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={cn(
                  "w-full min-h-[44px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                )}
                disabled={submitting}
              >
                <option value="">{language === "en" ? "— Select —" : "— Choisir —"}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.client?.name ? ` (${p.client.name})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("revenueDescriptionLabel", language)}</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[44px]"
                disabled={submitting}
              />
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <Button type="submit" disabled={submitting} className="min-h-[44px]">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("revenueAddButton", language)}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("revenueListTitle", language)}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500 py-4">{language === "en" ? "Loading…" : "Chargement…"}</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">{t("revenueEmpty", language)}</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {filteredRows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span className="font-medium text-gray-900">{r.project?.name ?? "—"}</span>
                  <span className="text-emerald-700 font-semibold">{formatAmountInCurrency(r.amount, r.currency)}</span>
                  <span className="text-gray-500 w-full sm:w-auto">{formatDate(r.date)}</span>
                  {r.description && <span className="text-gray-600 w-full text-xs">{r.description}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("revenueModalTitle", language)}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("revenueModalProjectName", language)}</label>
              <Input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="min-h-[44px]"
                required
                disabled={creatingProject}
              />
            </div>
            {clients.length > 0 ? (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t("revenueModalClientLabel", language)}</label>
                <select
                  value={newProjectClientId}
                  onChange={(e) => setNewProjectClientId(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  disabled={creatingProject}
                >
                  <option value="">{language === "en" ? "— Select client —" : "— Choisir un client —"}</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t("revenueModalNewClientName", language)}</label>
                <Input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="min-h-[44px]"
                  required
                  disabled={creatingProject}
                />
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setNewProjectOpen(false)} disabled={creatingProject}>
                {t("cancel", language)}
              </Button>
              <Button type="submit" disabled={creatingProject}>
                {creatingProject ? <Loader2 className="h-4 w-4 animate-spin" /> : t("revenueModalSubmit", language)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
