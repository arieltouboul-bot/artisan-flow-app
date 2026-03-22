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
import { useRevenues, type RevenueRow } from "@/hooks/use-revenues";
import { useProjects } from "@/hooks/use-projects";
import { useClients } from "@/hooks/use-clients";
import { createClient } from "@/lib/supabase/client";
import {
  amountInCurrencyToEur,
  formatAmountInCurrency,
  formatDate,
  getCurrencySymbol,
  cn,
  type RevenueCurrency,
} from "@/lib/utils";
import { Banknote, Loader2 } from "lucide-react";
import { SwipeActionsRow } from "@/components/ui/swipe-actions-row";
import { Skeleton } from "@/components/ui/skeleton";
import { OmniTabSearch } from "@/components/ui/omni-tab-search";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { RevenueFinanceHeader } from "@/components/revenues/revenue-finance-header";

const REV_CURRENCIES: RevenueCurrency[] = ["EUR", "USD", "ILS"];

type PayStatus = "paid" | "partial" | "pending" | "na" | "overpaid";

const PAY_STATUS_CLASS: Record<PayStatus, string> = {
  paid: "bg-emerald-100 text-emerald-800",
  partial: "bg-amber-100 text-amber-900",
  pending: "bg-slate-100 text-slate-700",
  na: "bg-slate-100 text-slate-500",
  overpaid: "bg-sky-100 text-sky-900",
};

const PAY_STATUS_TKEY: Record<PayStatus, string> = {
  paid: "revenuePaymentStatusPaid",
  partial: "revenuePaymentStatusPartial",
  pending: "revenuePaymentStatusPending",
  na: "revenuePaymentStatusNa",
  overpaid: "revenuePaymentStatusOverpaid",
};

