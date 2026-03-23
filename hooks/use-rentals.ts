"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Rental } from "@/types/database";

function mapRow(row: Record<string, unknown>): Rental {
  return {
    id: row.id as string,
    user_id: row.user_id as string,
    project_id: row.project_id as string,
    equipment_name: (row.equipment_name as string) ?? "",
    renter_name: (row.renter_name as string) ?? "",
    start_date: (row.start_date as string) ?? "",
    end_date: (row.end_date as string) ?? "",
    price_per_day: Number(row.price_per_day ?? 0),
    created_at: row.created_at as string | undefined,
    updated_at: row.updated_at as string | undefined,
  };
}

export function rentalDurationDays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diff = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Math.max(0, diff);
}

export function rentalTotalCostEur(r: Pick<Rental, "start_date" | "end_date" | "price_per_day">): number {
  return rentalDurationDays(r.start_date, r.end_date) * (Number(r.price_per_day) || 0);
}

export function useRentals() {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRentals = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setRentals([]);
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setRentals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("rentals")
      .select("*")
      .eq("user_id", user.id)
      .order("end_date", { ascending: true });
    if (fetchError) {
      const isMissingTable =
        /relation "rentals" does not exist|table.*rentals.*does not exist|does not exist/i.test(fetchError.message) ||
        fetchError.code === "42P01";
      setError(
        isMissingTable
          ? "La table rentals n'existe pas encore. Exécutez le script SQL de location dans Supabase."
          : fetchError.message
      );
      setRentals([]);
    } else {
      setError(null);
      setRentals(((data ?? []) as Record<string, unknown>[]).map(mapRow));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  const addRental = useCallback(
    async (payload: Omit<Rental, "id" | "user_id" | "created_at" | "updated_at">) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: "Non connecté" };
      const { error: insertError } = await supabase.from("rentals").insert({
        user_id: user.id,
        ...payload,
        updated_at: new Date().toISOString(),
      });
      if (insertError) return { error: insertError.message };
      await fetchRentals();
      return {};
    },
    [fetchRentals]
  );

  const updateRental = useCallback(
    async (id: string, payload: Partial<Omit<Rental, "id" | "user_id" | "created_at" | "updated_at">>) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { error: updateError } = await supabase
        .from("rentals")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (updateError) return { error: updateError.message };
      await fetchRentals();
      return {};
    },
    [fetchRentals]
  );

  const deleteRental = useCallback(
    async (id: string) => {
      const supabase = createClient();
      if (!supabase) return { error: "Supabase non configuré" };
      const { error: delError } = await supabase.from("rentals").delete().eq("id", id);
      if (delError) return { error: delError.message };
      await fetchRentals();
      return {};
    },
    [fetchRentals]
  );

  return { rentals, loading, error, refetch: fetchRentals, addRental, updateRental, deleteRental };
}
