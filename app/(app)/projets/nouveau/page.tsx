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
import { t } from "@/lib/translations";
import { createClient } from "@/lib/supabase/client";
import type { ProjectStatus } from "@/types/database";
import { ArrowLeft, Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

function NouveauProjetPageContent() {
  const router = useRouter();
  const { language } = useLanguage();
  const projectStatusLabel = (s: ProjectStatus) => {
    if (s === "en_preparation") return t("statusInPreparation", language);
    if (s === "en_cours") return t("statusInProgress", language);
    if (s === "urgent_retard") return t("statusUrgentLate", language);
    if (s === "termine") return t("statusCompleted", language);
    if (s === "annule") return t("statusCancelled", language);
    return t("statusInPreparation", language);
  };
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
      setError(t("projectValidationNameRequired", language));
      return;
    }
    if (!clientId) {
      setError(t("projectValidationClientRequired", language));
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setError(t("errorSupabaseUnavailable", language));
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError(t("errorMustSignIn", language));
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
      setError(t("saveErrorGeneric", language));
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
      setError(t("saveErrorGeneric", language));
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t("newProject", language)}</h1>
          <p className="text-gray-500">{t("newProjectSubtitle", language)}</p>
        </div>
      </div>

      <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
        <CardHeader>
          <CardTitle>{t("projectInformationCardTitle", language)}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t("clientFieldLabel", language)} *</label>
              <div className="mb-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setNewClientOpen((v) => !v)}>
                  + {t("newClient", language)}
                </Button>
              </div>
              {newClientOpen && (
                <div className="mb-2 flex items-center gap-2">
                  <Input
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder={t("clientNamePlaceholderShort", language)}
                    className="min-h-[44px]"
                  />
                  <Button type="button" onClick={handleCreateClientInline} disabled={newClientSaving}>
                    {newClientSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("createShort", language)}
                  </Button>
                </div>
              )}
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full min-h-[48px] rounded-lg border border-gray-200 px-3 py-2"
                required
              >
                <option value="">{t("selectClientPlaceholder", language)}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t("projectName", language)} *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("projectNameExampleShort", language)}
                className="min-h-[48px]"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("startDate", language)}</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="min-h-[48px]" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("projectPlannedEndDate", language)}</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="min-h-[48px]" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t("projectStatusLabel", language)}</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full min-h-[48px] rounded-lg border border-gray-200 px-3 py-2"
              >
                {(
                  ["en_preparation", "en_cours", "urgent_retard", "termine", "annule"] as ProjectStatus[]
                ).map((s) => (
                  <option key={s} value={s}>
                    {projectStatusLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{t("notesFieldLabel", language)}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder={t("projectNotesPlaceholder", language)}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={submitLoading || clientsLoading}>
                {submitLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t("createProjectSubmit", language)}
              </Button>
              <Link href="/projets">
                <Button type="button" variant="outline">{t("cancel", language)}</Button>
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
