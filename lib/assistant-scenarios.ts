/**
 * Extended natural-language scenarios for the AI Command Center.
 * Returns true if the message was handled (caller should return early).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Language } from "@/lib/translations";

type Append = (
  role: "user" | "assistant",
  text: string,
  extra?: { chartData?: { name: string; value: number }[] }
) => void;

function parseMoney(s: string): number | null {
  const m = s.replace(/\s/g, "").match(/(\d+(?:[.,]\d+)?)\s*(?:k|K)?/);
  if (!m) return null;
  let n = parseFloat(m[1].replace(",", "."));
  if (/k/i.test(s)) n *= 1000;
  return n;
}

function findProjectByName(
  projects: { id: string; name: string }[],
  name: string
): { id: string; name: string } | undefined {
  const q = name.toLowerCase().trim();
  return projects.find((p) => p.name.toLowerCase().includes(q) || q.includes(p.name.toLowerCase()));
}

export async function runExtendedAssistantScenarios(opts: {
  text: string;
  lower: string;
  language: Language;
  userId: string;
  supabase: SupabaseClient;
  appendMessage: Append;
  router: { push: (href: string) => void };
}): Promise<boolean> {
  const { text, lower, language, userId, supabase, appendMessage, router } = opts;

  // ——— Total spending this month
  if (
    (/(total|combien).{0,40}(spending|dépenses|dépense|spent|payé)/i.test(text) ||
      /(how much|what).{0,30}(did i spend|have i spent|this month)/i.test(lower)) &&
    /(this month|ce mois|du mois)/i.test(lower)
  ) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const { data: withDates } = await supabase
      .from("expenses")
      .select("amount_ht, tva_rate, amount_ttc, date, invoice_date")
      .eq("user_id", userId);
    let total = 0;
    for (const r of withDates ?? []) {
      const row = r as {
        amount_ht: number;
        tva_rate: number;
        amount_ttc?: number | null;
        date: string;
        invoice_date?: string | null;
      };
      const dStr = row.invoice_date || row.date;
      const d = new Date(dStr.includes("T") ? dStr : `${dStr}T12:00:00`);
      if (d.getMonth() !== m || d.getFullYear() !== y) continue;
      const ttc =
        row.amount_ttc != null && !Number.isNaN(Number(row.amount_ttc))
          ? Number(row.amount_ttc)
          : Number(row.amount_ht) * (1 + (Number(row.tva_rate) || 20) / 100);
      total += ttc;
    }
    appendMessage(
      "assistant",
      language === "en"
        ? `**Total spending this month (incl. VAT):** ${Math.round(total * 100) / 100} € (from recorded expenses).`
        : `**Total des dépenses ce mois (TTC) :** ${Math.round(total * 100) / 100} € (d'après les dépenses enregistrées).`
    );
    return true;
  }

  // ——— Invoices from last week → navigate + filter
  if (
    (/(invoice|facture|dépense)/i.test(lower) && /(last week|semaine dernière)/i.test(lower)) ||
    /(show|montre|liste).{0,30}(invoice|facture).{0,20}(last week|semaine dernière)/i.test(lower)
  ) {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("artisanflow_invoice_filter", JSON.stringify({ period: "last_week" }));
    }
    router.push("/factures");
    appendMessage(
      "assistant",
      language === "en"
        ? "Opening **Invoices** with **last week** date filter applied."
        : "Ouverture des **factures** avec le filtre **semaine dernière**."
    );
    return true;
  }

  // ——— Update project budget
  const budgetUpdateEn =
    /(?:update|set|change)\s+(?:the\s+)?(?:budget|contract(?:\s+amount)?)\s+(?:of|for)\s+(?:the\s+)?(?:project\s+)?(.+?)\s+to\s+([\d\s.,]+(?:k|K)?)/i.exec(
      text
    );
  const budgetUpdateFr =
    /(?:mets?|mettre|modifie)\s+(?:le\s+)?(?:budget|contrat)\s+(?:du\s+)?(?:projet\s+)?(.+?)\s+(?:à|sur)\s+([\d\s.,]+(?:k|K)?)\s*€?/i.exec(
      text
    );
  const budgetMatch = budgetUpdateEn || budgetUpdateFr;
  if (budgetMatch) {
    const projectName = budgetMatch[1].trim().replace(/[.,]$/, "");
    const amount = parseMoney(budgetMatch[2]);
    if (projectName.length >= 2 && amount != null && amount > 0) {
      const { data: projects } = await supabase.from("projects").select("id, name").eq("user_id", userId);
      const proj = findProjectByName((projects ?? []) as { id: string; name: string }[], projectName);
      if (!proj) {
        appendMessage(
          "assistant",
          language === "en"
            ? `I couldn't find a project matching « ${projectName} ». Check the name or open **Projects** to see the exact title.`
            : `Je n'ai pas trouvé de projet correspondant à « ${projectName} ». Vérifie le nom dans **Projets**.`
        );
        return true;
      }
      const { error } = await supabase
        .from("projects")
        .update({ contract_amount: amount, updated_at: new Date().toISOString() })
        .eq("id", proj.id)
        .eq("user_id", userId);
      if (error) {
        appendMessage("assistant", language === "en" ? `Could not update: ${error.message}` : `Échec : ${error.message}`);
        return true;
      }
      appendMessage(
        "assistant",
        language === "en"
          ? `Updated **${proj.name}** contract budget to **${Math.round(amount)} €**.`
          : `Budget du projet **${proj.name}** mis à **${Math.round(amount)} €**.`
      );
      return true;
    }
  }

  // ——— Mark project as completed
  const doneEn =
    /(?:mark|set)\s+(?:project\s+)?(.+?)\s+as\s+(?:completed|done|finished)/i.exec(text) ||
    /(?:complete|finish)\s+(?:project\s+)?(.+?)(?:\.|$)/i.exec(text);
  const doneFr =
    /(?:termine|terminer)\s+(?:le\s+)?(?:projet\s+)?(.+?)(?:\.|$)/i.exec(text) ||
    /(?:projet|chantier)\s+(.+?)\s+(?:terminé|fini|clos)/i.exec(text);
  const doneMatch = doneEn || doneFr;
  const wantsComplete =
    /(mark|set).+\s+as\s+(completed|done|finished)/i.test(text) ||
    /(?:complete|finish)\s+(?:the\s+)?project/i.test(lower) ||
    /terminer\s+(?:le\s+)?projet/i.test(lower) ||
    /(?:projet|chantier)\s+.+\s+termin/i.test(lower);
  if (wantsComplete && doneMatch) {
    const projectName = doneMatch[1].trim().replace(/[.,]$/, "");
    if (projectName.length >= 2) {
      const { data: projects } = await supabase.from("projects").select("id, name").eq("user_id", userId);
      const proj = findProjectByName((projects ?? []) as { id: string; name: string }[], projectName);
      if (!proj) {
        appendMessage(
          "assistant",
          language === "en"
            ? `No project found for « ${projectName} ».`
            : `Aucun projet trouvé pour « ${projectName} ».`
        );
        return true;
      }
      const { error } = await supabase
        .from("projects")
        .update({ status: "termine", updated_at: new Date().toISOString(), ended_at: new Date().toISOString() })
        .eq("id", proj.id)
        .eq("user_id", userId);
      if (error) {
        appendMessage("assistant", error.message);
        return true;
      }
      appendMessage(
        "assistant",
        language === "en"
          ? `**${proj.name}** is now marked as **completed**.`
          : `**${proj.name}** est marqué comme **terminé**.`
      );
      return true;
    }
  }

  // ——— Remove N items from stock (inventory)
  const stockRemove =
    /(?:remove|subtract|take|retire|enlève)\s+(\d+)\s+(.+?)(?:\s+from\s+stock|\s+du\s+stock)?(?:\.|$)/i.exec(text) ||
    /retire\s+(\d+)\s+(.+?)(?:\.|$)/i.exec(text);
  if (stockRemove) {
    const qty = parseInt(stockRemove[1], 10);
    const itemQuery = stockRemove[2].trim().replace(/[.,]$/, "");
    if (!Number.isNaN(qty) && qty > 0 && itemQuery.length >= 2) {
      const { data: items } = await supabase.from("inventory").select("id, name, stock_quantity").eq("user_id", userId);
      const match = (items ?? []).find((it: { name: string }) =>
        it.name.toLowerCase().includes(itemQuery.toLowerCase())
      ) as { id: string; name: string; stock_quantity: number } | undefined;
      if (!match) {
        appendMessage(
          "assistant",
          language === "en"
            ? `No inventory item matches « ${itemQuery} ». Open **Materials** to check the exact name.`
            : `Aucun article ne correspond à « ${itemQuery} ». Vérifie dans **Matériel**.`
        );
        return true;
      }
      const newStock = Math.max(0, (Number(match.stock_quantity) || 0) - qty);
      const { error } = await supabase
        .from("inventory")
        .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
        .eq("id", match.id);
      if (error) {
        appendMessage("assistant", error.message);
        return true;
      }
      appendMessage(
        "assistant",
        language === "en"
          ? `Removed **${qty}** from **${match.name}**. New stock: **${newStock}**.`
          : `Retrait de **${qty}** sur **${match.name}**. Stock restant : **${newStock}**.`
      );
      return true;
    }
  }

  // ——— Alert when stock < N (reminder)
  const alertLow =
    /(?:alert|notify|tell|préviens)\s+me\s+(?:when|if|quand).{0,20}(?:less than|moins de|under)\s+(\d+)\s+(.+?)(?:\.|$)/i.exec(
      text
    ) ||
    /(?:alert|notify).{0,30}(?:less than|moins de)\s+(\d+)\s+(.+?)(?:\.|$)/i.exec(text);
  if (alertLow) {
    const threshold = parseInt(alertLow[1], 10);
    const label = alertLow[2].trim().replace(/[.,]$/, "");
    if (!Number.isNaN(threshold) && label.length >= 2) {
      const reminderLabel =
        language === "en"
          ? `Low stock: reorder ${label} when below ${threshold}`
          : `Stock bas : commander ${label} si moins de ${threshold}`;
      const { error } = await supabase.from("reminders").insert({
        user_id: userId,
        label: reminderLabel,
        completed: false,
      });
      if (error) {
        appendMessage("assistant", error.message);
        return true;
      }
      appendMessage(
        "assistant",
        language === "en"
          ? `I added a reminder: « ${reminderLabel} ». Check it on the **Dashboard**.`
          : `Rappel ajouté : « ${reminderLabel} ». Retrouve-le sur le **tableau de bord**.`
      );
      return true;
    }
  }

  return false;
}
