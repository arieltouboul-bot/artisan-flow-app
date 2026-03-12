"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Employee } from "@/types/database";

function mapRow(row: Record<string, unknown>): Employee {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    first_name: row.first_name as string,
    last_name: row.last_name as string,
    role: (row.role as string) ?? "",
    created_at: row.created_at as string | undefined,
  };
}

export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEmployees = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase non configuré");
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setEmployees([]);
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: fetchError } = await supabase
      .from("employees")
      .select("*")
      .eq("user_id", user.id)
      .order("last_name", { ascending: true });
    if (fetchError) {
      const msg = fetchError.message;
      const isMissingTable =
        /relation "employees" does not exist|table.*employees.*does not exist|does not exist/i.test(msg) ||
        fetchError.code === "42P01";
      setError(
        isMissingTable
          ? "La table des employés n'existe pas encore. Exécutez le script SQL supabase-employees.sql dans le SQL Editor de Supabase."
          : msg
      );
      setEmployees([]);
    } else {
      setEmployees(((data ?? []) as Record<string, unknown>[]).map(mapRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const addEmployee = useCallback(
    async (firstName: string, lastName: string, role: string) => {
      const supabase = createClient();
      if (!supabase) return { error: new Error("Supabase non configuré") };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: new Error("Non connecté") };
      const { error: insertError } = await supabase
        .from("employees")
        .insert({
          user_id: user.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          role: role.trim() || "",
        });
      if (insertError) return { error: insertError };
      await fetchEmployees();
      return {};
    },
    [fetchEmployees]
  );

  const deleteEmployee = useCallback(
    async (id: string) => {
      const supabase = createClient();
      if (!supabase) return { error: new Error("Supabase non configuré") };
      const { error: delError } = await supabase.from("employees").delete().eq("id", id);
      if (delError) return { error: delError };
      await fetchEmployees();
      return {};
    },
    [fetchEmployees]
  );

  return { employees, loading, error, refetch: fetchEmployees, addEmployee, deleteEmployee };
}
