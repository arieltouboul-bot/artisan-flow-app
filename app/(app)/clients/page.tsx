"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OmniTabSearch } from "@/components/ui/omni-tab-search";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useClients } from "@/hooks/use-clients";
import { useProfile } from "@/hooks/use-profile";
import { useLanguage } from "@/context/language-context";
import { useAssistant } from "@/context/assistant-context";
import { t } from "@/lib/translations";
import { createClient } from "@/lib/supabase/client";
import type { Client } from "@/types/database";
import { clientMargeBrute, clientRestantDu } from "@/types/database";
import { formatConvertedCurrency, cn, type Currency } from "@/lib/utils";
import Link from "next/link";
import { User, Mail, Phone, MapPin, ExternalLink, UserPlus, Loader2 } from "lucide-react";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { SwipeActionsRow } from "@/components/ui/swipe-actions-row";
import { useIsMobile } from "@/hooks/use-is-mobile";

export const dynamic = "force-dynamic";

function buildMapsUrl(address: string | null): string | null {
  if (!address || !address.trim()) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function parseNum(value: string): number | null {
  const n = parseFloat(value.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

function ClientsPageContent() {
  const { setPageContext } = useAssistant();
  useEffect(() => {
    setPageContext({ activeSection: "clients" });
    return () => setPageContext({});
  }, [setPageContext]);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [addOpen, setAddOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formContract, setFormContract] = useState("");
  const [formCosts, setFormCosts] = useState("");
  const [formCollected, setFormCollected] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editContract, setEditContract] = useState("");
  const [editCosts, setEditCosts] = useState("");
  const [editCollected, setEditCollected] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const router = useRouter();
  const isMobile = useIsMobile();
  const { clients, loading, error, refetch, updateClient } = useClients();
  const { displayCurrency } = useProfile();
  const { language } = useLanguage();
  const currency = displayCurrency;

  const openEdit = (c: Client) => {
    setEditId(c.id);
    setEditName(c.name);
    setEditEmail(c.email ?? "");
    setEditPhone(c.phone ?? "");
    setEditAddress(c.address ?? "");
    setEditContract(String(c.contract_amount ?? 0));
    setEditCosts(String(c.material_costs ?? 0));
    setEditCollected(String(c.amount_collected ?? 0));
    setEditError(null);
  };

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q) ?? false) ||
        (c.phone?.includes(q) ?? false) ||
        (c.address?.toLowerCase().includes(q) ?? false)
    );
  }, [clients, debouncedSearch]);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!formName.trim()) {
      setSubmitError("Le nom est obligatoire.");
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setSubmitError("Supabase non configuré.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSubmitError("Vous devez être connecté.");
      return;
    }
    setSubmitLoading(true);
    const { error: insertError } = await supabase.from("clients").insert({
      user_id: user.id,
      name: formName.trim(),
      email: formEmail.trim() || null,
      phone: formPhone.trim() || null,
      address: formAddress.trim() || null,
      contract_amount: parseNum(formContract) ?? 0,
      material_costs: parseNum(formCosts) ?? 0,
      amount_collected: parseNum(formCollected) ?? 0,
    });
    setSubmitLoading(false);
    if (insertError) {
      setSubmitError(insertError.message);
      return;
    }
    setAddOpen(false);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormAddress("");
    setFormContract("");
    setFormCosts("");
    setFormCollected("");
    refetch();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteClientConfirm", language))) return;
    setDeletingId(id);
    const supabase = createClient();
    if (!supabase) { setDeletingId(null); return; }
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) { setDeletingId(null); alert(error.message); }
    else { setDeletingId(null); await refetch(); }
  };

  const margeBruteForm = (() => {
    const c = parseNum(formContract) ?? 0;
    const costs = parseNum(formCosts) ?? 0;
    return c - costs;
  })();
  const restantDuForm = (() => {
    const c = parseNum(formContract) ?? 0;
    const coll = parseNum(formCollected) ?? 0;
    return Math.max(0, c - coll);
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Clients
          </h1>
          <p className="mt-1 text-gray-500">
            CRM et suivi financier par client
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="shrink-0">
          <UserPlus className="h-5 w-5 mr-2" />
          Ajouter un client
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <OmniTabSearch
        value={search}
        onChange={setSearch}
        placeholder={t("omniSearchClients", language)}
        className="max-w-xl"
      />

      <Card className="overflow-visible transition-shadow hover:shadow-brand-glow">
        <CardContent className="p-0 pt-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-12 w-12 mb-2 animate-spin opacity-50" />
              <p>Chargement des clients...</p>
            </div>
          ) : (
            <>
              {isMobile ? (
                <div className="divide-y divide-gray-100 px-2 pb-2">
                  <AnimatePresence mode="popLayout">
                    {filtered.map((client, i) => {
                      const restant = clientRestantDu(client);
                      return (
                        <motion.div
                          key={client.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ delay: i * 0.02 }}
                        >
                          <SwipeActionsRow
                            onEdit={() => openEdit(client)}
                            onDelete={() => handleDelete(client.id)}
                            disabled={deletingId === client.id}
                            editLabel={t("edit", language)}
                            deleteLabel={t("delete", language)}
                            className={cn(deletingId === client.id && "opacity-60 pointer-events-none")}
                          >
                            <div className="flex flex-row items-start justify-between gap-3 px-3 py-4">
                              <button
                                type="button"
                                className="flex min-w-0 flex-1 flex-col text-left"
                                onClick={() => router.push(`/clients/${client.id}`)}
                              >
                                <span className="flex items-center gap-2 font-semibold text-gray-900">
                                  <User className="h-4 w-4 shrink-0 text-brand-blue-500" />
                                  {client.name}
                                </span>
                                <span className="mt-1 text-xs text-gray-500 line-clamp-2">{client.phone ?? "—"} · {client.email ?? "—"}</span>
                                <div className="mt-2 flex flex-wrap gap-3 text-xs tabular-nums">
                                  <span className="text-gray-600">{t("contractAmount", language)}: {formatConvertedCurrency(client.contract_amount ?? 0, currency)}</span>
                                  <span className={restant > 0 ? "text-red-600" : "text-emerald-600"}>
                                    {t("projectRemainingBalanceLabel", language)}: {formatConvertedCurrency(restant, currency)}
                                  </span>
                                </div>
                              </button>
                              <Link
                                href={`/projets/nouveau?clientId=${client.id}`}
                                className="shrink-0 rounded-md border border-brand-blue-200 bg-white px-2 py-1 text-xs font-medium text-brand-blue-700 hover:bg-brand-blue-50"
                              >
                                {t("createProjectForClient", language)}
                              </Link>
                            </div>
                          </SwipeActionsRow>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
              <div className="overflow-x-auto overflow-y-visible">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[160px]">Nom</TableHead>
                      <TableHead className="min-w-[120px]">Téléphone</TableHead>
                      <TableHead className="min-w-[180px]">Email</TableHead>
                      <TableHead className="min-w-[200px]">Adresse</TableHead>
                      <TableHead className="min-w-[100px] text-right">Contrat</TableHead>
                      <TableHead className="min-w-[100px] text-right">Marge</TableHead>
                      <TableHead className="min-w-[100px] text-right">Restant dû</TableHead>
                      <TableHead className="w-[80px]">Carte</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence mode="popLayout">
                      {filtered.map((client) => (
                        <ClientRow
                          key={client.id}
                          client={client}
                          onEdit={() => openEdit(client)}
                          onDelete={() => handleDelete(client.id)}
                          currency={currency}
                          openMenuId={openMenuId}
                          setOpenMenuId={setOpenMenuId}
                          isDeleting={deletingId === client.id}
                        />
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
              )}
              {filtered.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-gray-500"
                >
                  <User className="h-12 w-12 mb-2 opacity-50" />
                  <p>Aucun client trouvé</p>
                </motion.div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog Ajouter */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un client</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddClient} className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-700 mb-1 block">
                Nom *
              </label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Jean Dupont"
                className="min-h-[48px]"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="text-sm font-medium text-gray-700 mb-1 block">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="jean@exemple.fr"
                className="min-h-[48px]"
              />
            </div>
            <div>
              <label htmlFor="phone" className="text-sm font-medium text-gray-700 mb-1 block">
                Téléphone
              </label>
              <Input
                id="phone"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="06 12 34 56 78"
                className="min-h-[48px]"
              />
            </div>
            <div>
              <label htmlFor="address" className="text-sm font-medium text-gray-700 mb-1 block">
                Adresse
              </label>
              <Input
                id="address"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                placeholder="12 rue de la Paix, 75001 Paris"
                className="min-h-[48px]"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="contract" className="text-sm font-medium text-gray-700 mb-1 block">
                  Montant du contrat (€)
                </label>
                <Input
                  id="contract"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formContract}
                  onChange={(e) => setFormContract(e.target.value)}
                  placeholder="0"
                  className="min-h-[48px]"
                />
              </div>
              <div>
                <label htmlFor="costs" className="text-sm font-medium text-gray-700 mb-1 block">
                  Coût des matériaux (€)
                </label>
                <Input
                  id="costs"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formCosts}
                  onChange={(e) => setFormCosts(e.target.value)}
                  placeholder="0"
                  className="min-h-[48px]"
                />
              </div>
              <div>
                <label htmlFor="collected" className="text-sm font-medium text-gray-700 mb-1 block">
                  Montant déjà encaissé (€)
                </label>
                <Input
                  id="collected"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formCollected}
                  onChange={(e) => setFormCollected(e.target.value)}
                  placeholder="0"
                  className="min-h-[48px]"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 rounded-lg bg-gray-50 p-3 text-sm">
              <span>
                <strong>Marge brute :</strong>{" "}
                <span className={margeBruteForm >= 0 ? "text-emerald-600" : "text-red-600"}>
                  {formatConvertedCurrency(margeBruteForm, currency)}
                </span>
              </span>
              <span>
                <strong>Restant dû :</strong>{" "}
                <span className={restantDuForm > 0 ? "text-red-600" : "text-emerald-600"}>
                  {formatConvertedCurrency(restantDuForm, currency)}
                </span>
              </span>
            </div>
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitLoading}>
                {submitLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Éditer client */}
      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("edit", language)} — {clients.find((c) => c.id === editId)?.name}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editId) return;
              setEditError(null);
              setEditLoading(true);
              const err = await updateClient(editId, {
                name: editName.trim(),
                email: editEmail.trim() || null,
                phone: editPhone.trim() || null,
                address: editAddress.trim() || null,
                contract_amount: parseNum(editContract) ?? 0,
                material_costs: parseNum(editCosts) ?? 0,
                amount_collected: parseNum(editCollected) ?? 0,
              });
              setEditLoading(false);
              if (err?.error) {
                console.error("Clients updateClient failed:", err.error);
                setEditError(err.error);
              } else setEditId(null);
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t("name", language)}</label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="min-h-[44px]" required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t("emailLabel", language)}</label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="min-h-[44px]" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t("phone", language)}</label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="min-h-[44px]" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t("address", language)}</label>
              <Input value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="min-h-[44px]" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Contrat</label>
                <Input value={editContract} onChange={(e) => setEditContract(e.target.value)} className="min-h-[44px]" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Coûts mat.</label>
                <Input value={editCosts} onChange={(e) => setEditCosts(e.target.value)} className="min-h-[44px]" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Encaissé</label>
                <Input value={editCollected} onChange={(e) => setEditCollected(e.target.value)} className="min-h-[44px]" />
              </div>
            </div>
            {editError && <p className="text-sm text-red-600">{editError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditId(null)} disabled={editLoading}>{t("cancel", language)}</Button>
              <Button type="submit" disabled={editLoading}>{editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save", language)}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}

export default function ClientsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-12 w-full max-w-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      }
    >
      <ClientsPageContent />
    </Suspense>
  );
}

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
  show: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 8 },
};

