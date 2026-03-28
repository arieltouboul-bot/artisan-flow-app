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
    async (label: string): Promise<{ ok: boolean; error?: string }> => {
      if (!projectId) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[tasks] addTask aborted: missing projectId");
        }
        return { ok: false, error: "missing_project_id" };
      }
      const supabase = createClient();
      if (!supabase) {
        return { ok: false, error: "no_supabase_client" };
      }

      const { data: topRow } = await supabase
        .from("project_tasks")
        .select("sort_order")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevOrder = Number(topRow?.sort_order ?? 0);
      const sort_order = Number.isFinite(prevOrder) ? prevOrder + 1 : 1;
      const labelTrim = label.trim();

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;

      const legacyPayload = {
        project_id: projectId,
        label: labelTrim,
        completed: false,
        sort_order,
      };

      let lastError: { message: string } | null = null;
      let inserted: Record<string, unknown> | null = null;
      let writeOk = false;

      if (userId) {
        const fullPayload = {
          ...legacyPayload,
          user_id: userId,
          title: labelTrim,
          is_completed: false,
        };
        const r1 = await supabase.from("project_tasks").insert(fullPayload).select("*").single();
        if (process.env.NODE_ENV === "development") {
          console.log("[tasks] insert (with user_id)", {
            project_id: projectId,
            ok: !r1.error,
            code: (r1.error as { code?: string } | null)?.code,
            message: r1.error?.message,
          });
        }
        if (!r1.error) {
          writeOk = true;
          if (r1.data) inserted = r1.data as Record<string, unknown>;
        } else lastError = r1.error;
      }

      if (!writeOk) {
        const r2 = await supabase.from("project_tasks").insert(legacyPayload).select("*").single();
        if (process.env.NODE_ENV === "development") {
          console.log("[tasks] insert (legacy)", {
            project_id: projectId,
            ok: !r2.error,
            code: (r2.error as { code?: string } | null)?.code,
            message: r2.error?.message,
          });
        }
        if (!r2.error) {
          writeOk = true;
          if (r2.data) inserted = r2.data as Record<string, unknown>;
        } else {
          lastError = r2.error;
          const r3 = await supabase.from("project_tasks").insert(legacyPayload);
          if (process.env.NODE_ENV === "development") {
            console.log("[tasks] insert (no select)", { project_id: projectId, ok: !r3.error, message: r3.error?.message });
          }
          if (!r3.error) {
            writeOk = true;
          } else {
            lastError = r3.error;
          }
        }
      }

      if (inserted) {
        setTasks((prev) => [...prev, mapTask(inserted!)]);
      }

      await fetchTasks();

      if (process.env.NODE_ENV === "development") {
        console.log("[tasks] addTask done", {
          project_id: projectId,
          ok: writeOk,
          rowId: (inserted?.id as string) ?? null,
        });
      }

      return { ok: writeOk, error: writeOk ? undefined : lastError?.message };
    },
    [projectId, fetchTasks]
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
