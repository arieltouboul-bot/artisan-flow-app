"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Project, Client } from "@/types/database";
import { amountInCurrencyToEur, parseStoredRevenueCurrency } from "@/lib/utils";

export function mapProjectRow(row: Record<string, unknown>): Project {
  const client = row.client as Record<string, unknown> | null;
  return {
    id: row.id as string,
    name: row.name as string,
    client_id: row.client_id as string,
    client: client
      ? {
          id: client.id as string,
          name: client.name as string,
          email: (client.email as string) ?? null,
          phone: (client.phone as string) ?? null,
          address: (client.address as string) ?? null,
          contract_amount: (client.contract_amount as number) ?? null,
          material_costs: (client.material_costs as number) ?? null,
          amount_collected: (client.amount_collected as number) ?? null,
          created_at: client.created_at as string | undefined,
        }
      : undefined,
    status: (row.status as Project["status"]) ?? "en_preparation",
    address: (row.address as string) ?? null,
    start_date: (row.start_date as string) ?? null,
    end_date: (row.end_date as string) ?? null,
    started_at: (row.started_at as string) ?? null,
    ended_at: (row.ended_at as string) ?? null,
    notes: (row.notes as string) ?? null,
    contract_amount: (row.contract_amount as number) ?? null,
    material_costs: (row.material_costs as number) ?? null,
    amount_collected: (row.amount_collected as number) ?? null,
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    updated_at: (row.updated_at as string) ?? new Date().toISOString(),
  };
}

export function useProjects(clientId?: string | null) {
  const [projects, setProjects] = useState<Project[]>([]);
  /** Somme des revenus (table `revenues`) par projet, en équivalent EUR — pour progression vs budget */
  const [revenuePaidEurByProject, setRevenuePaidEurByProject] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les données en cache (offline) au premier rendu
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("artisanflow_projects_cache");
      if (raw) {
        const parsed = JSON.parse(raw) as Project[];
        if (parsed.length) {
          setProjects(parsed);
          setLoading(false);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchProjects = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase non configuré");
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProjects([]);
      setRevenuePaidEurByProject({});
      setLoading(false);
      return;
    }
    setError(null);
    let query = supabase
      .from("projects")
      .select("*, client:clients(id, name, email, phone, address, contract_amount, material_costs, amount_collected, created_at)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (clientId) query = query.eq("client_id", clientId);
    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setRevenuePaidEurByProject({});
    } else {
      const mapped = ((data ?? []) as Record<string, unknown>[]).map(mapProjectRow);
      setProjects(mapped);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem("artisanflow_projects_cache", JSON.stringify(mapped));
        } catch {
          // ignore
        }
      }
      const { data: revData } = await supabase
        .from("revenues")
        .select("project_id, amount, currency")
        .eq("user_id", user.id);
      const revenueMap: Record<string, number> = {};
      for (const r of revData ?? []) {
        const row = r as { project_id: string; amount: number; currency: string | null };
        const eur = amountInCurrencyToEur(Number(row.amount), parseStoredRevenueCurrency(row.currency));
        revenueMap[row.project_id] = (revenueMap[row.project_id] ?? 0) + eur;
      }
      setRevenuePaidEurByProject(revenueMap);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel("projects-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        fetchProjects();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "revenues" }, () => {
        fetchProjects();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProjects]);

  return { projects, loading, error, refetch: fetchProjects, revenuePaidEurByProject };
}

export function useProject(projectId: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(!!projectId);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) {
      setProject(null);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase non configuré");
      setLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setProject(null);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("projects")
      .select("*, client:clients(id, name, email, phone, address, contract_amount, material_costs, amount_collected, created_at)")
      .eq("id", projectId)
      .eq("user_id", user.id)
      .single();
    if (fetchError) {
      setError(fetchError.message);
      setProject(null);
    } else {
      setProject(mapProjectRow((data ?? {}) as Record<string, unknown>));
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    if (!projectId) return;
    const supabase = createClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`project-row-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects", filter: `id=eq.${projectId}` },
        () => {
          fetchProject();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, fetchProject]);

  return { project, loading, error, refetch: fetchProject };
}
