"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTodayAppointments } from "./use-appointments";

/** True if any appointment starts in the next 60 minutes (for red badge on Calendrier). */
export function useAppointmentSoon(): boolean {
  const { appointments } = useTodayAppointments();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  return useMemo(() => {
    if (!now) return false;
    const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
    return appointments.some((a) => {
      const start = new Date(a.start_at);
      return start >= now && start <= inOneHour;
    });
  }, [appointments, now]);
}

/** Number of projects not updated (no payment or note) in the last 7 days (for orange badge on Projets). */
export function useStaleProjectsCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      const cutoffIso = cutoff.toISOString();
      const { data: projects } = await supabase
        .from("projects")
        .select("id, updated_at")
        .eq("user_id", user.id);
      if (cancelled) return;
      const stale = (projects ?? []).filter(
        (p: { updated_at: string | null }) => !p.updated_at || p.updated_at < cutoffIso
      );
      setCount(stale.length);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return count;
}
