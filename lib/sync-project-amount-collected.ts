import { createClient } from "@/lib/supabase/client";
import { totalProjectRevenueEur } from "@/lib/project-finance";
import { parseStoredRevenueCurrency } from "@/lib/utils";

/**
 * Aligne `projects.amount_collected` sur la somme réelle (transactions + lignes revenus), en EUR.
 */
export async function syncProjectAmountCollected(projectId: string): Promise<{ error: string | null }> {
  const supabase = createClient();
  if (!supabase) return { error: "Supabase non configuré" };

  const { data: txData } = await supabase.from("project_transactions").select("amount").eq("project_id", projectId);
  const pTx = (txData ?? []).map((r: { amount: number }) => ({ amount: Number(r.amount) }));

  const { data: revData } = await supabase.from("revenues").select("amount, currency").eq("project_id", projectId);
  const pRev = (revData ?? []).map((r: { amount: number; currency: string | null }) => ({
    amount: Number(r.amount),
    currency: parseStoredRevenueCurrency(r.currency),
  }));

  const totalEur = totalProjectRevenueEur(pTx, pRev);
  const { error } = await supabase
    .from("projects")
    .update({ amount_collected: totalEur, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  return { error: error?.message ?? null };
}
