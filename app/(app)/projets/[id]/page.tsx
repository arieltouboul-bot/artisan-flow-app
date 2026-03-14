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
import { formatConvertedCurrency, formatDate } from "@/lib/utils";
import { useProfile } from "@/hooks/use-profile";
import { useProject } from "@/hooks/use-projects";
import { useProjectTasks } from "@/hooks/use-project-tasks";
import { useProjectTransactions } from "@/hooks/use-project-transactions";
import { useProjectExpenses, EXPENSE_CATEGORIES } from "@/hooks/use-project-expenses";
import { useEmployees } from "@/hooks/use-employees";
import { useProjectEmployees } from "@/hooks/use-project-employees";
import { createClient } from "@/lib/supabase/client";
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

export default function ProjetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { project, loading: projectLoading, error: projectError, refetch: refetchProject } = useProject(id);
  const { tasks, loading: tasksLoading, addTask, toggleTask, deleteTask } = useProjectTasks(id);
  const { transactions, loading: transactionsLoading, addTransaction } = useProjectTransactions(id);
  const { expenses, loading: expensesLoading, addExpense, deleteExpense, totalHT: expensesTotalHT, totalTvaRecuperable } = useProjectExpenses(id);
  const { displayCurrency } = useProfile();
  const currency = displayCurrency;
  const { employees } = useEmployees();
  const { assignments, loading: teamLoading, assignEmployee, unassignEmployee } = useProjectEmployees(id);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [photos, setPhotos] = useState<{ id: string; url: string; name?: string }[]>([]);
  const [address, setAddress] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  const [materialCosts, setMaterialCosts] = useState("");
  const [financeSaving, setFinanceSaving] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("virement");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseTvaRate, setExpenseTvaRate] = useState(20);
  const [expenseCategory, setExpenseCategory] = useState<"achat_materiel" | "location" | "main_oeuvre" | "sous_traitance">("achat_materiel");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseError, setExpenseError] = useState<string | null>(null);

  const supabase = createClient();

  const isLoaded = project !== undefined;
  const currentProject = project ?? null;

  useEffect(() => {
    if (currentProject?.notes != null) setNotes(currentProject.notes || "");
  }, [currentProject?.id, currentProject?.notes]);

  useEffect(() => {
    if (currentProject) {
      setAddress(currentProject.address ?? "");
      setContractAmount(String(currentProject.contract_amount ?? ""));
      setMaterialCosts(String(currentProject.material_costs ?? ""));
    }
  }, [currentProject]);

  const handleSaveNotes = async () => {
    if (!supabase || !id) return;
    setNotesSaving(true);
    await supabase.from("projects").update({ notes: notes || null, updated_at: new Date().toISOString() }).eq("id", id);
    setNotesSaving(false);
  };

  const handleDeleteProject = async () => {
    if (!supabase || !id) return;
    setDeleteLoading(true);
    await supabase.from("project_tasks").delete().eq("project_id", id);
    const { error } = await supabase.from("projects").delete().eq("id", id);
    setDeleteLoading(false);
    if (error) return;
    setDeleteConfirmOpen(false);
    router.push("/projets");
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
    const { error: updateError } = await supabase.from("projects").update(payload).eq("id", id);
    setFinanceSaving(false);
    if (!updateError) {
      refetchProject();
      router.refresh();
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
    setPaymentSuccess("Paiement enregistré !");
    window.setTimeout(() => {
      setPaymentSuccess(null);
    }, 3000);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError(null);
    const amount = parseFloat(expenseAmount.replace(",", "."));
    if (Number.isNaN(amount) || amount < 0) {
      setExpenseError("Montant invalide.");
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
    setExpenseTvaRate(20);
    setExpenseCategory("achat_materiel");
    setExpenseDate(new Date().toISOString().slice(0, 10));
  };

  if (!id || (isLoaded && !currentProject)) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center py-16"
      >
        <p className="text-gray-500">Projet introuvable</p>
        <Link href="/projets">
          <Button className="mt-4 min-h-[48px]">Retour aux projets</Button>
        </Link>
      </motion.div>
    );
  }

  const startDate = currentProject?.start_date ? new Date(currentProject.start_date) : null;
  const endDate = currentProject?.end_date ? new Date(currentProject.end_date) : null;
  const now = new Date();
  const totalDays = startDate && endDate ? Math.max(1, (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const elapsedDays = startDate ? Math.max(0, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const progressPercent = totalDays > 0 ? Math.min(100, (elapsedDays / totalDays) * 100) : 0;
  const isOverdue = endDate && now > endDate && currentProject?.status !== "termine";
  const marge = currentProject ? projectMarge(currentProject) : 0;
  const totalPaid = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const restant = Math.max(0, parseNum(contractAmount) - totalPaid);

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
              {projectLoading ? "Chargement..." : currentProject?.name ?? "—"}
            </h1>
            <p className="text-gray-500">
              {currentProject?.client?.name} • {currentProject?.address ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentProject && isOverdue && (
            <Badge variant="destructive" className="text-sm min-h-[28px]">En retard</Badge>
          )}
          {currentProject && (
            <Badge variant={statusVariant[currentProject.status]} className="text-sm min-h-[28px]">
              {statusLabels[currentProject.status]}
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteConfirmOpen(true)}
            className="min-h-[48px] min-w-[48px] text-red-600 hover:bg-red-50"
            aria-label="Supprimer le projet"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {projectError && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{projectError}</div>
      )}

      {currentProject && (
        <>
          <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
            <CardHeader>
              <CardTitle className="text-lg">Dates & suivi temporel</CardTitle>
              <p className="text-sm text-gray-500">
                Date de début : {currentProject.start_date ? formatDate(currentProject.start_date) : "—"} · Fin prévue :{" "}
                {currentProject.end_date ? formatDate(currentProject.end_date) : "—"}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Avancement dans le temps</span>
                <span>{totalDays > 0 ? `${Math.round(progressPercent)} %` : "—"}</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
              {isOverdue && (
                <p className="text-sm font-medium text-red-600">Chantier en retard par rapport à la date de fin prévue</p>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-brand-blue-500" />
                Notes de chantier
              </CardTitle>
              <Button size="sm" onClick={handleSaveNotes} disabled={notesSaving}>
                {notesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
              </Button>
            </CardHeader>
            <CardContent>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleSaveNotes}
                placeholder="Instructions techniques, codes d'accès..."
                rows={4}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </CardContent>
          </Card>

          <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-brand-blue-500" />
                Tâches du chantier
              </CardTitle>
              <p className="text-sm text-gray-500">Cochez les étapes au fur et à mesure</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handleAddTask} className="flex gap-2">
                <Input
                  value={newTaskLabel}
                  onChange={(e) => setNewTaskLabel(e.target.value)}
                  placeholder="Nouvelle tâche..."
                  className="min-h-[48px] flex-1"
                />
                <Button type="submit" size="icon" className="min-h-[48px] min-w-[48px]" disabled={!newTaskLabel.trim()}>
                  <Plus className="h-5 w-5" />
                </Button>
              </form>
              {tasksLoading ? (
                <div className="flex items-center gap-2 py-4 text-gray-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Chargement...
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
                        className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/50 px-3 py-2 min-h-[48px]"
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
                          <span className={task.completed ? "text-gray-500 line-through" : "text-gray-900"}>
                            {task.label}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-red-600 hover:bg-red-50 min-h-[40px] min-w-[40px]"
                          onClick={() => deleteTask(task.id)}
                          aria-label="Supprimer la tâche"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                  {tasks.length === 0 && (
                    <p className="text-sm text-gray-500 py-4 text-center">Aucune tâche. Ajoutez-en une ci-dessus.</p>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-blue-500" />
                Équipe assignée
              </CardTitle>
              <p className="text-sm text-gray-500">
                Assignez des employés à ce chantier
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm text-gray-500 block mb-1">Employé</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm min-h-[48px]"
                  >
                    <option value="">Choisir un employé...</option>
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
                    await assignEmployee(selectedEmployeeId);
                    setSelectedEmployeeId("");
                    setAssigning(false);
                  }}
                  className="min-h-[48px]"
                >
                  {assigning ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="h-4 w-4 mr-2" /> Ajouter</>}
                </Button>
              </div>
              {teamLoading ? (
                <div className="flex items-center gap-2 py-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement...
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
                        onClick={() => unassignEmployee(a.id)}
                        aria-label="Retirer du chantier"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                  {assignments.length === 0 && (
                    <p className="text-sm text-gray-500 py-2">Aucun employé assigné. Choisissez-en un ci-dessus.</p>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-brand-blue-500" />
                  Finances
                </CardTitle>
                <p className="text-sm text-gray-500">Marge = Contrat − Coûts matériaux · Restant dû = Contrat − Encaissé</p>
              </div>
              <Button size="sm" onClick={handleSaveFinance} disabled={financeSaving}>
                {financeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Trois montants clairs + barre de progression */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Montant total (Contract Amount)</span>
                  <span className="text-xl font-bold text-gray-900">{formatConvertedCurrency(parseNum(contractAmount), currency)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Déjà encaissé (Total Paid)</span>
                  <span className="text-xl font-bold text-emerald-600">{formatConvertedCurrency(totalPaid, currency)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm font-medium text-gray-700">Reste à payer (Remaining Balance)</span>
                  <span className={`text-xl font-bold ${restant > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {formatConvertedCurrency(restant)}
                  </span>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-gray-500 mb-1">Progression du paiement</p>
                  <Progress
                    value={(() => {
                      const total = parseNum(contractAmount);
                      const paid = totalPaid;
                      return total > 0 ? Math.min(100, (paid / total) * 100) : 0;
                    })()}
                    className="h-3"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(() => {
                      const total = parseNum(contractAmount);
                      const paid = totalPaid;
                      return total > 0 ? `${Math.round(Math.min(100, (paid / total) * 100))} % payé` : "—";
                    })()}
                  </p>
                </div>
              </div>

              {paymentSuccess && (
                <p className="text-sm text-emerald-600">{paymentSuccess}</p>
              )}

              <Button type="button" onClick={() => setPaymentOpen(true)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un paiement
              </Button>

              <div className="pt-2 border-t border-gray-100 space-y-4">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Adresse du chantier</label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Ex: 12 rue de la Paix, 75001 Paris"
                    className="min-h-[48px]"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Montant contrat (€)</label>
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
                  <label className="text-sm text-gray-500 block mb-1">Coûts matériaux (€)</label>
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
                <p className="text-sm font-medium text-gray-700 mb-2">Suivi Financier</p>
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Marge Brute</p>
                    <p className="text-lg font-bold text-emerald-600">
                      {formatConvertedCurrency(parseNum(contractAmount) - expensesTotalHT, currency)}
                    </p>
                    <p className="text-xs text-gray-400">CA HT − Dépenses HT</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">TVA à décaisser</p>
                    <p className="text-lg font-bold text-brand-blue-600">
                      {formatConvertedCurrency(Math.max(0, (parseNum(contractAmount) * 20) / 100 - totalTvaRecuperable), currency)}
                    </p>
                    <p className="text-xs text-gray-400">TVA collectée − TVA récupérable</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-6 pt-2">
                <div>
                  <p className="text-sm text-gray-500">Marge (contrat − coûts matériaux saisis)</p>
                  <p className={`text-lg font-bold ${(parseNum(contractAmount) - parseNum(materialCosts)) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {formatConvertedCurrency(parseNum(contractAmount) - parseNum(materialCosts))}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-2">Dépenses (matériel, location, main d&apos;œuvre, sous-traitance)</p>
                {expensesLoading ? (
                  <div className="flex items-center gap-2 py-2 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Chargement...
                  </div>
                ) : expenses.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2">Aucune dépense. Ajoutez-en pour suivre la marge et la TVA.</p>
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
                            aria-label="Supprimer la dépense"
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
                  Ajouter une dépense
                </Button>
              </div>

              {transactions.length > 0 && (
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">Paiements enregistrés</p>
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
              <CardTitle>Galerie chantier</CardTitle>
              <p className="text-sm text-gray-500">Glissez-déposez ou cliquez pour importer (préparé pour Supabase Storage).</p>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-xl border-2 border-dashed border-gray-200 p-8 text-center min-h-[200px] flex flex-col items-center justify-center">
                <Upload className="h-12 w-12 text-brand-blue-400 mb-2" />
                <p className="text-sm font-medium text-gray-700">Glissez des photos ici ou cliquez pour choisir</p>
              </div>
              {photos.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {photos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photo.url} alt={photo.name ?? "Chantier"} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce projet ?</DialogTitle>
            <p className="text-sm text-gray-500">
              Toutes les tâches et données du projet seront supprimées. Cette action est irréversible.
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={deleteLoading}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Supprimer le projet</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={paymentOpen} onOpenChange={(open) => { setPaymentOpen(open); setPaymentError(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              Ajouter un paiement
            </DialogTitle>
            <p className="text-sm text-gray-500">Le montant sera enregistré dans project_transactions et amount_collected sera mis à jour.</p>
          </DialogHeader>
          <form onSubmit={handleAddPayment} className="space-y-4">
            <div>
              <label className="text-sm text-gray-500 block mb-1">Montant (€)</label>
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
              <label className="text-sm text-gray-500 block mb-1">Date du virement</label>
              <Input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">Mode de paiement</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full min-h-[40px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="virement">Virement</option>
                <option value="especes">Espèces</option>
                <option value="cheque">Chèque</option>
                <option value="carte">Carte</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            {paymentError && (
              <p className="text-sm text-red-600">{paymentError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPaymentOpen(false)} disabled={paymentSaving}>
                Annuler
              </Button>
              <Button type="submit" disabled={paymentSaving}>
                {paymentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={expenseOpen} onOpenChange={(o) => { setExpenseOpen(o); setExpenseError(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une dépense</DialogTitle>
            <p className="text-sm text-gray-500">Matériel, location, main d&apos;œuvre, sous-traitance</p>
          </DialogHeader>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div>
              <label className="text-sm text-gray-500 block mb-1">Catégorie</label>
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
              <label className="text-sm text-gray-500 block mb-1">Description</label>
              <Input
                value={expenseDescription}
                onChange={(e) => setExpenseDescription(e.target.value)}
                placeholder="Ex: Achat carrelage"
                className="min-h-[44px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-500 block mb-1">Montant HT (€)</label>
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
                <label className="text-sm text-gray-500 block mb-1">TVA %</label>
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
            <div>
              <label className="text-sm text-gray-500 block mb-1">Date</label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className="min-h-[44px]" />
            </div>
            {expenseError && <p className="text-sm text-red-600">{expenseError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setExpenseOpen(false)} disabled={expenseSaving}>
                Annuler
              </Button>
              <Button type="submit" disabled={expenseSaving}>
                {expenseSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
