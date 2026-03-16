"use client";

import { useState, useMemo } from "react";
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
import { useProjects } from "@/hooks/use-projects";
import { useAppointments } from "@/hooks/use-appointments";
import { formatDate, formatTime, toDateString, toTimeString } from "@/lib/utils";
import type { Appointment, AppointmentType } from "@/types/database";
import { ChevronLeft, ChevronRight, FolderKanban, Calendar as CalendarIcon, Sparkles, Loader2, Trash2 } from "lucide-react";

const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const HEURES = Array.from({ length: 14 }, (_, i) => i + 7);

const TYPE_LABELS: Record<AppointmentType, string> = {
  devis: "Devis",
  chantier: "Chantier",
  reunion: "Réunion",
};

const TYPE_COLORS: Record<AppointmentType, string> = {
  devis: "bg-blue-100 text-blue-800 border-blue-200",
  chantier: "bg-emerald-100 text-emerald-800 border-emerald-200",
  reunion: "bg-violet-100 text-violet-800 border-violet-200",
};

function getDaysInMonth(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startPad = first.getDay();
  const days: (Date | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(weekStart);
    x.setDate(weekStart.getDate() + i);
    return x;
  });
}

export default function CalendarPage() {
  const now = new Date();
  const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month");
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewDay, setViewDay] = useState(now.getDate());
  const [addOpen, setAddOpen] = useState(false);
  const [editAppointmentId, setEditAppointmentId] = useState<string | null>(null);
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formProjectId, setFormProjectId] = useState("");
  const [formDate, setFormDate] = useState(() => toDateString(now));
  const [formStartTime, setFormStartTime] = useState("09:00");
  const [formEndTime, setFormEndTime] = useState("10:00");
  const [formType, setFormType] = useState<AppointmentType>("chantier");
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { projects } = useProjects();

  const rangeStart = useMemo(() => {
    if (viewMode === "day") return new Date(viewYear, viewMonth, viewDay, 0, 0, 0);
    if (viewMode === "week") {
      const ws = getWeekStart(new Date(viewYear, viewMonth, viewDay));
      return new Date(ws.getFullYear(), ws.getMonth(), ws.getDate(), 0, 0, 0);
    }
    return new Date(viewYear, viewMonth, 1, 0, 0, 0);
  }, [viewMode, viewYear, viewMonth, viewDay]);

  const rangeEnd = useMemo(() => {
    if (viewMode === "day") return new Date(viewYear, viewMonth, viewDay, 23, 59, 59);
    if (viewMode === "week") {
      const ws = getWeekStart(new Date(viewYear, viewMonth, viewDay));
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      return new Date(we.getFullYear(), we.getMonth(), we.getDate(), 23, 59, 59);
    }
    return new Date(viewYear, viewMonth + 1, 0, 23, 59, 59);
  }, [viewMode, viewYear, viewMonth, viewDay]);

  const { appointments, loading, addAppointment, updateAppointment, deleteAppointment, refetch } = useAppointments(rangeStart, rangeEnd);

  const days = useMemo(() => getDaysInMonth(viewYear, viewMonth), [viewYear, viewMonth]);
  const weekStart = useMemo(() => getWeekStart(new Date(viewYear, viewMonth, viewDay)), [viewYear, viewMonth, viewDay]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const projectsByDay = useMemo(() => {
    const map = new Map<string, typeof projects>();
    for (const p of projects) {
      const start = p.start_date ? new Date(p.start_date) : null;
      const end = p.end_date ? new Date(p.end_date) : null;
      if (!start && !end) continue;
      const min = start ? start.getTime() : (end?.getTime() ?? 0);
      const max = end ? end.getTime() : (start?.getTime() ?? 0);
      for (const d of days) {
        if (!d) continue;
        const t = d.getTime();
        const key = toDateString(d);
        if (t >= min && t <= max) {
          if (!map.has(key)) map.set(key, []);
          map.get(key)!.push(p);
        }
      }
    }
    return map;
  }, [projects, days]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const start = new Date(a.start_at);
      const key = toDateString(start);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [appointments]);

  const prev = () => {
    if (viewMode === "day") {
      const d = new Date(viewYear, viewMonth, viewDay - 1);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setViewDay(d.getDate());
    } else if (viewMode === "week") {
      const d = new Date(weekStart);
      d.setDate(d.getDate() - 7);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setViewDay(d.getDate());
    } else {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear((y) => y - 1);
      } else setViewMonth((m) => m - 1);
    }
  };

  const next = () => {
    if (viewMode === "day") {
      const d = new Date(viewYear, viewMonth, viewDay + 1);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setViewDay(d.getDate());
    } else if (viewMode === "week") {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + 7);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setViewDay(d.getDate());
    } else {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear((y) => y + 1);
      } else setViewMonth((m) => m + 1);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formTitle.trim()) {
      setFormError("Le titre est obligatoire.");
      return;
    }
    const startAt = new Date(`${formDate}T${formStartTime}:00`);
    const endAt = new Date(`${formDate}T${formEndTime}:00`);
    if (endAt <= startAt) {
      setFormError("L'heure de fin doit être après l'heure de début.");
      return;
    }
    setFormSaving(true);
    if (editAppointmentId) {
      const { error } = await updateAppointment(editAppointmentId, {
        title: formTitle.trim(),
        project_id: formProjectId || null,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        type: formType,
      });
      setFormSaving(false);
      if (error) {
        setFormError(error);
        return;
      }
      setAddOpen(false);
      setEditAppointmentId(null);
    } else {
      const { error } = await addAppointment({
        title: formTitle.trim(),
        project_id: formProjectId || null,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        type: formType,
      });
      setFormSaving(false);
      if (error) {
        setFormError(error);
        return;
      }
      setAddOpen(false);
      setFormTitle("");
      setFormProjectId("");
      setFormDate(toDateString(now));
      setFormStartTime("09:00");
      setFormEndTime("10:00");
      setFormType("chantier");
    }
    refetch();
  };

  const handleDeleteAppointment = async (id: string) => {
    await deleteAppointment(id);
    setDetailAppointment(null);
    refetch();
  };

  const viewTitle =
    viewMode === "day"
      ? `${viewDay} ${MOIS[viewMonth]} ${viewYear}`
      : viewMode === "week"
        ? `Semaine du ${formatDate(weekStart)}`
        : `${MOIS[viewMonth]} ${viewYear}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Calendrier</h1>
          <p className="mt-1 text-gray-500">Rendez-vous et chantiers</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Ajouter un rendez-vous
          </Button>
          <div className="flex rounded-lg border border-gray-200 p-1">
            {(["month", "week", "day"] as const).map((m) => (
              <Button
                key={m}
                variant={viewMode === m ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode(m)}
              >
                {m === "month" ? "Mois" : m === "week" ? "Semaine" : "Jour"}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-brand-blue-500" />
            {viewTitle}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={prev} className="min-h-[48px] min-w-[48px]">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={next} className="min-h-[48px] min-w-[48px]">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-blue-500" />
            </div>
          ) : viewMode === "month" ? (
            <>
              <div className="grid grid-cols-7 gap-1 text-center text-sm font-medium text-gray-500">
                {JOURS.map((j) => (
                  <div key={j} className="py-2">{j}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {days.map((d, i) => {
                  const key = d ? toDateString(d) : "";
                  const dayProjects = key ? (projectsByDay.get(key) ?? []) : [];
                  const dayAppointments = key ? (appointmentsByDay.get(key) ?? []) : [];
                  const isToday = d && toDateString(d) === toDateString(now);
                  return (
                    <div
                      key={i}
                      className={`min-h-[88px] rounded-lg border p-2 ${d ? "bg-white border-gray-100" : "bg-gray-50/50 border-transparent"} ${isToday ? "ring-2 ring-brand-blue-500" : ""}`}
                    >
                      {d && (
                        <>
                          <span className={`text-sm font-medium ${isToday ? "text-brand-blue-600" : "text-gray-700"}`}>
                            {d.getDate()}
                          </span>
                          <div className="mt-1 space-y-0.5">
                            {dayAppointments.slice(0, 2).map((a) => (
                              <button
                                key={a.id}
                                type="button"
                                onClick={() => setDetailAppointment(a)}
                                className={`block w-full truncate rounded border px-1 py-0.5 text-left text-xs ${TYPE_COLORS[a.type]} hover:opacity-90`}
                              >
                                {formatTime(a.start_at)} {a.title}
                              </button>
                            ))}
                            {dayAppointments.length > 2 && (
                              <span className="text-xs text-gray-500">+{dayAppointments.length - 2} RDV</span>
                            )}
                            {dayProjects.slice(0, 2).map((p) => (
                              <Link key={p.id} href={`/projets/${p.id}`}>
                                <span className="block truncate rounded bg-gray-100 px-1 py-0.5 text-xs text-gray-700 hover:bg-gray-200">
                                  {p.name}
                                </span>
                              </Link>
                            ))}
                            {dayProjects.length > 2 && (
                              <span className="text-xs text-gray-500">+{dayProjects.length - 2}</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : viewMode === "week" ? (
            <div className="overflow-x-auto">
              <div className="min-w-[700px] space-y-0 rounded-lg border border-gray-200 overflow-hidden">
                <div className="grid grid-cols-8 gap-px bg-gray-100">
                  <div className="bg-gray-50 p-2 text-xs font-medium text-gray-500" />
                  {weekDays.map((d) => (
                    <div key={d.getTime()} className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-700">
                      {JOURS[d.getDay()]} {d.getDate()}
                    </div>
                  ))}
                </div>
                {HEURES.map((h) => (
                  <div key={h} className="grid grid-cols-8 gap-px border-t border-gray-100">
                    <div className="bg-gray-50 p-1 text-xs text-gray-500">
                      {String(h).padStart(2, "0")}:00
                    </div>
                    {weekDays.map((d) => {
                      const key = toDateString(d);
                      const dayApps = (appointmentsByDay.get(key) ?? []).filter((a) => {
                        const sh = new Date(a.start_at).getHours();
                        return sh <= h && h < new Date(a.end_at).getHours();
                      });
                      return (
                        <div
                          key={`${key}-${h}`}
                          className="min-h-[48px] border-l border-gray-100 bg-white p-0.5"
                        >
                          {dayApps.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => setDetailAppointment(a)}
                              className={`mb-0.5 w-full truncate rounded border px-1 py-0.5 text-left text-xs ${TYPE_COLORS[a.type]}`}
                            >
                              {a.title}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {HEURES.map((h) => (
                <div key={h} className="flex gap-4 border-b border-gray-100 py-1">
                  <span className="w-14 shrink-0 text-sm text-gray-500">
                    {String(h).padStart(2, "0")}:00
                  </span>
                  <div className="min-h-[44px] flex-1">
                    {(appointmentsByDay.get(toDateString(new Date(viewYear, viewMonth, viewDay))) ?? [])
                      .filter((a) => {
                        const sh = new Date(a.start_at).getHours();
                        const eh = new Date(a.end_at).getHours();
                        return sh <= h && h < eh;
                      })
                      .map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setDetailAppointment(a)}
                          className={`mb-1 w-full rounded-lg border p-2 text-left text-sm ${TYPE_COLORS[a.type]}`}
                        >
                          <span className="font-medium">{a.title}</span>
                          <span className="block text-xs opacity-90">
                            {formatTime(a.start_at)} – {formatTime(a.end_at)}
                            {a.project ? ` · ${a.project.name}` : ""}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-brand-blue-500" />
            Chantiers du mois
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {projects
              .filter((p) => {
                const start = p.start_date ? new Date(p.start_date) : null;
                const end = p.end_date ? new Date(p.end_date) : null;
                const monthStart = new Date(viewYear, viewMonth, 1);
                const monthEnd = new Date(viewYear, viewMonth + 1, 0);
                if (!start && !end) return false;
                const s = start?.getTime() ?? end!.getTime();
                const e = end?.getTime() ?? start!.getTime();
                return s <= monthEnd.getTime() && e >= monthStart.getTime();
              })
              .map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/projets/${p.id}`}
                    className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 hover:bg-brand-blue-50/50"
                  >
                    <span className="font-medium text-gray-900">{p.name}</span>
                    <span className="text-sm text-gray-500">
                      {p.start_date ? formatDate(p.start_date) : "—"} → {p.end_date ? formatDate(p.end_date) : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            {projects.filter((p) => {
              const start = p.start_date ? new Date(p.start_date) : null;
              const end = p.end_date ? new Date(p.end_date) : null;
              const monthStart = new Date(viewYear, viewMonth, 1);
              const monthEnd = new Date(viewYear, viewMonth + 1, 0);
              if (!start && !end) return false;
              const s = start?.getTime() ?? end!.getTime();
              const e = end?.getTime() ?? start!.getTime();
              return s <= monthEnd.getTime() && e >= monthStart.getTime();
            }).length === 0 && (
              <p className="py-4 text-sm text-gray-500">Aucun chantier sur cette période.</p>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* Modal Ajouter un rendez-vous */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) setEditAppointmentId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Ajouter un rendez-vous
            </DialogTitle>
          </DialogHeader>
          <motion.form
            onSubmit={handleAddSubmit}
            className="space-y-4"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <div>
              <label className="mb-1 block text-sm text-gray-500">Titre *</label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Ex: RDV Pose Travertin - Client Martin"
                className="min-h-[48px]"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-500">Projet associé</label>
              <select
                value={formProjectId}
                onChange={(e) => setFormProjectId(e.target.value)}
                className="w-full min-h-[48px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Aucun</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-500">Date *</label>
              <Input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="min-h-[48px]"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm text-gray-500">Heure de début *</label>
                <Input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="min-h-[48px]"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-500">Heure de fin *</label>
                <Input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="min-h-[48px]"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-500">Type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as AppointmentType)}
                className="w-full min-h-[48px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="devis">Devis</option>
                <option value="chantier">Chantier</option>
                <option value="reunion">Réunion</option>
              </select>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={formSaving}>
                {formSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
              </Button>
            </DialogFooter>
          </motion.form>
        </DialogContent>
      </Dialog>

      {/* Modal Détail / Supprimer RDV */}
      <Dialog open={!!detailAppointment} onOpenChange={(open) => !open && setDetailAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Détail du rendez-vous</DialogTitle>
          </DialogHeader>
          {detailAppointment && (
            <div className="space-y-2">
              <p className="font-medium">{detailAppointment.title}</p>
              <p className="text-sm text-gray-500">
                {formatDate(detailAppointment.start_at)} · {formatTime(detailAppointment.start_at)} – {formatTime(detailAppointment.end_at)}
              </p>
              <span className={`inline-block rounded border px-2 py-0.5 text-xs ${TYPE_COLORS[detailAppointment.type]}`}>
                {TYPE_LABELS[detailAppointment.type]}
              </span>
              {detailAppointment.project && (
                <p className="text-sm">
                  Projet : <Link href={`/projets/${detailAppointment.project.id}`} className="text-brand-blue-600 hover:underline">{detailAppointment.project.name}</Link>
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailAppointment(null)}>
              Fermer
            </Button>
            {detailAppointment && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    const a = detailAppointment;
                    setFormTitle(a.title);
                    setFormProjectId(a.project_id ?? "");
                    setFormDate(toDateString(new Date(a.start_at)));
                    setFormStartTime(toTimeString(new Date(a.start_at)));
                    setFormEndTime(toTimeString(new Date(a.end_at)));
                    setFormType(a.type);
                    setEditAppointmentId(a.id);
                    setDetailAppointment(null);
                    setAddOpen(true);
                  }}
                >
                  Modifier
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-gray-400 hover:text-red-600 hover:bg-red-50 min-h-[40px] min-w-[40px]"
                  onClick={() => handleDeleteAppointment(detailAppointment.id)}
                  aria-label="Supprimer le rendez-vous"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
