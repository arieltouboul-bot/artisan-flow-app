"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatConvertedCurrency, formatDate, cn } from "@/lib/utils";
import { amountInCurrencyToEur } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import { useProject } from "@/hooks/use-projects";
import { useProjectTasks } from "@/hooks/use-project-tasks";
import { useProjectTransactions } from "@/hooks/use-project-transactions";
import { useProjectExpenses, EXPENSE_CATEGORIES } from "@/hooks/use-project-expenses";
import { useProjectRevenues } from "@/hooks/use-project-revenues";
import {
  totalProjectRevenueEur,
  totalProjectExpensesEur,
} from "@/lib/project-finance";
import { useEmployees } from "@/hooks/use-employees";
import { useProjectEmployees } from "@/hooks/use-project-employees";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/language-context";
import { useAssistant } from "@/context/assistant-context";
import { t } from "@/lib/translations";
import { Skeleton } from "@/components/ui/skeleton";
import { projectMarge, projectRestantDu, type ProjectStatus } from "@/types/database";
import {
  ArrowLeft,
  ImagePlus,
  FileText,
  Upload,
  Trash2,
  Loader2,
  CheckSquare,
  Square,
  Plus,
  StickyNote,
  ListTodo,
  Users,
  UserPlus,
  Banknote,
} from "lucide-react";

const statusVariant: Record<string, "gray" | "default" | "destructive" | "success"> = {
  en_preparation: "gray",
  en_cours: "default",
  urgent_retard: "destructive",
  termine: "success",
  annule: "gray",
};