export default function RevenusPage() {
  const { language } = useLanguage();
  const { rows, loading, error: revenuesError, insertRevenue, updateRevenue, deleteRevenue } = useRevenues();
  const { projects, refetch: refetchProjects } = useProjects();
  const { clients, refetch: refetchClients } = useClients();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);

  const [amount, setAmount] = useState("");
  const [revenueCurrency, setRevenueCurrency] = useState<RevenueCurrency>("EUR");
  const [receivedAt, setReceivedAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [projectId, setProjectId] = useState("");
  const [revenueNotes, setRevenueNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectClientId, setNewProjectClientId] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<RevenueRow | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCurrency, setEditCurrency] = useState<RevenueCurrency>("EUR");
  const [editDate, setEditDate] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((r) => {
      const pn = r.project?.name?.toLowerCase() ?? "";
      const n = (r.notes ?? "").toLowerCase();
      return pn.includes(q) || n.includes(q);
    });
  }, [rows, debouncedSearch]);

  const paidEurByProject = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const eur = amountInCurrencyToEur(r.amount, r.currency);
      m.set(r.project_id, (m.get(r.project_id) ?? 0) + eur);
    }
    return m;
  }, [rows]);

  const paymentStatus = (pid: string): PayStatus => {
    const p = projects.find((x) => x.id === pid);
    const contract = Number(p?.contract_amount ?? 0);
    const paid = paidEurByProject.get(pid) ?? 0;
    if (contract <= 0) return "na";
    if (paid > contract + 0.5) return "overpaid";
    if (paid >= contract - 0.5) return "paid";
    if (paid > 0.02) return "partial";
    return "pending";
  };

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
      notes: revenueNotes.trim() || null,
    });
    setSubmitting(false);
    if (error) setFormError(error);
    else {
      setAmount("");
      setRevenueNotes("");
      await refetchProjects();
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

  const openEdit = (r: RevenueRow) => {
    setEditRow(r);
    setEditAmount(String(r.amount));
    setEditCurrency(r.currency);
    setEditDate(r.date.slice(0, 10));
    setEditProjectId(r.project_id);
    setEditNotes(r.notes ?? "");
    setEditError(null);
    setEditOpen(true);
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRow) return;
    setEditError(null);
    const n = parseFloat(editAmount.replace(",", "."));
    if (Number.isNaN(n) || n <= 0) {
      setEditError(language === "en" ? "Invalid amount." : "Montant invalide.");
      return;
    }
    if (!editProjectId) {
      setEditError(language === "en" ? "Select a project." : "Sélectionnez un projet.");
      return;
    }
    setEditSaving(true);
    const { error } = await updateRevenue(editRow.id, {
      project_id: editProjectId,
      amount: n,
      date: editDate,
      currency: editCurrency,
      notes: editNotes.trim() || null,
    });
    setEditSaving(false);
    if (error) setEditError(error);
    else {
      setEditOpen(false);
      setEditRow(null);
      await refetchProjects();
    }
  };

  const handleDelete = async (r: RevenueRow) => {
    if (!window.confirm(t("revenueDeleteConfirm", language))) return;
    await deleteRevenue(r.id);
    await refetchProjects();
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

      <RevenueFinanceHeader />

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
              <label className="mb-1 block text-sm font-medium text-gray-700">{t("revenueNotesLabel", language)}</label>
              <Input
                value={revenueNotes}
                onChange={(e) => setRevenueNotes(e.target.value)}
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
          <CardTitle className="text-lg">{t("revenueTrackerTitle", language)}</CardTitle>
          <p className="text-sm text-gray-500 font-normal">{t("revenueTrackerHint", language)}</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
              ))}
            </div>
          ) : filteredRows.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">{t("revenueEmpty", language)}</p>
          ) : (
            <ul className="space-y-2">
              {filteredRows.map((r) => {
                const st = paymentStatus(r.project_id);
                return (
                <li key={r.id}>
                  <SwipeActionsRow
                    onEdit={() => openEdit(r)}
                    onDelete={() => void handleDelete(r)}
                    editLabel={t("revenueSwipeEdit", language)}
                    deleteLabel={t("revenueSwipeDelete", language)}
                  >
                    <div className="flex flex-wrap items-center gap-2 py-3 text-sm min-h-[56px]">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-gray-900 block">{r.project?.name ?? "—"}</span>
                        <span className="text-gray-500 text-xs">{formatDate(r.date)}</span>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="flex items-center gap-1.5 text-emerald-700 font-semibold tabular-nums">
                          <span className="text-gray-500 text-base leading-none" aria-hidden>
                            {getCurrencySymbol(r.currency)}
                          </span>
                          {formatAmountInCurrency(r.amount, r.currency)}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            PAY_STATUS_CLASS[st]
                          )}
                        >
                          {t(PAY_STATUS_TKEY[st], language)}
                        </span>
                      </div>
                      {r.notes && <span className="text-gray-600 w-full text-xs basis-full">{r.notes}</span>}
                    </div>
                  </SwipeActionsRow>
                </li>
              );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("revenueEditTitle", language)}</DialogTitle>
          </DialogHeader>
          {editRow && (
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">{t("revenueAmountLabel", language)}</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      className="min-h-[44px]"
                      required
                      disabled={editSaving}
                    />
                  </div>
                  <div className="min-w-[140px]">
                    <label className="mb-1 block text-sm font-medium text-gray-700">{t("revenueCurrencyLabel", language)}</label>
                    <select
                      value={editCurrency}
                      onChange={(e) => setEditCurrency(e.target.value as RevenueCurrency)}
                      className={cn("w-full min-h-[44px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm")}
                      disabled={editSaving}
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
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="min-h-[44px]"
                    required
                    disabled={editSaving}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t("revenueProjectLabel", language)}</label>
                <select
                  value={editProjectId}
                  onChange={(e) => setEditProjectId(e.target.value)}
                  className={cn("w-full min-h-[44px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm")}
                  disabled={editSaving}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.client?.name ? ` (${p.client.name})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t("revenueNotesLabel", language)}</label>
                <Input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="min-h-[44px]" disabled={editSaving} />
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={editSaving}>
                  {t("cancel", language)}
                </Button>
                <Button type="submit" disabled={editSaving}>
                  {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save", language)}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
