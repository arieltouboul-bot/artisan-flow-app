"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useClients } from "@/hooks/use-clients";
import { useLanguage } from "@/context/language-context";
import { createClient } from "@/lib/supabase/client";
import type { ProjectStatus } from "@/types/database";
import { ArrowLeft, Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

const statusLabels: Record<ProjectStatus, string> = {
  en_preparation: "En préparation",
  en_cours: "En cours",
  urgent_retard: "Urgent / Retard",
  termine: "Terminé",
};

function NouveauProjetPageContent() {
  const router = useRouter();
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const { clients, loading: clientsLoading, refetch: refetchClients } = useClients();
  const [clientId, setClientId] = useState(searchParams.get("clientId") ?? "");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("en_preparation");
  const [notes, setNotes] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientSaving, setNewClientSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Le nom du projet est obligatoire.");
      return;
    }
    if (!clientId) {
      setError("Veuillez sélectionner un client.");
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase non configuré.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Vous devez être connecté.");
      return;
    }
    setSubmitLoading(true);
    const payload = {
      user_id: user.id,
      client_id: clientId,
      name: name.trim(),
      status,
      address: null,
      start_date: startDate && startDate.trim() ? startDate.trim() : null,
      end_date: endDate && endDate.trim() ? endDate.trim() : null,
      started_at: startDate && startDate.trim() ? `${startDate.trim()}T00:00:00.000Z` : null,
      ended_at: endDate && endDate.trim() ? `${endDate.trim()}T00:00:00.000Z` : null,
      notes: notes.trim() || null,
      contract_amount: 0,
      material_costs: 0,
      amount_collected: 0,
    };
    const { data, error: insertError } = await supabase
      .from("projects")
      .insert(payload)
      .select("id")
      .single();
    setSubmitLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    if (data?.id) router.push(`/projets/${data.id}`);
  };

  const handleCreateClientInline = async () => {
    if (!newClientName.trim()) return;
    const supabase = createClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setNewClientSaving(true);
    const { data, error: insertError } = await supabase
      .from("clients")
      .insert({
        user_id: user.id,
        name: newClientName.trim(),
        contract_amount: 0,
        material_costs: 0,
        amount_collected: 0,
      })
      .select("id")
      .single();
    setNewClientSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setNewClientOpen(false);
    setNewClientName("");
    await refetchClients();
    if (data?.id) setClientId(data.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <Link href="/projets">
          <Button variant="ghost" size="icon" className="min-h-[48px] min-w-[48px]">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Nouveau projet</h1>
          <p className="text-gray-500">Créez un chantier et associez-le à un client</p>
        </div>
      </div>

      <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
        <CardHeader>
          <CardTitle>Informations du projet</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Client *</label>
              <div className="mb-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setNewClientOpen((v) => !v)}>
                  + {language === "fr" ? "Nouveau Client" : "New Client"}
                </Button>
              </div>
              {newClientOpen && (
                <div className="mb-2 flex items-center gap-2">
                  <Input
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder={language === "fr" ? "Nom du client" : "Client name"}
                    className="min-h-[44px]"
                  />
                  <Button type="button" onClick={handleCreateClientInline} disabled={newClientSaving}>
                    {newClientSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : language === "fr" ? "Créer" : "Create"}
                  </Button>
                </div>
              )}
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full min-h-[48px] rounded-lg border border-gray-200 px-3 py-2"
                required
              >
                <option value="">Sélectionner un client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Nom du projet *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Rénovation cuisine"
                className="min-h-[48px]"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Date de début</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="min-h-[48px]" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Date de fin prévue</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="min-h-[48px]" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Statut</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full min-h-[48px] rounded-lg border border-gray-200 px-3 py-2"
              >
                {(Object.keys(statusLabels) as ProjectStatus[]).map((s) => (
                  <option key={s} value={s}>{statusLabels[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Instructions, codes d'accès..."
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitLoading || clientsLoading}>
                {submitLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Créer le projet
              </Button>
              <Link href="/projets">
                <Button type="button" variant="outline">Annuler</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function NouveauProjetPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      }
    >
      <NouveauProjetPageContent />
    </Suspense>
  );
}