function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-2/3 max-w-md" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default function ProjetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { language } = useLanguage();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : String(params?.id ?? "");
  const { project, loading: projectLoading, error: projectError, refetch: refetchProject } = useProject(id || null);
  const { tasks, loading: tasksLoading, addTask, toggleTask, updateTask, deleteTask } = useProjectTasks(id);
  const { transactions, loading: transactionsLoading, addTransaction } = useProjectTransactions(id);
  const { expenses, loading: expensesLoading, addExpense, deleteExpense, totalHT: expensesTotalHT, totalTvaRecuperable } = useProjectExpenses(id);
  const { revenueRows, loading: projectRevenuesLoading } = useProjectRevenues(id);
  const { displayCurrency } = useProfile();
  const currency = displayCurrency;
  const { employees } = useEmployees();
  const { assignments, loading: teamLoading, assignEmployee, unassignEmployee } = useProjectEmployees(id);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [projectNotes, setProjectNotes] = useState<Array<{ id: string; content: string; created_at?: string }>>([]);
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskLabel, setEditingTaskLabel] = useState("");
  const [photos, setPhotos] = useState<Array<{ id: string; url: string; name?: string; storage_path?: string }>>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [address, setAddress] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  const [materialCosts, setMaterialCosts] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [planningOpen, setPlanningOpen] = useState(false);
  const [planningSaving, setPlanningSaving] = useState(false);
  const [financeSaving, setFinanceSaving] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("virement");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseTvaRate, setExpenseTvaRate] = useState(20);
  const [expenseCategory, setExpenseCategory] = useState<"achat_materiel" | "location" | "main_oeuvre" | "sous_traitance">("achat_materiel");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [expenseSuccess, setExpenseSuccess] = useState<string | null>(null);
  const [teamPayrollEur, setTeamPayrollEur] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  const supabase = createClient();
  const { setPageContext } = useAssistant();

  const currentProject = project ?? null;

  useEffect(() => {
    if (currentProject) {
      setAddress(currentProject.address ?? "");
      setContractAmount(String(currentProject.contract_amount ?? ""));
      setMaterialCosts(String(currentProject.material_costs ?? ""));
      setPlannedStartDate(currentProject.start_date ? currentProject.start_date.slice(0, 10) : "");
      setPlannedEndDate(currentProject.end_date ? currentProject.end_date.slice(0, 10) : "");
    }
  }, [currentProject]);

  useEffect(() => {
    if (!id || !currentProject) return;
    setPageContext({ currentProjectId: id, currentProjectName: currentProject.name });
    return () => setPageContext({});
  }, [id, currentProject?.name, setPageContext]);

  const pushToast = (kind: "success" | "error", message: string) => {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    if (!supabase || !id) return;
    let mounted = true;
    const fetchPayroll = async () => {
      const { data } = await supabase
        .from("employee_payments")
        .select("amount, currency")
        .eq("project_id", id);
      let total = 0;
      for (const row of data ?? []) {
        const r = row as { amount: number; currency: string | null };
        const cur = r.currency === "USD" || r.currency === "GBP" || r.currency === "ILS" ? r.currency : "EUR";
        total += amountInCurrencyToEur(Number(r.amount) || 0, cur);
      }
      if (mounted) setTeamPayrollEur(total);
    };
    void fetchPayroll();
    return () => { mounted = false; };
  }, [supabase, id, expenses.length]);

  useEffect(() => {
    if (!supabase || !id || !currentUserId) return;
    let mounted = true;
    const fetchNotes = async () => {
      const { data } = await supabase
        .from("project_notes")
        .select("id, content, created_at")
        .eq("project_id", id)
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });
      if (!mounted) return;
      setProjectNotes((data ?? []) as Array<{ id: string; content: string; created_at?: string }>);
    };
    void fetchNotes();
    return () => {
      mounted = false;
    };
  }, [supabase, id, currentUserId]);

  useEffect(() => {
    if (!supabase || !id || !currentUserId) return;
    let mounted = true;
    const fetchImages = async () => {
      const { data } = await supabase
        .from("project_images")
        .select("id, public_url, storage_path, created_at")
        .eq("project_id", id)
        .eq("user_id", currentUserId)
        .order("created_at", { ascending: false });
      if (!mounted) return;
      setPhotos(
        ((data ?? []) as Array<{ id: string; public_url: string; storage_path?: string | null }>).map((img) => ({
          id: img.id,
          url: img.public_url,
          storage_path: img.storage_path ?? undefined,
        }))
      );
    };
    void fetchImages();
    return () => {
      mounted = false;
    };
  }, [supabase, id, currentUserId]);

  useEffect(() => {
    if (currentProject && Number.isFinite(Number(currentProject.vat_rate))) {
      setExpenseTvaRate(Number(currentProject.vat_rate));
      return;
    }
    setExpenseTvaRate(20);
  }, [currentProject?.id, currentProject?.vat_rate]);

  useEffect(() => {
    if (!supabase) return;
    let mounted = true;
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (mounted) setCurrentUserId(data.user?.id ?? "");
    };
    void loadUser();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const handleAddProjectNote = async () => {
    if (!supabase || !id || !currentUserId || !newNote.trim()) return;
    setNotesSaving(true);
    const { data, error } = await supabase
      .from("project_notes")
      .insert({ project_id: id, user_id: currentUserId, content: newNote.trim() })
      .select("id, content, created_at")
      .single();
    setNotesSaving(false);
    if (error) {
      pushToast("error", error.message);
      return;
    }
    setProjectNotes((prev) => [data as { id: string; content: string; created_at?: string }, ...prev]);
    setNewNote("");
    pushToast("success", language === "fr" ? "Note sauvegardee." : "Note saved.");
  };

  const handleUpdateProjectNote = async (noteId: string) => {
    if (!supabase || !currentUserId || !editingNoteContent.trim()) return;
    setNotesSaving(true);
    const { error } = await supabase
      .from("project_notes")
      .update({ content: editingNoteContent.trim(), updated_at: new Date().toISOString() })
      .eq("id", noteId)
      .eq("user_id", currentUserId);
    setNotesSaving(false);
    if (error) {
      pushToast("error", error.message);
      return;
    }
    setProjectNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, content: editingNoteContent.trim() } : n)));
    setEditingNoteId(null);
    setEditingNoteContent("");
    pushToast("success", language === "fr" ? "Note mise a jour." : "Note updated.");
  };

  const handleDeleteProjectNote = async (noteId: string) => {
    if (!supabase || !currentUserId) return;
    setNotesSaving(true);
    const { error } = await supabase.from("project_notes").delete().eq("id", noteId).eq("user_id", currentUserId);
    setNotesSaving(false);
    if (error) {
      pushToast("error", error.message);
      return;
    }
    setProjectNotes((prev) => prev.filter((n) => n.id !== noteId));
    pushToast("success", language === "fr" ? "Note supprimee." : "Note deleted.");
  };

  const handleUploadGalleryImage = async (file: File) => {
    if (!supabase || !id || !currentUserId || !file) return;
    setGalleryUploading(true);
    const path = `${id}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("project-galleries")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (uploadError) {
      setGalleryUploading(false);
      pushToast("error", uploadError.message);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("project-galleries").getPublicUrl(path);
    const { data, error } = await supabase
      .from("project_images")
      .insert({ project_id: id, user_id: currentUserId, storage_path: path, public_url: publicUrl })
      .select("id, public_url, storage_path")
      .single();
    setGalleryUploading(false);
    if (error) {
      pushToast("error", error.message);
      return;
    }
    setPhotos((prev) => [{ id: data.id, url: data.public_url as string, storage_path: data.storage_path as string }, ...prev]);
    pushToast("success", language === "fr" ? "Image ajoutee." : "Image uploaded.");
  };

  const handleDeleteGalleryImage = async (imageId: string, storagePath?: string) => {
    if (!supabase || !currentUserId) return;
    if (storagePath) {
      await supabase.storage.from("project-galleries").remove([storagePath]);
    }
    const { error } = await supabase.from("project_images").delete().eq("id", imageId).eq("user_id", currentUserId);
    if (error) {
      pushToast("error", error.message);
      return;
    }
    setPhotos((prev) => prev.filter((img) => img.id !== imageId));
    pushToast("success", language === "fr" ? "Image supprimee." : "Image deleted.");
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskLabel.trim()) return;
    addTask(newTaskLabel.trim());
    setNewTaskLabel("");
  };

  const parseNum = (v: string) => {
    const n = parseFloat(String(v).replace(",", "."));
    return Number.isNaN(n) ? 0 : n;
  };

  const getStatusLabel = (status: ProjectStatus | string) => {
    if (status === "en_preparation") return t("statusInPreparation", language);
    if (status === "en_cours") return t("statusInProgress", language);
    if (status === "urgent_retard") return t("statusUrgentLate", language);
    if (status === "termine") return t("statusCompleted", language);
    if (status === "annule") return t("statusCancelled", language);
    return t("statusInPreparation", language);
  };

  const handleSaveFinance = async () => {
    if (!supabase || !id) return;
    setFinanceSaving(true);
    const contractNum = parseFloat(String(contractAmount).replace(",", "."));
    const materialNum = parseFloat(String(materialCosts).replace(",", "."));
    const payload = {
      address: address.trim() || null,
      contract_amount: Number.isNaN(contractNum) ? 0 : contractNum,
      material_costs: Number.isNaN(materialNum) ? 0 : materialNum,
      updated_at: new Date().toISOString(),
    };
    const { error: updateError } = await supabase
      .from("projects")
      .update(payload)
      .eq("id", id)
      .eq("user_id", currentUserId);
    setFinanceSaving(false);
    if (!updateError) {
      refetchProject();
      router.refresh();
    }
  };

  const handleSavePlanning = async () => {
    if (!supabase || !id) return;
    setPlanningSaving(true);
    const { error } = await supabase
      .from("projects")
      .update({
        start_date: plannedStartDate.trim() || null,
        end_date: plannedEndDate.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", currentUserId);
    setPlanningSaving(false);
    if (!error) {
      refetchProject();
      router.refresh();
      setPlanningOpen(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseNum(paymentAmount);
    if (amount <= 0 || !paymentDate) return;
    setPaymentSaving(true);
    setPaymentError(null);
    setPaymentSuccess(null);
    const { error } = await addTransaction(amount, paymentDate, paymentMethod);
    setPaymentSaving(false);
    if (error) {
      setPaymentError(error);
      return;
    }
    setPaymentOpen(false);
    setPaymentAmount("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod("virement");
    await refetchProject();
    router.refresh();
    setPaymentSuccess(t("paymentSaved", language));
    window.setTimeout(() => {
      setPaymentSuccess(null);
    }, 3000);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError(null);
    const amount = parseFloat(expenseAmount.replace(",", "."));
    if (Number.isNaN(amount) || amount < 0) {
      setExpenseError(t("invalidAmount", language));
      return;
    }
    setExpenseSaving(true);
    const { error } = await addExpense({
      description: expenseDescription.trim(),
      amount_ht: amount,
      tva_rate: expenseTvaRate,
      category: expenseCategory,
      date: expenseDate,
    });
    setExpenseSaving(false);
    if (error) {
      setExpenseError(error);
      return;
    }
    setExpenseOpen(false);
    setExpenseDescription("");
    setExpenseAmount("");
    setExpenseTvaRate(Number.isFinite(Number(currentProject?.vat_rate)) ? Number(currentProject?.vat_rate) : 20);
    setExpenseCategory("achat_materiel");
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setExpenseSuccess(t("expenseSaved", language));
    window.setTimeout(() => setExpenseSuccess(null), 3000);
  };

  if (!id) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16"
      >
        <p className="text-gray-500">{t("projectNotFoundTitle", language)}</p>
        <Link href="/projets">
          <Button className="mt-4 min-h-[48px]">{t("backToProjects", language)}</Button>
        </Link>
      </motion.div>
    );
  }

  if (projectLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <ProjectDetailSkeleton />
      </motion.div>
    );
  }

  if (!currentProject) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16 px-4 text-center"
      >
        <p className="text-gray-900 font-medium">{t("projectNotFoundTitle", language)}</p>
        <p className="text-gray-500 mt-2 max-w-md">{t("projectNotFoundHint", language)}</p>
        <Link href="/projets">
          <Button className="mt-6 min-h-[48px]">{t("backToProjects", language)}</Button>
        </Link>
      </motion.div>
    );
  }

  const MS_DAY = 86_400_000;
  const startOfLocalDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const startDate = plannedStartDate ? new Date(`${plannedStartDate}T12:00:00`) : null;
  const endDate = plannedEndDate ? new Date(`${plannedEndDate}T12:00:00`) : null;
  const startDay = startDate ? startOfLocalDay(startDate) : null;
  const endDay = endDate ? startOfLocalDay(endDate) : null;
  const todayDay = startOfLocalDay(new Date());
  const totalDays = startDay && endDay ? Math.max(1, (endDay.getTime() - startDay.getTime()) / MS_DAY) : 0;
  const elapsedDays = startDay ? Math.max(0, (todayDay.getTime() - startDay.getTime()) / MS_DAY) : 0;
  const progressPercent = totalDays > 0 ? Math.min(100, (elapsedDays / totalDays) * 100) : 0;
  const isOverdue = endDay && todayDay > endDay && currentProject?.status !== "termine";
  const marge = currentProject ? projectMarge(currentProject) : 0;
  const budgetNum = Number(currentProject.contract_amount ?? 0);
  const effectiveVatRate = Number.isFinite(Number(currentProject.vat_rate)) ? Number(currentProject.vat_rate) : 20;
  const totalTtc = budgetNum * (1 + effectiveVatRate / 100);
  const amountCollected = Number(currentProject.amount_collected ?? 0);
  const restant = Math.max(0, totalTtc - amountCollected);
  const payProgressPct = totalTtc > 0 ? Math.min(100, (amountCollected / totalTtc) * 100) : 0;
  const isPaymentComplete = totalTtc > 0 && restant < 0.005;
  const totalRevEur = totalProjectRevenueEur(transactions, revenueRows);
  const totalExpEur = totalProjectExpensesEur(parseNum(materialCosts), expenses) + teamPayrollEur;
  const netProfitProj = totalRevEur - totalExpEur;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href={currentProject ? `/clients/${currentProject.client_id}` : "/projets"}>
            <Button variant="ghost" size="icon" className="min-h-[48px] min-w-[48px]">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {currentProject?.name ?? "—"}
            </h1>
            <p className="text-gray-500">
              {currentProject?.client?.name} • {currentProject?.address ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentProject && isOverdue && (
            <Badge variant="destructive" className="text-sm min-h-[28px]">{t("overdue", language)}</Badge>
          )}
          {currentProject && (
            <Badge variant={statusVariant[currentProject.status] ?? "gray"} className="text-sm min-h-[28px]">
              {getStatusLabel(currentProject.status)}
            </Badge>
          )}
          <select
            value={currentProject.status}
            disabled={statusSaving}
            onChange={async (e) => {
              if (!supabase || !id) return;
              setStatusSaving(true);
              await supabase
                .from("projects")
                .update({
                  status: e.target.value as unknown as ProjectStatus,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", id)
                .eq("user_id", currentUserId);
              setStatusSaving(false);
              refetchProject();
            }}
            className="min-h-[40px] rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
            aria-label={t("projectStatusLabel", language)}
          >
            <option value="en_preparation">{t("statusInPreparation", language)}</option>
            <option value="en_cours">{t("statusInProgress", language)}</option>
            <option value="termine">{t("statusCompleted", language)}</option>
            <option value="annule">{t("statusCancelled", language)}</option>
          </select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="z-50 h-9 w-9 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setDeleteOpen(true)}
            aria-label={t("deleteProject", language)}
            title={t("deleteProject", language)}
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
          </Button>
        </div>
      </div>

      {toast && (
        <div
          className={cn(
            "fixed right-4 top-4 z-[100] rounded-lg px-3 py-2 text-sm text-white shadow-lg",
            toast.kind === "success" ? "bg-emerald-600" : "bg-red-600"
          )}
        >
          {toast.message}
        </div>
      )}

      {projectError && currentProject && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{projectError}</div>
      )}

      {currentProject && (
        <>
          <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-lg">{t("projectDatesTemporalTitle", language)}</CardTitle>
                <p className="text-sm text-gray-500">
                  {plannedStartDate ? formatDate(plannedStartDate) : "—"} · {plannedEndDate ? formatDate(plannedEndDate) : "—"}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 min-h-[40px]"
                onClick={() => setPlanningOpen(true)}
              >
                {t("edit", language)}
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600">
                <span>{t("projectTimeProgressLabel", language)}</span>
                <span className="flex items-center gap-2">
                  {isOverdue && (
                    <Badge variant="destructive" className="text-xs">
                      {t("overdue", language)}
                    </Badge>
                  )}
                  <span>{totalDays > 0 ? `${Math.round(progressPercent)} %` : "—"}</span>
                </span>
              </div>
              <Progress
                value={progressPercent}
                className={cn("h-3", isOverdue && "bg-red-100")}
                indicatorClassName={isOverdue ? "bg-red-600" : undefined}
              />
              {isOverdue && (
                <p className="text-sm font-medium text-red-600">{t("projectTimeOverdueHint", language)}</p>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-brand-blue-500" />
                {t("projectNotesTitle", language)}
              </CardTitle>
              <Button size="icon" onClick={handleAddProjectNote} disabled={!newNote.trim() || notesSaving}>
                {notesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder={t("projectNotesPlaceholder", language)}
                  className="min-h-[44px]"
                />
                <Button type="button" size="icon" onClick={handleAddProjectNote} disabled={!newNote.trim() || notesSaving}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ul className="space-y-2">
                {projectNotes.map((note) => (
                  <li
                    key={note.id}
                    className="group flex items-start justify-between gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2"
                  >
                    {editingNoteId === note.id ? (
                      <Input
                        value={editingNoteContent}
                        onChange={(e) => setEditingNoteContent(e.target.value)}
                        onBlur={() => void handleUpdateProjectNote(note.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void handleUpdateProjectNote(note.id);
                          if (e.key === "Escape") {
                            setEditingNoteId(null);
                            setEditingNoteContent("");
                          }
                        }}
                        autoFocus
                        className="min-h-[40px]"
                      />
                    ) : (
                      <button
                        type="button"
                        onDoubleClick={() => {
                          setEditingNoteId(note.id);
                          setEditingNoteContent(note.content);
                        }}
                        className="flex-1 text-left text-sm text-gray-900"
                      >
                        {note.content}
                      </button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 text-red-600 hover:bg-red-50"
                      onClick={() => void handleDeleteProjectNote(note.id)}
                      aria-label={t("delete", language)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-brand-blue-500" />
                {t("projectTasksTitle", language)}
              </CardTitle>
              <p className="text-sm text-gray-500">{t("projectTasksHint", language)}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handleAddTask} className="flex gap-2">
                <Input
                  value={newTaskLabel}
                  onChange={(e) => setNewTaskLabel(e.target.value)}
                  placeholder={t("taskPlaceholder", language)}
                  className="min-h-[48px] flex-1"
                />
                <Button type="submit" size="icon" className="min-h-[48px] min-w-[48px]" disabled={!newTaskLabel.trim()}>
                  <Plus className="h-5 w-5" />
                </Button>
              </form>
              {tasksLoading ? (
                <div className="flex items-center gap-2 py-4 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t("loading", language)}
                </div>
              ) : (
                <ul className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {tasks.map((task) => (
                      <motion.li
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        className="group flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 min-h-[48px]"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => toggleTask(task.id, !task.completed)}
                            className="shrink-0 text-brand-blue-600 hover:opacity-80"
                          >
                            {task.completed ? (
                              <CheckSquare className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <Square className="h-5 w-5" />
                            )}
                          </button>
                          {editingTaskId === task.id ? (
                            <Input
                              value={editingTaskLabel}
                              onChange={(e) => setEditingTaskLabel(e.target.value)}
                              onBlur={() => {
                                if (editingTaskLabel.trim()) void updateTask(task.id, editingTaskLabel);
                                setEditingTaskId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && editingTaskLabel.trim()) {
                                  void updateTask(task.id, editingTaskLabel);
                                  setEditingTaskId(null);
                                }
                                if (e.key === "Escape") setEditingTaskId(null);
                              }}
                              autoFocus
                              className="min-h-[36px]"
                            />
                          ) : (
                            <button
                              type="button"
                              onDoubleClick={() => {
                                setEditingTaskId(task.id);
                                setEditingTaskLabel(task.label);
                              }}
                              className={cn("text-left", task.completed ? "text-gray-500 line-through" : "text-gray-900")}
                            >
                              {task.label}
                            </button>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-red-600 hover:bg-red-50 min-h-[40px] min-w-[40px] opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => deleteTask(task.id)}
                          aria-label={t("delete", language)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                  {tasks.length === 0 && (
                    <p className="text-sm text-gray-500 py-4 text-center">{t("projectNoTasksHint", language)}</p>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-blue-500" />
                {t("projectAssignedTeamTitle", language)}
              </CardTitle>
              <p className="text-sm text-gray-500">
                {t("projectAssignedTeamHint", language)}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm text-gray-500 block mb-1">{t("employees", language)}</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm min-h-[48px]"
                  >
                    <option value="">{t("projectSelectEmployee", language)}</option>
                    {employees
                      .filter((e) => !assignments.some((a) => a.employee_id === e.id))
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} {emp.role ? `(${emp.role})` : ""}
                        </option>
                      ))}
                  </select>
                </div>
                <Button
                  disabled={!selectedEmployeeId || assigning}
                  onClick={async () => {
                    if (!selectedEmployeeId) return;
                    setAssigning(true);
                    const result = await assignEmployee(selectedEmployeeId);
                    if (result?.error) pushToast("error", result.error.message);
                    else pushToast("success", language === "fr" ? "Membre assigne." : "Member assigned.");
                    setSelectedEmployeeId("");
                    setAssigning(false);
                  }}
                  className="min-h-[48px]"
                >
                  {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-2" /> {t("add", language)}</>}
                </Button>
              </div>
              {teamLoading ? (
                <div className="flex items-center gap-2 py-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("loading", language)}
                </div>
              ) : (
                <ul className="space-y-2">
                  {assignments.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 min-h-[48px]"
                    >
                      <span className="text-gray-900">
                        {a.employee?.first_name} {a.employee?.last_name}
                        {a.employee?.role && <span className="text-gray-500"> · {a.employee.role}</span>}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:bg-red-50 min-h-[40px] min-w-[40px]"
                        onClick={async () => {
                          const result = await unassignEmployee(a.id);
                          if (result?.error) pushToast("error", result.error.message);
                          else pushToast("success", language === "fr" ? "Membre retire." : "Member removed.");
                        }}
                        aria-label={t("projectRemoveFromSite", language)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                  {assignments.length === 0 && (
                    <p className="text-sm text-gray-500 py-2">{t("projectNoAssignedEmployees", language)}</p>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex flex-wrap items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-blue-500" />
                  {t("projectFinanceSectionTitle", language)}
                  {isPaymentComplete && (
                    <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">{t("projectPaidBadge", language)}</Badge>
                  )}
                </CardTitle>
                <p className="text-sm text-gray-500">{t("projectFinanceCardSubtitle", language)}</p>
              </div>
              <Button size="sm" onClick={handleSaveFinance} disabled={financeSaving}>
                {financeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save", language)}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Trois montants clairs + barre de progression */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t("contractAmount", language)}</span>
                  <span className="text-xl font-bold text-gray-900">{formatConvertedCurrency(budgetNum, currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t("projectAmountPaidLabel", language)}</span>
                  <span className="text-xl font-bold text-emerald-600">
                    {formatConvertedCurrency(amountCollected, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-700">{t("projectRemainingBalanceLabel", language)}</span>
                  <span className={`text-xl font-bold ${restant > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatConvertedCurrency(restant, currency)}
                  </span>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-gray-500 mb-1">{t("projectPaymentProgressLabel", language)}</p>
                  <Progress
                    value={payProgressPct}
                    className={cn("h-3", isPaymentComplete && "bg-emerald-100")}
                    indicatorClassName={isPaymentComplete ? "bg-emerald-600" : undefined}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {budgetNum > 0 ? `${Math.round(payProgressPct)} %` : "—"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-2">
                <p className="text-sm font-medium text-gray-800">{t("projectFinanceProfitTitle", language)}</p>
                <p className="text-xs text-gray-600">{t("projectFinanceProfitHint", language)}</p>
                <div className="flex flex-wrap gap-4 justify-between text-sm">
                  <span className="text-gray-600">{t("projectFinanceTotalRevenue", language)}</span>
                  <span className="font-semibold text-gray-900">
                    {projectRevenuesLoading ? (
                      <Skeleton className="inline-block h-5 w-24 rounded-md" />
                    ) : (
                      formatConvertedCurrency(totalRevEur, currency)
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 justify-between text-sm">
                  <span className="text-gray-600">{t("projectFinanceTotalExpenses", language)}</span>
                  <span className="font-semibold text-gray-900">{formatConvertedCurrency(totalExpEur, currency)}</span>
                </div>
                <div className="flex flex-wrap gap-4 justify-between border-t border-emerald-100 pt-2">
                  <span className="font-medium text-gray-800">{t("dashboardCounterNetProfit", language)}</span>
                  <span className={`text-lg font-bold ${netProfitProj >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {projectRevenuesLoading ? (
                      <Skeleton className="inline-block h-7 w-28 rounded-md" />
                    ) : (
                      formatConvertedCurrency(netProfitProj, currency)
                    )}
                  </span>
                </div>
              </div>

              {paymentSuccess && (
                <p className="text-sm text-emerald-600">{paymentSuccess}</p>
              )}
              {expenseSuccess && (
                <p className="text-sm text-emerald-600">{expenseSuccess}</p>
              )}

              <Button type="button" onClick={() => setPaymentOpen(true)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                {t("addPayment", language)}
              </Button>

              <div className="pt-2 border-t border-gray-100 space-y-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">{t("projectAddress", language)}</label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t("projectAddressPlaceholder", language)}
                    className="min-h-[48px]"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">{t("contractAmount", language)}</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={contractAmount}
                    onChange={(e) => setContractAmount(e.target.value)}
                    className="min-h-[48px]"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-500 block mb-1">{t("materialCosts", language)}</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={materialCosts}
                    onChange={(e) => setMaterialCosts(e.target.value)}
                    className="min-h-[48px]"
                  />
                </div>
                </div>
              </div>
              {/* Suivi Financier : Marge Brute (CA HT - dépenses HT) et TVA à décaisser */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">{t("financialTracking", language)}</p>
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-sm text-gray-500">{t("grossMargin", language)}</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {formatConvertedCurrency(parseNum(contractAmount) - expensesTotalHT - teamPayrollEur, currency)}
                    </p>
                    <p className="text-xs text-gray-400">{t("projectGrossMarginFormula", language)}</p>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="text-sm text-gray-500 underline-offset-2 hover:underline"
                      onClick={async () => {
                        if (!supabase || !id || !currentUserId) return;
                        const raw = window.prompt(
                          t("projectVatPrompt", language),
                          String(effectiveVatRate)
                        );
                        if (raw == null) return;
                        const nextRate = Number(raw.replace(",", "."));
                        if (!Number.isFinite(nextRate) || nextRate < 0 || nextRate > 100) return;
                        await supabase
                          .from("projects")
                          .update({ vat_rate: nextRate, updated_at: new Date().toISOString() })
                          .eq("id", id)
                          .eq("user_id", currentUserId);
                        await refetchProject();
                      }}
                    >
                      {t("vatToPay", language)} · {effectiveVatRate}%
                    </button>
                    <p className="text-lg font-bold text-brand-blue-600">
                      {formatConvertedCurrency(
                        Math.max(0, (parseNum(contractAmount) * effectiveVatRate) / 100 - totalTvaRecuperable),
                        currency
                      )}
                    </p>
                    <p className="text-xs text-gray-400">{t("vatCollectedDeductible", language)}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 pt-2">
                <div>
                  <p className="text-sm text-gray-500">{t("projectMarginContractMaterials", language)}</p>
                  <p className={`text-lg font-bold ${(parseNum(contractAmount) - parseNum(materialCosts)) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatConvertedCurrency(parseNum(contractAmount) - parseNum(materialCosts), currency)}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-2">{t("projectExpensesCategories", language)}</p>
                <p className="text-xs text-gray-500 mb-2">
                  {t("projectLinkedSalaries", language)}: <span className="font-medium">{formatConvertedCurrency(teamPayrollEur, currency)}</span>
                </p>
                {expensesLoading ? (
                  <div className="flex items-center gap-2 py-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("loading", language)}
                  </div>
                ) : expenses.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">{t("noExpenses", language)}</p>
                ) : (
                  <ul className="space-y-1 text-sm mb-2">
                    {expenses.map((ex) => (
                      <li key={ex.id} className="flex justify-between items-center py-1">
                        <span>
                          {formatDate(ex.date)} — {EXPENSE_CATEGORIES.find((c) => c.value === ex.category)?.label ?? ex.category} · {ex.description || "—"}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{formatConvertedCurrency(ex.amount_ht, currency)} HT</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                            onClick={() => deleteExpense(ex.id)}
                            aria-label={t("delete", language)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => setExpenseOpen(true)} className="min-h-[44px]">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("projectAddExpenseTitle", language)}
                </Button>
              </div>

              {transactions.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">{t("projectPaymentsRecorded", language)}</p>
                  <ul className="space-y-1 text-sm">
                    {transactions.map((tx) => (
                      <li key={tx.id} className="flex justify-between items-center py-1">
                        <span>{formatDate(tx.payment_date)} — {tx.payment_method || "—"}</span>
                        <span className="font-medium">{formatConvertedCurrency(tx.amount, currency)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Tabs defaultValue="photos" className="space-y-4">
        <TabsList className="min-h-[48px] p-1">
          <TabsTrigger value="photos" className="min-h-[44px] px-4">
            <ImagePlus className="mr-2 h-4 w-4" />
            Photos
          </TabsTrigger>
        </TabsList>
        <TabsContent value="photos" className="space-y-4">
          <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
            <CardHeader>
              <CardTitle>{t("projectGalleryTitle", language)}</CardTitle>
              <p className="text-sm text-gray-500">{t("projectGalleryHint", language)}</p>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-xl border-2 border-dashed border-gray-200 p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
                <Upload className="h-12 w-12 text-brand-blue-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">{t("projectGalleryDropHint", language)}</p>
                <label className="mt-3">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUploadGalleryImage(file);
                      e.currentTarget.value = "";
                    }}
                  />
                  <span className="inline-flex cursor-pointer rounded-md bg-brand-blue-600 px-3 py-2 text-sm font-medium text-white">
                    {galleryUploading ? t("loading", language) : t("addPhoto", language)}
                  </span>
                </label>
              </div>
              {photos.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photo.name ?? t("projects", language)} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => void handleDeleteGalleryImage(photo.id, photo.storage_path)}
                        className="absolute right-2 top-2 h-6 w-6 rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        aria-label={t("delete", language)}
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={planningOpen} onOpenChange={setPlanningOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("projectDatesTemporalTitle", language)}</DialogTitle>
            <p className="text-sm text-gray-500">{t("projectPlanningModalHint", language)}</p>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 py-2">
            <div>
              <label className="text-sm text-gray-500 block mb-1">{t("projectPlannedStartDate", language)}</label>
              <Input
                type="date"
                value={plannedStartDate}
                onChange={(e) => setPlannedStartDate(e.target.value)}
                className="min-h-[48px]"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">{t("projectPlannedEndDate", language)}</label>
              <Input
                type="date"
                value={plannedEndDate}
                onChange={(e) => setPlannedEndDate(e.target.value)}
                className="min-h-[48px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPlanningOpen(false)} disabled={planningSaving}>
              {t("close", language)}
            </Button>
            <Button type="button" onClick={() => void handleSavePlanning()} disabled={planningSaving}>
              {planningSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save", language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={(open) => { setPaymentOpen(open); setPaymentError(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              {t("addPayment", language)}
            </DialogTitle>
            <p className="text-sm text-gray-500">
              {t("projectPaymentHint", language)}
            </p>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-4">
            <div>
              <label className="text-sm text-gray-500 block mb-1">{t("paymentAmount", language)}</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">{t("paymentDate", language)}</label>
              <Input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">{t("paymentMethod", language)}</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full min-h-[40px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="virement">{t("paymentMethodWire", language)}</option>
                <option value="especes">{t("paymentMethodCash", language)}</option>
                <option value="cheque">{t("paymentMethodCheck", language)}</option>
                <option value="carte">{t("paymentMethodCard", language)}</option>
                <option value="autre">{t("paymentMethodOther", language)}</option>
              </select>
            </div>
            {paymentError && (
              <p className="text-sm text-red-600">{paymentError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)} disabled={paymentSaving}>
                {t("cancel", language)}
              </Button>
              <Button type="submit" disabled={paymentSaving}>
                {paymentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save", language)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={expenseOpen} onOpenChange={(o) => { setExpenseOpen(o); setExpenseError(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("projectAddExpenseTitle", language)}</DialogTitle>
            <p className="text-sm text-gray-500">{t("projectExpenseHint", language)}</p>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <label className="text-sm text-gray-500 block mb-1">{t("category", language)}</label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value as typeof expenseCategory)}
                className="w-full min-h-[44px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">{t("description", language)}</label>
              <Input
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                placeholder={t("projectExpenseDescriptionPlaceholder", language)}
                className="min-h-[44px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">{t("totalHT", language)}</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  className="min-h-[44px]"
                />
              </div>
              <div>
                <button
                  type="button"
                  className="text-sm text-gray-500 mb-1 underline-offset-2 hover:underline"
                  onClick={async () => {
                    if (!supabase || !id || !currentUserId) return;
                    const raw = window.prompt(t("projectVatPrompt", language), String(effectiveVatRate));
                    if (raw == null) return;
                    const nextRate = Number(raw.replace(",", "."));
                    if (!Number.isFinite(nextRate) || nextRate < 0 || nextRate > 100) return;
                    await supabase
                      .from("projects")
                      .update({ vat_rate: nextRate, updated_at: new Date().toISOString() })
                      .eq("id", id)
                      .eq("user_id", currentUserId);
                    setExpenseTvaRate(nextRate);
                    await refetchProject();
                  }}
                >
                  {t("vat", language)} %
                </button>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={expenseTvaRate}
                  onChange={(e) => setExpenseTvaRate(Number(e.target.value) || 20)}
                  className="min-h-[44px]"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              {t("projectEstimatedTtc", language)}{" "}
              <span className="font-medium">
                {formatConvertedCurrency(parseNum(expenseAmount) * (1 + (Number(expenseTvaRate) || 0) / 100), currency)}
              </span>
            </p>
            <div>
              <label className="text-sm text-gray-500 block mb-1">{t("dateLabel", language)}</label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="min-h-[44px]" />
            </div>
            {expenseError && <p className="text-sm text-red-600">{expenseError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExpenseOpen(false)} disabled={expenseSaving}>
                {t("cancel", language)}
              </Button>
              <Button type="submit" disabled={expenseSaving}>
                {expenseSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save", language)}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteProject", language)}</DialogTitle>
            <p className="text-sm text-gray-500">{t("deleteProjectConfirm", language)}</p>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              {t("cancel", language)}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={async () => {
                if (!supabase || !id) return;
                try {
                  await supabase.from("project_tasks").delete().eq("project_id", id);
                } catch {
                  // ignore
                }
                if (!currentUserId) return;
                const { error } = await supabase
                  .from("projects")
                  .delete()
                  .eq("id", id)
                  .eq("user_id", currentUserId);
                if (error) alert(error.message);
                else router.push("/projets");
              }}
            >
              {t("delete", language)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
