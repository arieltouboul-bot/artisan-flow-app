\"use client\";

import { useState, useEffect, useCallback } from \"react\";
import { createClient } from \"@/lib/supabase/client\";
import type { Client } from \"@/types/database\";

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setError(\"Supabase non configuré (vérifiez .env.local)\");
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setClients([]);
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: fetchError } = await supabase
      .from(\"clients\")
      .select(\"id, name, email, phone, address, contract_amount, material_costs, amount_collected, created_at, user_id\")
      .eq(\"user_id\", user.id)
      .order(\"created_at\", { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
      setClients([]);
    } else {
      setClients((data as Client[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel("clients-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clients" },
        () => {
          fetchClients();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchClients]);

  return { clients, loading, error, refetch: fetchClients };
}
