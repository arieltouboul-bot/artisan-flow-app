"use client";

import { useState } from "react";
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
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import { createClient } from "@/lib/supabase/client";
import { Users, Plus, Trash2, Pencil, Loader2 } from "lucide-react";

export default function EmployeesPage() {
  const { language } = useLanguage();
  const { employees, loading, error, addEmployee, updateEmployee } = useEmployees();
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
    if (!confirm("Supprimer?")) return;
    const supabase = createClient();
    if (!supabase) return;
    const { error: err } = await supabase.from("employees").delete().eq("id", id);
    if (err) {
      console.error("Employees delete failed:", err);
      return;
    }
    location.reload();
  };

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

      <Card className="overflow-hidden transition-shadow hover:shadow-brand-glow">
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
            <div className="divide-y divide-gray-200">
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
                ) : (
                  employees.map((emp, i) => (
                    <motion.div
                      key={emp.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50/50"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">
                          {emp.first_name} {emp.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{emp.role || "—"}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-brand-blue-600 hover:bg-brand-blue-50 min-h-[44px] min-w-[44px]"
                          onClick={() => {
                            setEditId(emp.id);
                            setEditFirstName(emp.first_name);
                            setEditLastName(emp.last_name);
                            setEditRole(emp.role ?? "");
                          }}
                          aria-label={t("edit", language)}
                        >
                          <Pencil className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-600 hover:bg-red-50 min-h-[44px] min-w-[44px]"
                          onClick={() => handleDelete(emp.id)}
                          aria-label={t("delete", language)}
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
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
                console.error("Employees updateEmployee failed:", result.error);
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
