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
import { formatCurrency, formatConvertedCurrency, convertCurrency, getCurrencySymbol } from "@/lib/utils";
import { useDashboardStats, type DashboardView } from "@/hooks/use-dashboard-stats";
import { useReminders } from "@/hooks/use-reminders";
import { useTodayAppointments } from "@/hooks/use-appointments";
import { useUser } from "@/hooks/use-user";
import { useProfile } from "@/hooks/use-profile";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import { projectRestantDu } from "@/types/database";
import { TrendingUp, AlertCircle, Euro, Percent, FolderKanban, ArrowRight, X, Search, Bell, CheckSquare, Square, Trash2, Plus, CalendarClock, MapPin, Loader2 } from "lucide-react";
import { formatTime } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { AppointmentType } from "@/types/database";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";

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
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useUser();
  const { profile, displayCurrency } = useProfile();
  const { stats, projects, projectsImpayes, loading, error, refetch } = useDashboardStats(selectedYear);
  const { reminders, addReminder, toggleReminder, deleteReminder } = useReminders();
  const { appointments: todayAppointments } = useTodayAppointments();
  const [newReminder, setNewReminder] = useState("");
  const welcomeName = displayName(user ?? null, profile?.company_name ?? null);
  const { language } = useLanguage();
  const currency = displayCurrency;
  const [chartModalOpen, setChartModalOpen] = useState(false);

  useEffect(() => {
    const onFocus = () => {
      refetch();
      router.refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refetch, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    // Support older browsers
    if ("addEventListener" in mq) {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    (mq as any).addListener(update);
    return () => (mq as any).removeListener(update);
  }, []);

  const progressValue =
    stats.caAnnuel > 0 ? Math.min(100, (stats.caMensuel / (stats.caAnnuel / 12)) * 100) : 0;

  const dateLocale = language === "fr" ? fr : enUS;
  const localizedChartData = useMemo(
    () =>
      stats.chartData.map((row, i) => ({
        ...row,
        month: format(new Date(selectedYear, i, 1), "MMM", { locale: dateLocale }),
      })),
    [stats.chartData, selectedYear, dateLocale]
  );

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
            {t("dashboard", language)}
          </h1>
          <p className="mt-1 text-gray-500">{t("dashboardOverview", language)}</p>
        </div>
        <p className="text-sm md:text-base text-gray-600 md:text-right">
          {t("helloState", language).replace("{name}", welcomeName)}
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
              <p className="text-sm font-medium text-brand-blue-600">{t("nextAppointment", language)}</p>
              <p className="mt-1 text-lg font-bold text-gray-900 truncate">{nextAppointment.title}</p>
              <p className="text-sm text-gray-500">
                {formatTime(nextAppointment.start_at)} – {formatTime(nextAppointment.end_at)}
                {countdownMins !== null && (
                  <span className="ml-2 font-medium text-brand-blue-600">
                    {countdownMins === -1
                      ? " · En cours"
                      : countdownMins === 0
                        ? ` · ${t("inMinutes", language)}`
                        : ` · ${t("inXMinutes", language).replace("{n}", String(countdownMins))}`}
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
                {t("getDirections", language)}
              </Button>
            )}
          </div>
        </motion.div>
      )}

      <motion.div variants={item} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-xl flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t("searchProjectClient", language)}
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="pl-10 min-h-[48px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">{t("year", language)} :</span>
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
                  {t("caMonth", language)}
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
                  {loading ? "—" : formatConvertedCurrency(stats.caMensuel, currency)}
                </motion.p>
                <Progress value={progressValue} className="mt-2 h-2" />
                <p className="text-xs text-gray-500 mt-1">{t("clickToSeeProjects", language)}</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/projets?view=ca" className="block">
            <Card className="cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-brand-glow hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">
                  {t("caYear", language)}
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
                  {loading ? "—" : formatConvertedCurrency(stats.caAnnuel, currency)}
                </motion.p>
                <p className="text-xs text-gray-500 mt-1">{t("clickToSeeProjects", language)}</p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>

        <motion.div variants={item}>
          <Card className="cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-brand-glow hover:-translate-y-0.5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                {t("profitMargin", language)}
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
                {loading ? "—" : formatConvertedCurrency(stats.margeTotale, currency)} ({t("contractsMinusMaterials", language)})
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {t("totalMaterialFees", language)} : {loading ? "—" : formatConvertedCurrency(stats.totalMaterialCosts, currency)}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Link href="/projets?filter=unpaid" className="block">
            <Card className="cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-brand-glow hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 border-red-200 bg-red-50/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-700">
                  {t("unpaid", language)}
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
                  {loading ? "—" : formatConvertedCurrency(stats.facturesImpayees, currency)}
                </motion.p>
                <p className="text-xs text-red-600 mt-1">
                  {stats.nbProjetsImpayes} {t("unpaidCount", language)}
                </p>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      </motion.div>

      <motion.div variants={item}>
        <Card className="overflow-visible transition-shadow hover:shadow-brand-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-brand-blue-500" />
              {t("myReminders", language)}
              {reminders.filter((r) => !r.completed).length > 0 && (
                <span className="ml-2 rounded-full bg-brand-blue-100 px-2 py-0.5 text-sm font-medium text-brand-blue-600">
                  {reminders.filter((r) => !r.completed).length} {language === "fr" ? "non terminé" : "pending"}{reminders.filter((r) => !r.completed).length > 1 && language === "fr" ? "s" : ""}
                </span>
              )}
            </CardTitle>
            <p className="text-sm text-gray-500">{t("addReminderHint", language)}</p>
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
                placeholder={t("reminderPlaceholder", language)}
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
                <p className="text-sm text-gray-500 py-2">{t("noReminders", language)}</p>
              )}
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="overflow-visible transition-shadow hover:shadow-brand-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-brand-blue-500" />
              {t("upcomingToday", language)}
              {todayAppointments.length > 0 && (
                <span className="ml-2 rounded-full bg-brand-blue-100 px-2 py-0.5 text-sm font-medium text-brand-blue-600">
                  {todayAppointments.length} rendez-vous
                </span>
              )}
            </CardTitle>
            <p className="text-sm text-gray-500">
              {t("appointmentsHint", language)}
            </p>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-gray-500 py-2">{t("noAppointmentsToday", language)}</p>
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
                        {a.type === "devis" ? t("appointmentDevis", language) : a.type === "chantier" ? t("appointmentChantier", language) : t("appointmentReunion", language)}
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
              {t("viewCalendar", language)}
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
                  <CardTitle>{t("profitabilityByMonth", language)}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {t("revenueAndMaterials", language)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDashboardView("all")}
                  aria-label={t("closeDetail", language)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </CardHeader>
              <CardContent>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className={cn("h-[320px] min-h-[240px] w-full overflow-hidden", isMobile && "h-[350px]")}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={localizedChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                      <XAxis
                        dataKey="month"
                        interval={0}
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                        angle={isMobile ? -45 : 0}
                        textAnchor={isMobile ? "end" : "middle"}
                      />
                      <YAxis
                        tickFormatter={(v) => `${(convertCurrency(v, currency) / 1000).toFixed(0)}k ${getCurrencySymbol(currency)}`}
                        tick={isMobile ? { fontSize: 10 } : { fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value: number) => [formatConvertedCurrency(value, currency), ""]}
                        contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                      />
                      <Legend wrapperStyle={isMobile ? { display: "none" } : undefined} />
                      <Bar dataKey="ca" name={t("revenues", language)} fill="#00C853" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cout" name={t("expensesLabel", language)} fill="#FF1744" radius={[4, 4, 0, 0]} />
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
            <Card className="overflow-visible transition-shadow hover:shadow-brand-glow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderKanban className="h-5 w-5 text-brand-blue-500" />
                  {dashboardView === "impayes"
                    ? t("projectsUnpaid", language)
                    : t("allProjects", language)}
                </CardTitle>
                <p className="text-sm text-gray-500">
                  {dashboardView === "impayes"
                    ? `${listProjects.length} ${t("projectsWithRest", language)}`
                    : `${listProjects.length} ${t("projectCount", language)}`}
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
                        {t("noProjectsToShow", language)}
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
                                  {t("overdue", language)}
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
                                {formatConvertedCurrency(restant, currency)} {t("due", language)}
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
          <Card
            className="overflow-hidden transition-all duration-300 hover:shadow-brand-glow max-w-2xl w-full cursor-pointer"
            onClick={() => setChartModalOpen(true)}
          >
            <CardHeader>
              <CardTitle>{t("profitabilityChart", language)}</CardTitle>
              <p className="text-sm text-gray-500">{t("revenueGreenMaterialsRed", language)}</p>
              <p className="text-xs text-brand-blue-600">{t("clickChartForDetails", language)}</p>
            </CardHeader>
            <CardContent>
              <div className={cn("h-[280px] min-h-[240px] w-full overflow-hidden", isMobile && "h-[350px]")}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={localizedChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                    <XAxis
                      dataKey="month"
                      interval={0}
                      tick={{ fontSize: isMobile ? 10 : 12 }}
                      angle={isMobile ? -45 : 0}
                      textAnchor={isMobile ? "end" : "middle"}
                    />
                    <YAxis
                      tickFormatter={(v) => `${(convertCurrency(v, currency) / 1000).toFixed(0)}k ${getCurrencySymbol(currency)}`}
                      tick={isMobile ? { fontSize: 10 } : { fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatConvertedCurrency(value, currency), ""]}
                      contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }}
                    />
                    <Legend wrapperStyle={isMobile ? { display: "none" } : undefined} />
                    <Bar dataKey="ca" name={t("revenues", language)} fill="#00C853" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cout" name={t("expensesLabel", language)} fill="#FF1744" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Dialog open={chartModalOpen} onOpenChange={setChartModalOpen}>
        <DialogContent className={cn("max-w-4xl max-h-[90vh] overflow-y-auto")}>
          <DialogHeader>
            <DialogTitle>{t("chartDetailFullscreen", language)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className={cn("h-[360px] w-full", isMobile && "h-[350px]")}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={localizedChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                  <XAxis
                    dataKey="month"
                    interval={0}
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                    angle={isMobile ? -45 : 0}
                    textAnchor={isMobile ? "end" : "middle"}
                  />
                  <YAxis
                    tickFormatter={(v) => `${(convertCurrency(v, currency) / 1000).toFixed(0)}k ${getCurrencySymbol(currency)}`}
                    tick={isMobile ? { fontSize: 10 } : { fontSize: 12 }}
                  />
                  <Tooltip formatter={(value: number) => [formatConvertedCurrency(value, currency), ""]} contentStyle={{ borderRadius: "8px", border: "1px solid #e5e7eb" }} />
                  <Legend wrapperStyle={isMobile ? { display: "none" } : undefined} />
                  <Bar dataKey="ca" name={t("revenues", language)} fill="#00C853" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cout" name={t("expensesLabel", language)} fill="#FF1744" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">{t("revenueByMonth", language)}</h4>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left text-gray-600">{t("month", language)}</th>
                      <th className="px-3 py-2 text-right text-gray-600">{t("revenue", language)}</th>
                      <th className="px-3 py-2 text-right text-gray-600">{t("materials", language)}</th>
                      <th className="px-3 py-2 text-right text-gray-600">{t("vsPrevMonth", language)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localizedChartData.map((row, i) => {
                      const prev = localizedChartData[i - 1];
                      const prevCa = prev?.ca ?? 0;
                      const diff = prevCa ? ((row.ca - prevCa) / prevCa) * 100 : 0;
                      return (
                        <tr key={row.month} className="border-b border-gray-100">
                          <td className="px-3 py-2 font-medium">{row.month}</td>
                          <td className="px-3 py-2 text-right text-emerald-600">{formatConvertedCurrency(row.ca, currency)}</td>
                          <td className="px-3 py-2 text-right text-red-600">{formatConvertedCurrency(row.cout, currency)}</td>
                          <td className="px-3 py-2 text-right">{i === 0 ? "—" : `${diff >= 0 ? "+" : ""}${diff.toFixed(0)} %`}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
