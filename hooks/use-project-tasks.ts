"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ProjectTask } from "@/types/database";

function mapTask(row: Record<string, unknown>): ProjectTask {
  return {
    id: row.id as string,
    project_id: row.project_id as string,
    label: row.label as string,
    completed: Boolean(row.completed),
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
      const maxOrder = Math.max(0, ...tasks.map((t) => t.sort_order));
      await supabase.from("project_tasks").insert({
        project_id: projectId,
        label: label.trim(),
        completed: false,
        sort_order: maxOrder + 1,
      });
      fetchTasks();
    },
    [projectId, tasks, fetchTasks]
  );

  const toggleTask = useCallback(
    async (taskId: string, completed: boolean) => {
      const supabase = createClient();
      if (!supabase) return;
      await supabase.from("project_tasks").update({ completed }).eq("id", taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed } : t)));
    },
    []
  );

  const updateTask = useCallback(
    async (taskId: string, label: string) => {
      const supabase = createClient();
      if (!supabase) return;
      await supabase.from("project_tasks").update({ label: label.trim() }).eq("id", taskId);
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, label: label.trim() } : t)));
    },
    []
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      const supabase = createClient();
      if (!supabase) return;
      await supabase.from("project_tasks").delete().eq("id", taskId);
      fetchTasks();
    },
    [fetchTasks]
  );

  return { tasks, loading, refetch: fetchTasks, addTask, toggleTask, updateTask, deleteTask };
}
