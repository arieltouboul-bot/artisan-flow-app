"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface DailyBriefing {
  summary: string;
  appointmentCount: number;
  amountToCollect: number | null;
  clientNameForAmount: string | null;
}

/** Builds the proactive welcome message for the IA on the dashboard. */
export function useDailyBriefing(): DailyBriefing {
  const [briefing, setBriefing] = useState<DailyBriefing>({
    summary: "",
    appointmentCount: 0,
    amountToCollect: null,
    clientNameForAmount: null,
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      const [appointmentsRes, projectsRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("id")
          .eq("user_id", user.id)
          .gte("start_at", start.toISOString())
          .lte("end_at", end.toISOString()),
        supabase
          .from("projects")
          .select("id, contract_amount, amount_collected, client:clients(name)")
          .eq("user_id", user.id),
      ]);

      if (cancelled) return;

      const appointmentCount = (appointmentsRes.data ?? []).length;
      const projects = (projectsRes.data ?? []) as unknown as {
        contract_amount: number | null;
        amount_collected: number | null;
        client?: { name: string } | null;
      }[];
      let amountToCollect: number | null = null;
      let clientNameForAmount: string | null = null;
      for (const p of projects) {
        const restant = Math.max(0, (p.contract_amount ?? 0) - (p.amount_collected ?? 0));
        if (restant > 0 && (amountToCollect == null || restant > amountToCollect)) {
          amountToCollect = restant;
          clientNameForAmount = p.client?.name ?? null;
        }
      }

      const appointmentPart =
        appointmentCount === 0
          ? "Aucun rendez-vous aujourd'hui"
          : appointmentCount === 1
            ? "1 rendez-vous aujourd'hui"
            : `${appointmentCount} rendez-vous aujourd'hui`;
      const amountPart =
        amountToCollect != null && amountToCollect > 0 && clientNameForAmount
          ? `et ${Math.round(amountToCollect)} € à encaisser chez le client ${clientNameForAmount}`
          : null;
      const summary =
        appointmentCount === 0 && !amountPart
          ? "Bonjour ! Comment puis-je vous aider ?"
          : `Bonjour ! ${appointmentPart}${amountPart ? ` ${amountPart}` : ""}. Voulez-vous que je prépare le récapitulatif ?`;

      setBriefing({
        summary,
        appointmentCount,
        amountToCollect: amountToCollect ?? null,
        clientNameForAmount,
      });
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return briefing;
}
