import { createClient } from "@/lib/supabase/client";
import type { CashFlowLine, ProjectMarginRow } from "@/lib/finance-analytics-types";
import { syncProjectAmountCollected } from "@/lib/sync-project-amount-collected";
import { convertCurrency, parseStoredRevenueCurrency, type Currency } from "@/lib/utils";

function parseLineId(line: CashFlowLine): { kind: "transaction" | "revenue"; id: string } {
  if (line.id.startsWith("tx-")) return { kind: "transaction", id: line.id.slice(3) };
  if (line.id.startsWith("rev-")) return { kind: "revenue", id: line.id.slice(4) };
  throw new Error("Invalid cash line id");
}

export async function updateCashFlowLineAmountEur(line: CashFlowLine, newEur: number): Promise<{ error: string | null }> {
  const supabase = createClient();
  if (!supabase) return { error: "Supabase non configuré" };
  const { kind, id } = parseLineId(line);

  if (kind === "transaction") {
    const { error } = await supabase
      .from("project_transactions")
      .update({ amount: newEur })
      .eq("id", id);
    if (error) return { error: error.message };
  } else {
    const cur = parseStoredRevenueCurrency(line.currency);
    const newStored = convertCurrency(newEur, cur as Currency);
    const { error } = await supabase.from("revenues").update({ amount: newStored }).eq("id", id);
    if (error) return { error: error.message };
  }

  const sync = await syncProjectAmountCollected(line.projectId);
  return { error: sync.error };
}

export async function updateProjectContractBudgetEur(projectId: string, newBudgetEur: number): Promise<{ error: string | null }> {
  const supabase = createClient();
  if (!supabase) return { error: "Supabase non configuré" };
  const { error } = await supabase
    .from("projects")
    .update({ contract_amount: newBudgetEur, updated_at: new Date().toISOString() })
    .eq("id", projectId);
  if (error) return { error: error.message };
  return syncProjectAmountCollected(projectId);
}

export async function updateProjectMarginByTargetMarginEur(
  row: ProjectMarginRow,
  newMarginEur: number
): Promise<{ error: string | null }> {
  const rev = row.revenueEur;
  const newTotalExp = rev - newMarginEur;
  const newMaterial = newTotalExp - row.expenseLinesTtcEur - row.rentalExpenseEur;
  if (newMaterial < -1e-6) {
    return { error: "NEGATIVE_MATERIAL" };
  }
  const supabase = createClient();
  if (!supabase) return { error: "Supabase non configuré" };
  const { error } = await supabase
    .from("projects")
    .update({
      material_costs: Math.max(0, newMaterial),
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.projectId);
  return { error: error?.message ?? null };
}
