"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { t } from "@/lib/translations";
import { createClient } from "@/lib/supabase/client";
import type { Client } from "@/types/database";
import { clientMargeBrute, clientRestantDu } from "@/types/database";
import { formatConvertedCurrency, type Currency } from "@/lib/utils";
import Link from "next/link";
import {
  Search,
  User,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  UserPlus,
  Loader2,
  Trash2,
  Pencil,
} from "lucide-react";

function buildMapsUrl(address: string | null): string | null {
  if (!address || !address.trim()) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function parseNum(value: string): number | null {
  const n = parseFloat(value.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

export default function ClientsPage() {
  const [search, setSearch] = useState("");
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

  const { clients, loading, error, refetch, updateClient } = useClients();
  const { displayCurrency } = useProfile();
  const { language } = useLanguage();
  const currency = displayCurrency;

  const openEdit = (c: Client) => {
    alert("Ouverture de l'édition");
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

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.includes(q) ?? false) ||
      (c.address?.toLowerCase().includes(q) ?? false)
    );
  });

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
    if (!confirm("Supprimer?")) return;
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) alert("Erreur: " + error.message);
    else location.reload();
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

      <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
        <CardHeader>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Rechercher par nom, email, tél, adresse..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 min-h-[48px]"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-12 w-12 mb-2 animate-spin opacity-50" />
              <p>Chargement des clients...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
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
                        />
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
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
}: {
  client: Client;
  onEdit: () => void;
  onDelete: () => void;
  currency: Currency;
}) {
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
      className="border-b border-gray-100 hover:bg-brand-blue-50/50 transition-colors"
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
      <TableCell>
        <div className="flex gap-1">
          <button type="button" className="z-50 p-2 bg-blue-600 text-white rounded cursor-pointer text-sm" onClick={onEdit}>Modifier</button>
          <button type="button" className="z-50 p-2 bg-red-600 text-white rounded cursor-pointer text-sm" onClick={onDelete}>Supprimer</button>
        </div>
      </TableCell>
    </motion.tr>
  );
}
