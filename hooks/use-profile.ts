"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Currency } from "@/lib/utils";

export type PreferredLanguage = "fr" | "en";

export interface CompanyProfile {
  id: string;
  user_id: string;
  company_name: string | null;
  siret: string | null;
  address: string | null;
  logo_url: string | null;
  /** Devise d'affichage (colonnes preferred_currency ou currency) */
  currency?: Currency | null;
  preferred_currency?: Currency | null;
  preferred_language?: PreferredLanguage | null;
  language_pref?: PreferredLanguage | null;
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
      setLoading(false);
      return;
    }
    let profileData = data as CompanyProfile | null;
    if (!profileData && user) {
      const meta = user.user_metadata as Record<string, unknown> | undefined;
      const { data: inserted, error: upsertErr } = await supabase.from("profiles").upsert(
        {
          user_id: user.id,
          company_name: (meta?.company_name as string) ?? null,
          preferred_language: (meta?.preferred_language === "en" ? "en" : "fr") as PreferredLanguage,
          preferred_currency: (meta?.preferred_currency as Currency) ?? "EUR",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      ).select().single();
      if (!upsertErr && inserted) profileData = inserted as CompanyProfile;
    }
    setProfile(profileData);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const upsertProfile = useCallback(
    async (updates: {
      company_name?: string;
      siret?: string;
      address?: string;
      logo_url?: string | null;
      currency?: Currency | null;
      preferred_currency?: Currency | null;
      preferred_language?: PreferredLanguage | null;
    }) => {
      const supabase = createClient();
      if (!supabase) return { error: new Error("Supabase non configuré") };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: new Error("Non connecté") };
      const payload: Record<string, unknown> = { user_id: user.id, updated_at: new Date().toISOString(), ...updates };
      if (updates.preferred_currency !== undefined) payload.preferred_currency = updates.preferred_currency;
      if (updates.currency !== undefined) payload.currency = updates.currency;
      const { data, error: upsertError } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();
      if (upsertError) return { error: upsertError };
      setProfile(data as CompanyProfile);
      return { data };
    },
    []
  );

  const displayCurrency = (profile?.preferred_currency ?? profile?.currency ?? "EUR") as Currency;
  return { profile, loading, error, refetch: fetchProfile, upsertProfile, displayCurrency };
}
