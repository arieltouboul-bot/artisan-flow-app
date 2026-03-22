"use client";

import { Suspense, useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useProjects } from "@/hooks/use-projects";
import { projectRestantDu } from "@/types/database";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatDate, formatConvertedCurrency, cn } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import type { ProjectStatus } from "@/types/database";
import { FolderKanban, ChevronRight, Loader2, Plus, MoreVertical } from "lucide-react";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { OmniTabSearch } from "@/components/ui/omni-tab-search";
import { SwipeActionsRow } from "@/components/ui/swipe-actions-row";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";

type RowActionsMenuProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
};

function RowActionsMenu({ isOpen, onOpenChange, onEdit, onDelete, isDeleting = false }: RowActionsMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onOpenChange]);
  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        className={cn("inline-flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none", isDeleting && "opacity-60 pointer-events-none")}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenChange(!isOpen); }}
        aria-label="Actions"
        aria-expanded={isOpen}
        disabled={isDeleting}
      >
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
      </button>
      {isOpen && !isDeleting && (
        <div className="absolute right-0 top-full z-[100] mt-1 min-w-[140px] rounded-md border border-gray-200 bg-white py-1 shadow-lg" role="menu">
          <button type="button" className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50" onClick={() => { onOpenChange(false); onEdit(); }}>Modifier</button>
          <button type="button" className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50" onClick={() => { onOpenChange(false); onDelete(); }}>Supprimer</button>
        </div>
      )}
    </div>
  );
}

const statusLabels: Record<ProjectStatus, string> = {
  en_preparation: "En préparation",
  en_cours: "En cours",
  urgent_retard: "Urgent / Retard",
  termine: "Terminé",
};

const statusVariant: Record<ProjectStatus, "gray" | "default" | "destructive" | "success"> = {
  en_preparation: "gray",
  en_cours: "default",
  urgent_retard: "destructive",
  termine: "success",
};

export type ProjetFilter = ProjectStatus | "all" | "unpaid";

function ProjetsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");
  const { language } = useLanguage();
  const [filter, setFilter] = useState<ProjetFilter>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { displayCurrency } = useProfile();
  const currency = displayCurrency;
  const { projects, loading, error } = useProjects();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (filterParam === "unpaid") setFilter("unpaid");
    else if (filterParam && (["all", "en_preparation", "en_cours", "urgent_retard", "termine"] as const).includes(filterParam as any))
      setFilter(filterParam as ProjetFilter);
  }, [filterParam]);

  const filtered = useMemo(() => {
    let list = projects;
    if (filter === "unpaid") list = list.filter((p) => projectRestantDu(p) > 0);
    else if (filter !== "all") list = list.filter((p) => p.status === filter);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.client?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [projects, filter, debouncedSearch]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Projets
          </h1>
          <p className="mt-1 text-gray-500">
            Tous vos chantiers
          </p>
        </div>
        <Link href="/projets/nouveau">
          <Button className="shrink-0">
            <Plus className="h-5 w-5 mr-2" />
            Ajouter un projet
          </Button>
        </Link>
      </div>

      {(error || deleteError) && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {deleteError ?? error}
        </div>
      )}

      <OmniTabSearch
        value={search}
        onChange={setSearch}
        placeholder={t("omniSearchProjects", language)}
        className="max-w-xl"
      />

      <Card className="overflow-visible transition-shadow hover:shadow-brand-glow">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["all", "unpaid", "en_preparation", "en_cours", "urgent_retard", "termine"] as const).map(
                (s) => (
                  <Button
                    key={s}
                    variant={filter === s ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilter(s)}
                    className="min-h-[44px]"
                  >
                    {s === "all" ? "Tous" : s === "unpaid" ? "Impayés" : statusLabels[s]}
                  </Button>
                )
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-12 w-12 mb-2 animate-spin opacity-50" />
              <p>Chargement des projets...</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 overflow-visible">
              <AnimatePresence mode="popLayout">
                {filtered.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-gray-500"
                  >
                    <FolderKanban className="h-12 w-12 mb-2 opacity-50" />
                    <p>Aucun projet trouvé</p>
                    <Link href="/projets/nouveau">
                      <Button variant="outline" className="mt-4">Ajouter un projet</Button>
                    </Link>
                  </motion.div>
                ) : (
                  filtered.map((project, i) => {
                    const endDate = project.end_date ? new Date(project.end_date) : null;
                    const isOverdue = endDate && endDate < new Date() && project.status !== "termine";
                    const total = project.contract_amount ?? 0;
                    const paid = project.amount_collected ?? 0;
                    const percentPaid = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
                    const runDelete = async () => {
                      if (!confirm(t("deleteProjectConfirm", language))) return;
                      setDeletingId(project.id);
                      const supabase = createClient();
                      if (!supabase) { setDeletingId(null); return; }
                      try { await supabase.from("project_tasks").delete().eq("project_id", project.id); } catch { /* ignore */ }
                      const { error } = await supabase.from("projects").delete().eq("id", project.id);
                      if (error) { setDeletingId(null); setDeleteError(error.message); alert("Erreur: " + error.message); }
                      else location.reload();
                    };
                    return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ delay: i * 0.03 }}
                      className={cn(!isMobile && "group")}
                    >
                      {isMobile ? (
                        <SwipeActionsRow
                          onEdit={() => router.push(`/projets/${String(project.id)}`)}
                          onDelete={runDelete}
                          disabled={deletingId === project.id}
                          editLabel={language === "en" ? "Edit project" : "Modifier le projet"}
                          deleteLabel={t("deleteProject", language)}
                          className={cn(deletingId === project.id && "opacity-60 pointer-events-none")}
                        >
                          <div className="flex flex-row items-start justify-between gap-3 px-4 py-4">
                            <button
                              type="button"
                              className="flex min-w-0 flex-1 items-center gap-3 text-left"
                              onClick={() => router.push(`/projets/${String(project.id)}`)}
                            >
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-blue-100 text-brand-blue-600">
                                <FolderKanban className="h-6 w-6" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900 truncate">{project.name}</p>
                                <p className="text-sm text-gray-500 truncate">
                                  {project.client?.name} • {project.address ?? project.client?.address ?? "—"}
                                </p>
                                <div className="mt-2 max-w-[220px]">
                                  <Progress value={percentPaid} className="h-2" />
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {total > 0 ? `${Math.round(percentPaid)} %` : "—"} · {formatConvertedCurrency(paid, currency)} / {formatConvertedCurrency(total, currency)}
                                  </p>
                                </div>
                              </div>
                            </button>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              {isOverdue && <Badge variant="destructive">En retard</Badge>}
                              <Badge variant={statusVariant[project.status]}>{statusLabels[project.status]}</Badge>
                              <span className="text-xs text-gray-500">
                                {project.start_date ? formatDate(project.start_date) : "—"}
                              </span>
                            </div>
                          </div>
                        </SwipeActionsRow>
                      ) : (
                        <div
                          className={cn(
                            "flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-brand-blue-50/50 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6",
                            deletingId === project.id && "opacity-60 pointer-events-none"
                          )}
                        >
                          <Link href={`/projets/${String(project.id)}`} className="flex min-w-0 flex-1 items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-blue-100 text-brand-blue-600">
                              <FolderKanban className="h-6 w-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 truncate">
                                {project.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {project.client?.name} • {project.address ?? project.client?.address ?? "—"}
                              </p>
                              <div className="mt-2 max-w-[200px]">
                                <Progress value={percentPaid} className="h-2" />
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {total > 0 ? `${Math.round(percentPaid)} % payé` : "—"} · {formatConvertedCurrency(paid, currency)} / {formatConvertedCurrency(total, currency)}
                                </p>
                              </div>
                            </div>
                          </Link>
                          <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap overflow-visible">
                            {isOverdue && (
                              <Badge variant="destructive" className="shrink-0">En retard</Badge>
                            )}
                            <Badge variant={statusVariant[project.status]}>
                              {statusLabels[project.status]}
                            </Badge>
                            <span className="text-sm text-gray-500 hidden sm:block">
                              {project.start_date
                                ? formatDate(project.start_date)
                                : "—"}
                            </span>
                            <RowActionsMenu
                              isOpen={openMenuId === project.id}
                              onOpenChange={(open) => setOpenMenuId(open ? project.id : null)}
                              onEdit={() => router.push(`/projets/${String(project.id)}`)}
                              onDelete={runDelete}
                              isDeleting={deletingId === project.id}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

    </motion.div>
  );
}

export default function ProjetsPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <ProjetsContent />
    </Suspense>
  );
}
