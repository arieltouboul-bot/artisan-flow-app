"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Reminder {
  id: string;
  user_id: string;
  label: string;
  completed: boolean;
  created_at?: string;
}

export function useReminders() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setReminders([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      setReminders([]);
    } else {
      setReminders((data as Reminder[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const addReminder = useCallback(async (label: string) => {
    const supabase = createClient();
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("reminders").insert({ user_id: user.id, label: label.trim(), completed: false });
    fetchReminders();
  }, [fetchReminders]);

  const toggleReminder = useCallback(async (id: string, completed: boolean) => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from("reminders").update({ completed }).eq("id", id);
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, completed } : r)));
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from("reminders").delete().eq("id", id);
    fetchReminders();
  }, [fetchReminders]);

  return { reminders, loading, addReminder, toggleReminder, deleteReminder, refetch: fetchReminders };
}
