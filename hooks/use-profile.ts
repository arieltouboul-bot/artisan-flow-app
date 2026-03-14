"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Currency } from "@/lib/utils";

export interface CompanyProfile {
  id: string;
  user_id: string;
  company_name: string | null;
  siret: string | null;
  address: string | null;
  logo_url: string | null;
  /** Devise : EUR, USD, GBP, ILS */
  currency?: Currency | null;
  created_at?: string;
  updated_at?: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (fetchError) {
      setError(fetchError.message);
      setProfile(null);
    } else {
      setProfile(data as CompanyProfile | null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const upsertProfile = useCallback(
    async (updates: { company_name?: string; siret?: string; address?: string; logo_url?: string | null; currency?: Currency | null }) => {
      const supabase = createClient();
      if (!supabase) return { error: new Error("Supabase non configuré") };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: new Error("Non connecté") };
      const { data, error: upsertError } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            ...updates,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();
      if (upsertError) return { error: upsertError };
      setProfile(data as CompanyProfile);
      return { data };
    },
    []
  );

  return { profile, loading, error, refetch: fetchProfile, upsertProfile };
}