function ClientRow({
  client,
  onEdit,
  onDelete,
  currency,
  openMenuId,
  setOpenMenuId,
  isDeleting = false,
}: {
  client: Client;
  onEdit: () => void;
  onDelete: () => void;
  currency: Currency;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  isDeleting?: boolean;
}) {
  const { language } = useLanguage();
  const mapsUrl = buildMapsUrl(client.address);
  const marge = clientMargeBrute(client);
  const restant = clientRestantDu(client);
  const isSoldé = restant <= 0 && (client.contract_amount ?? 0) > 0;
  const hasImpayé = restant > 0;

  return (
    <motion.tr
      layout
      variants={rowVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      className={cn("border-b border-gray-100 hover:bg-brand-blue-50/50 transition-colors", isDeleting && "opacity-60 pointer-events-none")}
    >
      <TableCell>
        <Link href={`/clients/${client.id}`} className="flex items-center gap-2 font-medium text-gray-900 hover:text-brand-blue-600">
          <User className="h-4 w-4 text-brand-blue-500 shrink-0" />
          {client.name}
        </Link>
      </TableCell>
      <TableCell>
        {client.phone ? (
          <a
            href={`tel:${client.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-2 text-brand-blue-600 hover:underline min-h-[44px] min-w-[44px] inline-flex"
          >
            <Phone className="h-4 w-4" />
            {client.phone}
          </a>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell>
        {client.email ? (
          <a
            href={`mailto:${client.email}`}
            className="flex items-center gap-2 text-brand-blue-600 hover:underline"
          >
            <Mail className="h-4 w-4" />
            {client.email}
          </a>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell>
        {client.address ? (
          <span className="flex items-center gap-2 text-gray-700">
            <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
            {client.address}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {formatConvertedCurrency(client.contract_amount ?? 0, currency)}
      </TableCell>
      <TableCell className={`text-right tabular-nums ${marge >= 0 ? "text-emerald-600" : "text-red-600"}`}>
        {formatConvertedCurrency(marge, currency)}
      </TableCell>
      <TableCell
        className={`text-right tabular-nums font-medium ${
          hasImpayé ? "text-red-600" : isSoldé ? "text-emerald-600" : "text-gray-700"
        }`}
      >
        {formatConvertedCurrency(restant, currency)}
      </TableCell>
      <TableCell>
        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-brand-blue-600 hover:bg-brand-blue-50"
            aria-label="Voir sur Google Maps"
          >
            <ExternalLink className="h-5 w-5" />
          </a>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </TableCell>
      <TableCell className="overflow-visible">
        <div className="flex items-center gap-2">
          <Link
            href={`/projets/nouveau?clientId=${client.id}`}
            className="rounded-md border border-brand-blue-200 bg-white px-2 py-1 text-xs font-medium text-brand-blue-700 hover:bg-brand-blue-50"
          >
            {t("createProjectForClient", language)}
          </Link>
          <RowActionsMenu
            isOpen={openMenuId === client.id}
            onOpenChange={(open) => setOpenMenuId(open ? client.id : null)}
            onEdit={onEdit}
            onDelete={onDelete}
            isDeleting={isDeleting}
          />
        </div>
      </TableCell>
    </motion.tr>
  );
}
