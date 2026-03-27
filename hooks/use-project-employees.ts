"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProjectEmployee, Employee } from "@/types/database";

function mapRow(row: Record<string, unknown>): ProjectEmployee {
  const emp = row.employee as Record<string, unknown> | null;
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    employee_id: row.employee_id as string,
    employee: emp
      ? {
          id: emp.id as string,
          user_id: emp.user_id as string,
          first_name: emp.first_name as string,
          last_name: emp.last_name as string,
          role: (emp.role as string) ?? "",
          created_at: emp.created_at as string | undefined,
        }
      : undefined,
    created_at: row.created_at as string | undefined,
  };
}

export function useProjectEmployees(projectId: string | null) {
  const [assignments, setAssignments] = useState<ProjectEmployee[]>([]);
  const [loading, setLoading] = useState(!!projectId);

  const fetchAssignments = useCallback(async () => {
    if (!projectId) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) {
      setAssignments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("project_members")
      .select("*, employee:employees(id, first_name, last_name, role, user_id)")
      .eq("project_id", projectId)
      .eq("user_id", userId);
    if (!error) {
      setAssignments(((data ?? []) as Record<string, unknown>[]).map(mapRow));
    } else {
      // Backward-compatible fallback for older schemas.
      const { data: legacyData } = await supabase
        .from("project_employees")
        .select("*, employee:employees(id, first_name, last_name, role, user_id)")
        .eq("project_id", projectId);
      setAssignments(((legacyData ?? []) as Record<string, unknown>[]).map(mapRow));
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const assignEmployee = useCallback(
    async (employeeId: string) => {
      if (!projectId) return { error: new Error("Projet manquant") };
      const supabase = createClient();
      if (!supabase) return { error: new Error("Supabase non configuré") };
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      if (!userId) return { error: new Error("Non connecté") };
      const { error: insertError } = await supabase
        .from("project_members")
        .insert({ project_id: projectId, employee_id: employeeId, user_id: userId });
      if (insertError) {
        const { error: legacyInsertError } = await supabase
          .from("project_employees")
          .insert({ project_id: projectId, employee_id: employeeId });
        if (legacyInsertError) return { error: legacyInsertError };
      }
      await fetchAssignments();
      return {};
    },
    [projectId, fetchAssignments]
  );

  const unassignEmployee = useCallback(
    async (projectEmployeeId: string) => {
      const supabase = createClient();
      if (!supabase) return { error: new Error("Supabase non configuré") };
      const { error: delError } = await supabase
        .from("project_members")
        .delete()
        .eq("id", projectEmployeeId)
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "");
      if (delError) {
        const { error: legacyDelError } = await supabase
          .from("project_employees")
          .delete()
          .eq("id", projectEmployeeId);
        if (legacyDelError) return { error: legacyDelError };
      }
      await fetchAssignments();
      return {};
    },
    [fetchAssignments]
  );

  return { assignments, loading, assignEmployee, unassignEmployee, refetch: fetchAssignments };
}
