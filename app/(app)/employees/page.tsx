"use client";

import { useState, useMemo, useEffect } from "react";
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
import { useEmployees } from "@/hooks/use-employees";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { OmniTabSearch } from "@/components/ui/omni-tab-search";
import { useLanguage } from "@/context/language-context";
import { useAssistant } from "@/context/assistant-context";
import { t } from "@/lib/translations";
import { Users, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatConvertedCurrency, type Currency } from "@/lib/utils";
import { RowActionsMenu } from "@/components/ui/row-actions-menu";
import { SwipeActionsRow } from "@/components/ui/swipe-actions-row";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useProfile } from "@/hooks/use-profile";
import { useProjects } from "@/hooks/use-projects";
import { useEmployeePayments } from "@/hooks/use-employee-payments";
import { InlineEditableAmountEur } from "@/components/finance/inline-editable-amount";

export default function EmployeesPage() {
  const { language } = useLanguage();
  const { displayCurrency } = useProfile();
  const { projects } = useProjects();
  const { setPageContext } = useAssistant();
  useEffect(() => {
    setPageContext({ activeSection: "employees" });
    return () => setPageContext({});
  }, [setPageContext]);
  const { employees, loading, error, addEmployee, updateEmployee, deleteEmployee } = useEmployees();
  const isMobile = useIsMobile();
  const [listSearch, setListSearch] = useState("");
  const debouncedListSearch = useDebouncedValue(listSearch, 300);
  const filteredEmployees = useMemo(() => {
    const q = debouncedListSearch.toLowerCase().trim();
    if (!q) return employees;
    return employees.filter((emp) => {
      const full = `${emp.first_name} ${emp.last_name}`.toLowerCase();
      const role = (emp.role ?? "").toLowerCase();
      return full.includes(q) || role.includes(q);
    });
  }, [employees, debouncedListSearch]);
  const [addOpen, setAddOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [detailEmployeeId, setDetailEmployeeId] = useState<string | null>(null);
  const [salaryTypeDraft, setSalaryTypeDraft] = useState<"daily" | "monthly">("daily");
  const [salaryCurrencyDraft, setSalaryCurrencyDraft] = useState<Currency>("EUR");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentProjectId, setPaymentProjectId] = useState<string>("");
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const selectedEmployee = employees.find((e) => e.id === detailEmployeeId) ?? null;
  const { payments, loading: paymentsLoading, addPayment, updatePayment, deletePayment } = useEmployeePayments(detailEmployeeId);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    setSubmitLoading(true);
    const result = await addEmployee(firstName.trim(), lastName.trim(), role.trim());
    setSubmitLoading(false);
    if (!result.error) {
      setAddOpen(false);
      setFirstName("");
      setLastName("");
      setRole("");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirmDeleteEmployee", language))) return;
    setDeletingId(id);
    const { error } = await deleteEmployee(id);
    setDeletingId(null);
    if (error) alert(error instanceof Error ? error.message : String(error));
  };

  const paidThisMonth = useMemo(() => {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return payments
      .filter((p) => p.payment_date.slice(0, 7) === ym)
      .reduce((s, p) => s + p.amount, 0);
  }, [payments]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
            Gestion d&apos;équipe
          </h1>
          <p className="mt-1 text-gray-500">
            Ajoutez et gérez les employés de votre entreprise
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="shrink-0">
          <Plus className="h-5 w-5 mr-2" />
          Ajouter un employé
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <OmniTabSearch
        value={listSearch}
        onChange={setListSearch}
        placeholder={t("omniSearchEmployees", language)}
        className="max-w-xl"
      />

      <Card className="overflow-visible transition-shadow hover:shadow-brand-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-blue-600" />
            Employés
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Loader2 className="h-12 w-12 mb-2 animate-spin opacity-50" />
              <p>Chargement...</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 overflow-x-auto overflow-y-visible">
              <AnimatePresence mode="popLayout">
                {employees.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-12 text-gray-500"
                  >
                    <Users className="h-12 w-12 mb-2 opacity-50" />
                    <p>Aucun employé. Ajoutez-en un pour les assigner à vos chantiers.</p>
                    <Button onClick={() => setAddOpen(true)} className="mt-4">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un employé
                    </Button>
                  </motion.div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-sm text-gray-500">
                    {t("noSearchResults", language)}
                  </div>
                ) : isMobile ? (
                  filteredEmployees.map((emp, i) => (
                    <motion.div
                      key={emp.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ delay: i * 0.03 }}
                      className="px-2"
                    >
                      <SwipeActionsRow
                        onEdit={() => {
                          setEditId(emp.id);
                          setEditFirstName(emp.first_name);
                          setEditLastName(emp.last_name);
                          setEditRole(emp.role ?? "");
                        }}
                        onDelete={() => handleDelete(emp.id)}
                        disabled={deletingId === emp.id}
                        editLabel={t("edit", language)}
                        deleteLabel={t("delete", language)}
                        className={cn(deletingId === emp.id && "opacity-60 pointer-events-none")}
                      >
                        <div
                          className="px-4 py-4 cursor-pointer"
                          onClick={() => {
                            setDetailEmployeeId(emp.id);
                            setSalaryTypeDraft((emp.salary_type as "daily" | "monthly") ?? "daily");
                            setSalaryCurrencyDraft((emp.salary_currency as Currency) ?? "EUR");
                          }}
                        >
                          <p className="font-semibold text-gray-900">
                            {emp.first_name} {emp.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{emp.role || "—"}</p>
                        </div>
                      </SwipeActionsRow>
                    </motion.div>
                  ))
                ) : (
                  filteredEmployees.map((emp, i) => (
                    <motion.div
                      key={emp.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ delay: i * 0.03 }}
                      className={cn("flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50/50", deletingId === emp.id && "opacity-60 pointer-events-none")}
                    >
                      <div
                        className="cursor-pointer"
                        onClick={() => {
                          setDetailEmployeeId(emp.id);
                          setSalaryTypeDraft((emp.salary_type as "daily" | "monthly") ?? "daily");
                          setSalaryCurrencyDraft((emp.salary_currency as Currency) ?? "EUR");
                        }}
                      >
                        <p className="font-semibold text-gray-900">
                          {emp.first_name} {emp.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{emp.role || "—"}</p>
                      </div>
                      <div className="overflow-visible">
                        <RowActionsMenu
                          isOpen={openMenuId === emp.id}
                          onOpenChange={(open) => setOpenMenuId(open ? emp.id : null)}
                          onEdit={() => {
                            setEditId(emp.id);
                            setEditFirstName(emp.first_name);
                            setEditLastName(emp.last_name);
                            setEditRole(emp.role ?? "");
                          }}
                          onDelete={() => handleDelete(emp.id)}
                          isDeleting={deletingId === emp.id}
                        />
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvel employé</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Prénom</label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Prénom"
                className="min-h-[48px]"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Nom</label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Nom"
                className="min-h-[48px]"
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-1">Rôle</label>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Ex: Chef de chantier, Carreleur..."
                className="min-h-[48px]"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitLoading}>
                {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailEmployeeId} onOpenChange={(open) => !open && setDetailEmployeeId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedEmployee ? `${selectedEmployee.first_name} ${selectedEmployee.last_name}` : "—"} · {t("payrollAndPayments", language)}
            </DialogTitle>
          </DialogHeader>
          {selectedEmployee && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">{t("salaryType", language)}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={salaryTypeDraft === "daily" ? "default" : "outline"}
                    size="sm"
                    onClick={async () => {
                      setSalaryTypeDraft("daily");
                      await updateEmployee(selectedEmployee.id, { salary_type: "daily" });
                    }}
                  >
                    {t("salaryDaily", language)}
                  </Button>
                  <Button
                    type="button"
                    variant={salaryTypeDraft === "monthly" ? "default" : "outline"}
                    size="sm"
                    onClick={async () => {
                      setSalaryTypeDraft("monthly");
                      await updateEmployee(selectedEmployee.id, { salary_type: "monthly" });
                    }}
                  >
                    {t("salaryMonthly", language)}
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-600">{t("salaryAmount", language)}:</span>
                  <InlineEditableAmountEur
                    amountEur={Number(selectedEmployee.salary_amount ?? 0)}
                    displayCurrency={displayCurrency}
                    onCommit={async (newEur) => {
                      await updateEmployee(selectedEmployee.id, { salary_amount: newEur });
                    }}
                  />
                  <select
                    value={salaryCurrencyDraft}
                    onChange={async (e) => {
                      const cur = e.target.value as Currency;
                      setSalaryCurrencyDraft(cur);
                      await updateEmployee(selectedEmployee.id, { salary_currency: cur });
                    }}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
                  >
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                    <option value="GBP">GBP</option>
                    <option value="ILS">ILS</option>
                  </select>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {t("paidThisMonthForEmployee", language)}: {formatConvertedCurrency(paidThisMonth, displayCurrency)}
                </p>
              </div>

              <form
                className="grid gap-3 rounded-lg border border-slate-200 p-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const amt = parseFloat(paymentAmount.replace(",", "."));
                  if (Number.isNaN(amt) || amt <= 0) return;
                  setPaymentSaving(true);
                  const res = await addPayment({
                    payment_date: paymentDate,
                    amount: amt,
                    currency: salaryCurrencyDraft,
                    project_id: paymentProjectId || null,
                  });
                  setPaymentSaving(false);
                  if (!res.error) {
                    setPaymentAmount("");
                    setPaymentProjectId("");
                  }
                }}
              >
                <p className="text-sm font-medium text-slate-700">{t("addPayrollPayment", language)}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className="min-h-[44px]" />
                  <Input type="number" min="0" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder={t("salaryAmount", language)} className="min-h-[44px]" />
                  <select
                    value={paymentProjectId}
                    onChange={(e) => setPaymentProjectId(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm min-h-[44px]"
                  >
                    <option value="">{t("linkedProject", language)} (—)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <Button type="submit" disabled={paymentSaving} className="w-fit">
                  {paymentSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("addPayrollPayment", language)}
                </Button>
              </form>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-700 mb-2">{t("paymentHistory", language)}</p>
                {paymentsLoading ? (
                  <div className="py-6 text-sm text-gray-500">{t("loading", language)}</div>
                ) : payments.length === 0 ? (
                  <div className="py-6 text-sm text-gray-500">{t("noPaymentsYet", language)}</div>
                ) : (
                  <div className="space-y-2">
                    {payments.map((p) => {
                      const rowId = `pay-${p.id}`;
                      const row = (
                        <div className={cn("flex items-center justify-between gap-2 rounded-md border border-slate-100 bg-white px-3 py-2", deletingId === rowId && "opacity-60 pointer-events-none")}>
                          <div className="min-w-0">
                            <p className="text-sm text-slate-700">{p.payment_date}</p>
                            <p className="text-xs text-slate-500">
                              {t("linkedProject", language)}: {p.project_id ? projects.find((x) => x.id === p.project_id)?.name ?? "—" : "—"}
                            </p>
                          </div>
                          <InlineEditableAmountEur
                            amountEur={p.amount}
                            displayCurrency={displayCurrency}
                            className="text-brand-blue-700"
                            onCommit={async (newEur) => {
                              await updatePayment(p.id, { amount: newEur });
                            }}
                          />
                        </div>
                      );
                      return isMobile ? (
                        <SwipeActionsRow
                          key={p.id}
                          onEdit={() => {}}
                          onDelete={async () => {
                            setDeletingId(rowId);
                            await deletePayment(p.id);
                            setDeletingId(null);
                          }}
                          editLabel={t("edit", language)}
                          deleteLabel={t("delete", language)}
                          disabled={deletingId === rowId}
                        >
                          {row}
                        </SwipeActionsRow>
                      ) : (
                        <div key={p.id} className="flex items-center gap-2">
                          <div className="flex-1">{row}</div>
                          <RowActionsMenu
                            isOpen={openMenuId === rowId}
                            onOpenChange={(open) => setOpenMenuId(open ? rowId : null)}
                            onEdit={() => {}}
                            onDelete={async () => {
                              setDeletingId(rowId);
                              await deletePayment(p.id);
                              setDeletingId(null);
                            }}
                            isDeleting={deletingId === rowId}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("edit", language)} — {employees.find((e) => e.id === editId)?.first_name} {employees.find((e) => e.id === editId)?.last_name}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!editId) return;
              setEditLoading(true);
              const result = await updateEmployee(editId, {
                first_name: editFirstName.trim(),
                last_name: editLastName.trim(),
                role: editRole.trim(),
              });
              setEditLoading(false);
              if (result.error) {
                alert(result.error instanceof Error ? result.error.message : String(result.error));
              } else setEditId(null);
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{language === "fr" ? "Prénom" : "First name"}</label>
              <Input value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} className="min-h-[44px]" required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{language === "fr" ? "Nom" : "Last name"}</label>
              <Input value={editLastName} onChange={(e) => setEditLastName(e.target.value)} className="min-h-[44px]" required />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">{language === "fr" ? "Rôle" : "Role"}</label>
              <Input value={editRole} onChange={(e) => setEditRole(e.target.value)} placeholder={language === "fr" ? "Ex: Chef de chantier..." : "e.g. Site manager..."} className="min-h-[44px]" />
            </div>
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
