"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { EmployeePayment } from "@/types/database";

function mapRow(row: Record<string, unknown>): EmployeePayment {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    employee_id: row.employee_id as string,
    project_id: (row.project_id as string | null) ?? null,
    payment_date: row.payment_date as string,
    amount: Number(row.amount ?? 0),
    currency: ((row.currency as string) ?? "EUR") as EmployeePayment["currency"],
    created_at: row.created_at as string | undefined,
  };
}

export function useEmployeePayments(employeeId: string | null) {
  const [payments, setPayments] = useState<EmployeePayment[]>([]);
  const [loading, setLoading] = useState(!!employeeId);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    if (!employeeId) {
      setPayments([]);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase non configuré");
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPayments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("employee_payments")
      .select("*")
      .eq("user_id", user.id)
      .eq("employee_id", employeeId)
      .order("payment_date", { ascending: false });
    if (fetchError) {
      const isMissingTable =
        /relation "employee_payments" does not exist|table.*employee_payments.*does not exist|does not exist/i.test(fetchError.message) ||
        fetchError.code === "42P01";
      setError(
        isMissingTable
          ? "La table employee_payments n'existe pas encore. Exécutez le script SQL payroll dans Supabase."
          : fetchError.message
      );
      setPayments([]);
    } else {
      setError(null);
      setPayments(((data ?? []) as Record<string, unknown>[]).map(mapRow));
    }
    setLoading(false);
  }, [employeeId]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const addPayment = useCallback(
    async (payload: Omit<EmployeePayment, "id" | "user_id" | "employee_id" | "created_at">) => {
      if (!employeeId) return { error: "Employé manquant" };
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: "Non connecté" };
      const { error: insErr } = await supabase.from("employee_payments").insert({
        user_id: user.id,
        employee_id: employeeId,
        ...payload,
      });
      if (insErr) return { error: insErr.message };
      await fetchPayments();
      return {};
    },
    [employeeId, fetchPayments]
  );

  const updatePayment = useCallback(
    async (id: string, payload: Partial<Omit<EmployeePayment, "id" | "user_id" | "employee_id" | "created_at">>) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { error: updErr } = await supabase.from("employee_payments").update(payload).eq("id", id);
      if (updErr) return { error: updErr.message };
      await fetchPayments();
      return {};
    },
    [fetchPayments]
  );

  const deletePayment = useCallback(
    async (id: string) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { error: delErr } = await supabase.from("employee_payments").delete().eq("id", id);
      if (delErr) return { error: delErr.message };
      await fetchPayments();
      return {};
    },
    [fetchPayments]
  );

  return { payments, loading, error, refetch: fetchPayments, addPayment, updatePayment, deletePayment };
}
