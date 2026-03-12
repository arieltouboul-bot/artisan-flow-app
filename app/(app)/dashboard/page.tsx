"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { useDashboardStats, type DashboardView } from "@/hooks/use-dashboard-stats";
import { useReminders } from "@/hooks/use-reminders";
import { useTodayAppointments } from "@/hooks/use-appointments";
import { useUser } from "@/hooks/use-user";
import { useProfile } from "@/hooks/use-profile";
import { projectRestantDu } from "@/types/database";
import { TrendingUp, AlertCircle, Euro, Percent, FolderKanban, ArrowRight, X, Search, Bell, CheckSquare, Square, Trash2, Plus, CalendarClock, MapPin } from "lucide-react";
import { formatTime } from "@/lib/utils";
import type { AppointmentType } from "@/types/database";

const APPOINTMENT_TYPE_COLORS: Record<AppointmentType, string> = {
  devis: "bg-blue-100 text-blue-800 border-blue-200",
  chantier: "bg-emerald-100 text-emerald-800 border-emerald-200",
  reunion: "bg-violet-100 text-violet-800 border-violet-200",
};

function displayName(
  user: { user_metadata?: { full_name?: string; name?: string }; email?: string } | null,
  companyName: string | null | undefined
): string {
  const fromMeta = user?.user_metadata?.full_name ?? user?.user_metadata?.name;
  if (fromMeta && String(fromMeta).trim()) return String(fromMeta).trim();
  if (companyName && String(companyName).trim()) return String(companyName).trim();
  const email = user?.email;
  if (email) {
    const part = email.split("@")[0];
    if (part) return part.charAt(0).toUpperCase() + part.slice(1);
  }
  return "Utilisateur";
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function DashboardPage() {
  const router = useRouter();
  const [dashboardView, setDashboardView] = useState<DashboardView>("all");
  const [globalSearch, setGlobalSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const { user } = useUser();
  const { profile } = useProfile();
  const { stats, projects, projectsImpayes, loading, error, refetch } = useDashboardStats(selectedYear);
  const { reminders, addReminder, toggleReminder, deleteReminder } = useReminders();
  const { appointments: todayAppointments } = useTodayAppointments();
  const [newReminder, setNewReminder] = useState("");
  const welcomeName = displayName(user ?? null, profile?.company_name ?? null);

  useEffect(() => {
    const onFocus = () => {
      refetch();
      router.refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch, router]);

  const progressValue =
    stats.caAnnuel > 0 ? Math.min(100, (stats.caMensuel / (stats.caAnnuel / 12)) * 100) : 0;

  const listProjects = useMemo(() => {
    let list = dashboardView === "impayes" ? projectsImpayes : projects;
    const q = globalSearch.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.client?.name?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [dashboardView, projects, projectsImpayes, globalSearch]);

  const showList = dashboardView === "all" || dashboardView === "impayes";
  const showCaDetail = dashboardView === "ca_detail";

  const nextAppointment = useMemo(() => {
    const now = new Date();
    const sorted = [...todayAppointments].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    return sorted.find((a) => new Date(a.end_at) > now) ?? null;
  }, [todayAppointments]);

  const [countdownMins, setCountdownMins] = useState<number | null>(null);
  useEffect(() => {
    if (!nextAppointment) {
      setCountdownMins(null);
      return;
    }
    const update = () => {
      const now = new Date();
      const start = new Date(nextAppointment.start_at);
      if (start <= now) {
        const end = new Date(nextAppointment.end_at);
        setCountdownMins(end > now ? -1 : null);
        return;
      }
      setCountdownMins(Math.max(0, Math.round((start.getTime() - now.getTime()) / 60000)));
    };
    update();
    const t = setInterval(update, 30_000);
    return () => clearInterval(t);
  }, [nextAppointment]);

  const openMapsUrl = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={item} className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Dashboard
          </h1>
          <p className="mt-1 text-gray-500">
            Vue d&apos;ensemble de votre activité
          </p>
        </div>
        <p className="text-sm md:text-base text-gray-600 md:text-right">
          Bonjour {welcomeName} 👋, voici l&apos;état de vos chantiers aujourd&apos;hui.
        </p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </motion.div>
      )}

      {nextAppointment && (
        <motion.div
          variants={item}
          className="rounded-xl border-2 border-brand-blue-200 bg-gradient-to-br from-brand-blue-50 to-white p-4 shadow-brand-glow"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-brand-blue-600">Prochain rendez-vous</p>
              <p className="mt-1 text-lg font-bold text-gray-900 truncate">{nextAppointment.title}</p>
              <p className="text-sm text-gray-500">
                {formatTime(nextAppointment.start_at)} – {formatTime(nextAppointment.end_at)}
                {countdownMins !== null && (
                  <span className="ml-2 font-medium text-brand-blue-600">
                    {countdownMins === -1
                      ? " · En cours"
                      : countdownMins === 0
                        ? " · Dans moins d'une minute"
                        : ` · Dans ${countdownMins} min`}
                  </span>
                )}
              </p>
            </div>
            {nextAppointment.project?.address && (
              <Button
                onClick={() => openMapsUrl(nextAppointment!.project!.address!)}
                className="shrink-0 gap-2 min-h-[48px]"
              >
                <MapPin className="h-4 w-4" />
                Y aller
              </Button>
            )}
          </div>
        </motion.div>
      )}

      <motion.div variants={item} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Rechercher un projet ou un client..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="pl-10 min-h-[48px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Année :</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm min-h-[48px]"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </motion.div>

      <motion.div
        variants={container}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <motion.div variants={item}>
          <Link href="/projets?view=ca" className="block">
            <Card className="cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-brand-glow hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  CA du mois
                </CardTitle>
                <Euro className="h-4 w-4 text-brand-blue-500" />
              </CardHeader>
              <CardContent>
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-2xl font-bold text-brand-blue-600"
                >
                  {loading ? "—" : formatCurrency(stats.caMensuel)}
                </motion.p>
                <Progress value={progressValue} className="mt-2 h-2" />
                <p className="text-xs text-gray-500 mt-1">Cliquez pour voir les projets</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/projets?view=ca" className="block">
            <Card className="cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-brand-glow hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  CA annuel
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-brand-blue-500" />
              </CardHeader>
              <CardContent>
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold text-gray-900"
                >
                  {loading ? "—" : formatCurrency(stats.caAnnuel)}
                </motion.p>
                <p className="text-xs text-gray-500 mt-1">Cliquez pour voir les projets</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Card className="cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-brand-glow hover:-translate-y-0.5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Marge bénéficiaire
              </CardTitle>
              <Percent className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-2xl font-bold text-emerald-600"
              >
                {loading ? "—" : `${stats.tauxMargeMoyen} %`}
              </motion.p>
              <p className="text-xs text-gray-500 mt-1">
                {loading ? "—" : formatCurrency(stats.margeTotale)} (contrats − matériaux)
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Frais matériaux total : {loading ? "—" : formatCurrency(stats.totalMaterialCosts)}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/projets?filter=unpaid" className="block">
            <Card className="cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-brand-glow hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 border-red-200 bg-red-50/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-700">
                  Impayés
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-2xl font-bold text-red-600"
                >
                  {loading ? "—" : formatCurrency(stats.facturesImpayees)}
                </motion.p>
                <p className="text-xs text-red-600 mt-1">
                  {stats.nbProjetsImpayes} chantier(s) non soldé(s) · Cliquez pour filtrer
                </p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </motion.div>

      <motion.div variants={item}>
        <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-brand-blue-500" />
              Mes Rappels
              {reminders.filter((r) => !r.completed).length > 0 && (
                <span className="ml-2 rounded-full bg-brand-blue-100 px-2 py-0.5 text-sm font-medium text-brand-blue-600">
                  {reminders.filter((r) => !r.completed).length} non terminé{reminders.filter((r) => !r.completed).length > 1 ? "s" : ""}
                </span>
              )}
            </CardTitle>
            <p className="text-sm text-gray-500">Ajoutez un rappel (ex: Appeler fournisseur), cochez « Fait » ou supprimez.</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newReminder.trim()) {
                  addReminder(newReminder.trim());
                  setNewReminder("");
                }
              }}
              className="flex gap-2"
            >
              <Input
                value={newReminder}
                onChange={(e) => setNewReminder(e.target.value)}
                placeholder="Ex: Appeler fournisseur..."
                className="min-h-[48px] flex-1"
              />
              <Button type="submit" size="icon" className="min-h-[48px] min-w-[48px]" disabled={!newReminder.trim()}>
                <Plus className="h-5 w-5" />
              </Button>
            </form>
            <ul className="space-y-2">
              {reminders.map((r) => (
                <motion.li
                  key={r.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 min-h-[48px]"
                >
                  <button
                    type="button"
                    onClick={() => toggleReminder(r.id, !r.completed)}
                    className="shrink-0 text-brand-blue-600"
                  >
                    {r.completed ? <CheckSquare className="h-5 w-5 text-emerald-600" /> : <Square className="h-5 w-5" />}
                  </button>
                  <span className={r.completed ? "text-gray-500 line-through flex-1" : "flex-1"}>{r.label}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-red-600 hover:bg-red-50 min-h-[40px] min-w-[40px]"
                    onClick={() => deleteReminder(r.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </motion.li>
              ))}
              {reminders.length === 0 && (
                <p className="text-sm text-gray-500 py-2">Aucun rappel. Ajoutez-en un ci-dessus.</p>
              )}
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-brand-blue-500" />
              À venir aujourd&apos;hui
              {todayAppointments.length > 0 && (
                <span className="ml-2 rounded-full bg-brand-blue-100 px-2 py-0.5 text-sm font-medium text-brand-blue-600">
                  {todayAppointments.length} rendez-vous
                </span>
              )}
            </CardTitle>
            <p className="text-sm text-gray-500">
              Vos rendez-vous du jour (Devis, Chantier, Réunion). Cliquez pour ouvrir le calendrier.
            </p>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">Aucun rendez-vous aujourd&apos;hui.</p>
            ) : (
              <ul className="space-y-2">
                {todayAppointments
                  .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
                  .map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 min-h-[48px]"
                    >
                      <span
                        className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${APPOINTMENT_TYPE_COLORS[a.type]}`}
                      >
                        {a.type === "devis" ? "Devis" : a.type === "chantier" ? "Chantier" : "Réunion"}
                      </span>
                      <span className="font-medium text-gray-900">{a.title}</span>
                      <span className="text-sm text-gray-500">{formatTime(a.start_at)} – {formatTime(a.end_at)}</span>
                      {a.project && (
                        <Link
                          href={`/projets/${a.project.id}`}
                          className="ml-auto text-sm text-brand-blue-600 hover:underline shrink-0"
                        >
                          {a.project.name}
                          <ArrowRight className="h-3 w-3 inline ml-0.5" />
                        </Link>
                      )}
                    </li>
                  ))}
              </ul>
            )}
            <Link href="/calendar" className="mt-3 inline-flex items-center gap-1 text-sm text-brand-blue-600 hover:underline">
              Voir le calendrier
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence mode="wait">
        {showCaDetail && (
          <motion.div
            key="ca-detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <Card className="overflow-hidden transition-all duration-300 hover:shadow-brand-glow">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Rentabilité par mois</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    CA encaissé (paiements) et frais matériaux par mois
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDashboardView("all")}
                  aria-label="Fermer la vue détaillée"
                >
                  <X className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="h-[320px] min-h-[240px] w-full overflow-hidden"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                      <XAxis dataKey="month" className="text-xs" interval={0} />
                      <YAxis className="text-xs" tickFormatter={(v) => `${v / 1000}k €`} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), ""]}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <Legend />
                      <Bar dataKey="ca" name="CA Encaissé" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cout" name="Frais Matériaux" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {showList && (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderKanban className="h-5 w-5 text-brand-blue-500" />
                  {dashboardView === "impayes"
                    ? "Chantiers non soldés"
                    : "Tous les projets"}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {dashboardView === "impayes"
                    ? `${listProjects.length} projet(s) avec un restant à régler`
                    : `${listProjects.length} projet(s)`}
                </p>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-gray-100">
                  <AnimatePresence mode="popLayout">
                    {listProjects.length === 0 ? (
                      <motion.li
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        Aucun projet à afficher
                      </motion.li>
                    ) : (
                      listProjects.map((project, i) => {
                        const restant = projectRestantDu(project);
                        const endDate = project.end_date ? new Date(project.end_date) : null;
                        const isOverdue = endDate && endDate < new Date() && project.status !== "termine";
                        return (
                          <motion.li
                            key={project.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-brand-blue-50/50 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <FolderKanban className="h-4 w-4 text-brand-blue-500 shrink-0" />
                              <div className="min-w-0">
                                <span className="font-medium text-gray-900 truncate block">
                                  {project.name}
                                </span>
                                <span className="text-sm text-gray-500 truncate block">
                                  {project.client?.name}
                                </span>
                              </div>
                              {isOverdue && (
                                <span className="shrink-0 rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                  En retard
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                              <span
                                className={
                                  restant > 0
                                    ? "text-red-600 font-medium"
                                    : "text-emerald-600"
                                }
                              >
                                {formatCurrency(restant)} dû
                              </span>
                              <Link href={`/projets/${project.id}`}>
                                <Button variant="ghost" size="sm" className="text-brand-blue-600">
                                  Voir
                                  <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                              </Link>
                            </div>
                          </motion.li>
                        );
                      })
                    )}
                  </AnimatePresence>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {!showCaDetail && showList && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center"
        >
          <Card className="overflow-hidden transition-all duration-300 hover:shadow-brand-glow max-w-2xl w-full">
            <CardHeader>
              <CardTitle>Graphique de rentabilité</CardTitle>
              <p className="text-sm text-gray-500">
                CA encaissé (vert) et frais matériaux (rouge) par mois
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] min-h-[240px] w-full overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                    <XAxis dataKey="month" className="text-xs" interval={0} />
                    <YAxis className="text-xs" tickFormatter={(v) => `${v / 1000}k €`} />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), ""]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                    />
                    <Legend />
                    <Bar dataKey="ca" name="CA Encaissé" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cout" name="Frais Matériaux" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
