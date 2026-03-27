"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
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
import { Badge } from "@/components/ui/badge";
import { useClients } from "@/hooks/use-clients";
import { useProjects } from "@/hooks/use-projects";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import type { ProjectStatus } from "@/types/database";
import { formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  FolderKanban,
  UserPlus,
  Loader2,
  ChevronRight,
  User,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

const statusLabels: Record<ProjectStatus, string> = {
  en_preparation: "En préparation",
  en_cours: "En cours",
  urgent_retard: "Urgent / Retard",
  termine: "Terminé",
  annule: "Annulé",
};

const statusVariant: Record<ProjectStatus, "gray" | "default" | "destructive" | "success"> = {
  en_preparation: "gray",
  en_cours: "default",
  urgent_retard: "destructive",
  termine: "success",
  annule: "gray",
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;
  const { language } = useLanguage();
  const { clients, loading: clientsLoading } = useClients();
  const { projects, loading: projectsLoading, refetch: refetchProjects } = useProjects(clientId);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formStatus, setFormStatus] = useState<ProjectStatus>("en_preparation");
  const [formNotes, setFormNotes] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const client = clients.find((c) => c.id === clientId);
  const loading = clientsLoading || projectsLoading;

  const handleNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!formName.trim()) {
      setSubmitError("Le nom du projet est obligatoire.");
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
      setSubmitLoading(false);
      return;
    }
    setSubmitLoading(true);
    const payload = {
      user_id: user.id,
      name: formName.trim(),
      client_id: clientId,
      status: formStatus,
      address: null,
      start_date: formStartDate && formStartDate.trim() ? formStartDate.trim() : null,
      end_date: formEndDate && formEndDate.trim() ? formEndDate.trim() : null,
      started_at: formStartDate && formStartDate.trim() ? `${formStartDate.trim()}T00:00:00.000Z` : null,
      ended_at: formEndDate && formEndDate.trim() ? `${formEndDate.trim()}T00:00:00.000Z` : null,
      notes: formNotes.trim() || null,
      contract_amount: 0,
      material_costs: 0,
      amount_collected: 0,
    };
    const { error: insertError } = await supabase.from("projects").insert(payload);
    setSubmitLoading(false);
    if (insertError) {
      setSubmitError(insertError.message);
      return;
    }
    setNewProjectOpen(false);
    setFormName("");
    setFormStartDate("");
    setFormEndDate("");
    setFormStatus("en_preparation");
    setFormNotes("");
    refetchProjects();
    const { data } = await supabase.from("projects").select("id").order("created_at", { ascending: false }).limit(1).single();
    if (data?.id) router.push(`/projets/${data.id}`);
  };

  if (!client && !clientsLoading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16"
      >
        <p className="text-gray-500">Client introuvable</p>
        <Link href="/clients">
          <Button className="mt-4 min-h-[48px]">Retour aux clients</Button>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon" className="min-h-[48px] min-w-[48px]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {client?.name ?? "—"}
            </h1>
            <p className="text-gray-500 flex items-center gap-2 mt-0.5">
              {client?.email && (
                <a href={`mailto:${client.email}`} className="flex items-center gap-1 text-brand-blue-600 hover:underline">
                  <Mail className="h-4 w-4" />
                  {client.email}
                </a>
              )}
              {client?.phone && (
                <a href={`tel:${client.phone.replace(/\s/g, "")}`} className="flex items-center gap-1 text-brand-blue-600 hover:underline">
                  <Phone className="h-4 w-4" />
                  {client.phone}
                </a>
              )}
              {client?.address && (
                <span className="flex items-center gap-1 text-gray-600">
                  <MapPin className="h-4 w-4" />
                  {client.address}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-brand-blue-500" />
            Projets / Chantiers
          </CardTitle>
          <Button onClick={() => setNewProjectOpen(true)} className="shrink-0">
            <UserPlus className="h-5 w-5 mr-2" />
            Nouveau projet
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-12 w-12 mb-2 animate-spin opacity-50" />
              <p>Chargement...</p>
            </div>
          ) : projects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-gray-500"
            >
              <FolderKanban className="h-12 w-12 mb-2 opacity-50" />
              <p>Aucun projet pour ce client</p>
              <Button variant="outline" className="mt-4" onClick={() => setNewProjectOpen(true)}>
                Créer un premier projet
              </Button>
            </motion.div>
          ) : (
            <ul className="divide-y divide-gray-100">
              <AnimatePresence mode="popLayout">
                {projects.map((project, i) => (
                  <motion.li
                    key={project.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Link href={`/projets/${project.id}`}>
                      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-brand-blue-50/50">
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-blue-100 text-brand-blue-600">
                            <FolderKanban className="h-6 w-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{project.name}</p>
                            <p className="text-sm text-gray-500">
                              {project.start_date ? formatDate(project.start_date) : "—"} → {project.end_date ? formatDate(project.end_date) : "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={statusVariant[project.status]}>
                            {statusLabels[project.status]}
                          </Badge>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </Link>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouveau projet</DialogTitle>
            <p className="text-sm text-gray-500">Client : {client?.name}</p>
          </DialogHeader>
          <form onSubmit={handleNewProject} className="space-y-4">
            <div>
              <label htmlFor="project-name" className="text-sm font-medium text-gray-700 mb-1 block">
                Nom du projet *
              </label>
              <Input
                id="project-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Rénovation cuisine"
                className="min-h-[48px]"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="start-date" className="text-sm font-medium text-gray-700 mb-1 block">
                  Date de début
                </label>
                <Input
                  id="start-date"
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="min-h-[48px]"
                />
              </div>
              <div>
                <label htmlFor="end-date" className="text-sm font-medium text-gray-700 mb-1 block">
                  Date de fin prévue
                </label>
                <Input
                  id="end-date"
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="min-h-[48px]"
                />
              </div>
            </div>
            <div>
              <label htmlFor="status" className="text-sm font-medium text-gray-700 mb-1 block">
                Statut
              </label>
              <select
                id="status"
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value as ProjectStatus)}
                className="w-full min-h-[48px] rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                {(Object.keys(statusLabels) as ProjectStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {statusLabels[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="notes" className="text-sm font-medium text-gray-700 mb-1 block">
                Notes (instructions, codes d&apos;accès)
              </label>
              <textarea
                id="notes"
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Instructions techniques..."
                rows={3}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            {submitError && <p className="text-sm text-red-600">{submitError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewProjectOpen(false)}>
                {t("cancel", language)}
              </Button>
              <Button type="submit" disabled={submitLoading}>
                {submitLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  "Créer le projet"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
