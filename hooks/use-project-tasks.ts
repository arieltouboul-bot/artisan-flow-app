"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProjectTask } from "@/types/database";

function mapTask(row: Record<string, unknown>): ProjectTask {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    label: ((row.label as string) ?? (row.title as string) ?? "") as string,
    completed: Boolean((row.completed as boolean) ?? (row.is_completed as boolean)),
    sort_order: (row.sort_order as number) ?? 0,
    created_at: row.created_at as string | undefined,
  };
}

export function useProjectTasks(projectId: string | null) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(!!projectId);

  const fetchTasks = useCallback(async () => {
    if (!projectId) {
      setTasks([]);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    // Liste par projet uniquement : le filtre user_id excluait les lignes legacy (user_id NULL).
    // La sécurité repose sur les politiques RLS (projet appartenant à auth.uid()).
    const { data, error } = await supabase
      .from("project_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("sort_order", { ascending: true });
    if (error) {
      setTasks([]);
    } else {
      setTasks(((data ?? []) as Record<string, unknown>[]).map(mapTask));
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    setLoading(true);
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(
    async (label: string) => {
      if (!projectId) return;
      const supabase = createClient();
      if (!supabase) return;
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      const maxOrder = Math.max(0, ...tasks.map((t) => t.sort_order));
      const sort_order = maxOrder + 1;
      const labelTrim = label.trim();
      const withOwner = userId
        ? {
            project_id: projectId,
            user_id: userId,
            label: labelTrim,
            title: labelTrim,
            completed: false,
            is_completed: false,
            sort_order,
          }
        : null;
      let inserted: Record<string, unknown> | null = null;
      if (withOwner) {
        const { data, error } = await supabase.from("project_tasks").insert(withOwner).select("*").single();
        if (!error && data) inserted = data as Record<string, unknown>;
      }
      if (!inserted) {
        const { data, error } = await supabase
          .from("project_tasks")
          .insert({
            project_id: projectId,
            label: labelTrim,
            completed: false,
            sort_order,
          })
          .select("*")
          .single();
        if (!error && data) inserted = data as Record<string, unknown>;
        else if (error) {
          await supabase.from("project_tasks").insert({
            project_id: projectId,
            label: labelTrim,
            completed: false,
            sort_order,
          });
        }
      }
      if (inserted) {
        setTasks((prev) => [...prev, mapTask(inserted!)]);
      }
      await fetchTasks();
    },
    [projectId, tasks, fetchTasks]
  );

  const toggleTask = useCallback(
    async (taskId: string, completed: boolean) => {
      setTasks((prev) => prev.map((row) => (row.id === taskId ? { ...row, completed } : row)));
      const supabase = createClient();
      if (!supabase) return;
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      // Support both schemas: is_completed (new) and completed (legacy)
      let isQ = supabase.from("project_tasks").update({ is_completed: completed }).eq("id", taskId);
      if (userId) isQ = isQ.eq("user_id", userId);
      const { error: isCompletedErr } = await isQ;
      if (isCompletedErr) {
        let legQ = supabase.from("project_tasks").update({ completed }).eq("id", taskId);
        if (userId) legQ = legQ.eq("user_id", userId);
        const { error: legErr } = await legQ;
        if (legErr) {
          await supabase.from("project_tasks").update({ completed }).eq("id", taskId);
        }
      }
      await fetchTasks();
    },
    [fetchTasks]
  );

  const updateTask = useCallback(
    async (taskId: string, label: string) => {
      const supabase = createClient();
      if (!supabase) return;
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      let up = supabase
        .from("project_tasks")
        .update({ label: label.trim(), title: label.trim() })
        .eq("id", taskId);
      if (userId) up = up.eq("user_id", userId);
      const { error } = await up;
      if (error) {
        let leg = supabase.from("project_tasks").update({ label: label.trim() }).eq("id", taskId);
        if (userId) leg = leg.eq("user_id", userId);
        const { error: e2 } = await leg;
        if (e2) await supabase.from("project_tasks").update({ label: label.trim() }).eq("id", taskId);
      }
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, label: label.trim() } : t)));
      await fetchTasks();
    },
    [fetchTasks]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const supabase = createClient();
      if (!supabase) return;
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      let del = supabase.from("project_tasks").delete().eq("id", taskId);
      if (userId) del = del.eq("user_id", userId);
      const { error } = await del;
      if (error) {
        await supabase.from("project_tasks").delete().eq("id", taskId);
      }
      await fetchTasks();
    },
    [fetchTasks]
  );

  return { tasks, loading, refetch: fetchTasks, addTask, toggleTask, updateTask, deleteTask };
}
