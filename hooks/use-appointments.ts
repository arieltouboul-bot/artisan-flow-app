"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Appointment, AppointmentType } from "@/types/database";

function mapRow(row: Record<string, unknown>): Appointment {
  const project = row.project as Record<string, unknown> | null;
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    title: row.title as string,
    project_id: (row.project_id as string) ?? null,
    project: project
      ? { id: project.id as string, name: project.name as string, address: (project.address as string | null) ?? null }
      : null,
    start_at: row.start_at as string,
    end_at: row.end_at as string,
    type: (row.type as AppointmentType) ?? "chantier",
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  };
}

export function useAppointments(start?: Date | null, end?: Date | null) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les rendez-vous en cache (offline) au premier rendu
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("artisanflow_appointments_cache");
      if (raw) {
        const parsed = JSON.parse(raw) as Appointment[];
        if (parsed.length) {
          setAppointments(parsed);
          setLoading(false);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setAppointments([]);
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAppointments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase
      .from("appointments")
      .select("*, project:projects(id, name, address)")
      .eq("user_id", user.id)
      .order("start_at", { ascending: true });
    if (start) {
      query = query.gte("start_at", start.toISOString());
    }
    if (end) {
      query = query.lte("end_at", end.toISOString());
    }
    const { data, error } = await query;
    if (error) {
      // on garde les derniers rendez-vous connus (offline)
    } else {
      const mapped = ((data ?? []) as Record<string, unknown>[]).map(mapRow);
      setAppointments(mapped);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("artisanflow_appointments_cache", JSON.stringify(mapped));
        } catch {
          // ignore
        }
      }
    }
    setLoading(false);
  }, [start?.toISOString(), end?.toISOString()]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const addAppointment = useCallback(
    async (params: {
      title: string;
      project_id: string | null;
      start_at: string;
      end_at: string;
      type: AppointmentType;
    }) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: "Non connecté" };
      const { data, error } = await supabase
        .from("appointments")
        .insert({
          user_id: user.id,
          title: params.title.trim(),
          project_id: params.project_id || null,
          start_at: params.start_at,
          end_at: params.end_at,
          type: params.type,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) return { error: error.message };
      setAppointments((prev) => [...prev, mapRow(data as Record<string, unknown>)]);
      return { data: mapRow(data as Record<string, unknown>), error: null };
    },
    []
  );

  const updateAppointment = useCallback(
    async (
      id: string,
      params: Partial<{
        title: string;
        project_id: string | null;
        start_at: string;
        end_at: string;
        type: AppointmentType;
      }>
    ) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { error } = await supabase
        .from("appointments")
        .update({ ...params, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return { error: error.message };
      await fetchAppointments();
      return { error: null };
    },
    [fetchAppointments]
  );

  const deleteAppointment = useCallback(
    async (id: string) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { error } = await supabase.from("appointments").delete().eq("id", id);
      if (error) return { error: error.message };
      setAppointments((prev) => prev.filter((a) => a.id !== id));
      return { error: null };
    },
    []
  );

  return {
    appointments,
    loading,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    refetch: fetchAppointments,
  };
}

/** Rendez-vous du jour (pour le dashboard) */
export function useTodayAppointments() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  return useAppointments(start, end);
}
