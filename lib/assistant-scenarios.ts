/**
 * Extended natural-language scenarios for the AI Command Center.
 * Returns true if the message was handled (caller should return early).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { t, tReplace, type Language } from "@/lib/translations";
import type { Expense } from "@/types/database";
import {
  expenseLineTtc,
  projectNetProfitEur,
  totalProjectRevenueEur,
} from "@/lib/project-finance";
import { caInRangeEur } from "@/lib/finance-metrics";
import { amountInCurrencyToEur, formatConvertedCurrency, parseStoredRevenueCurrency, type Currency } from "@/lib/utils";

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

function parseEndDateString(raw: string): string | null {
  const s = raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/(\d+)(st|nd|rd|th)\b/gi, "$1");
  if (!s) return null;
  const tryDate = new Date(s);
  if (!Number.isNaN(tryDate.getTime())) return tryDate.toISOString().slice(0, 10);
  const dm = s.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
  if (dm) {
    const d = Number(dm[1]);
    const mo = Number(dm[2]);
    let y = dm[3] ? Number(dm[3]) : new Date().getFullYear();
    if (y < 100) y += 2000;
    const dt = new Date(y, mo - 1, d);
    if (!Number.isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }
  return null;
}

export async function runExtendedAssistantScenarios(opts: {
  text: string;
  lower: string;
  language: Language;
  userId: string;
  supabase: SupabaseClient;
  appendMessage: Append;
  router: { push: (href: string) => void };
  pageContext?: {
    currentProjectId?: string | null;
    currentProjectName?: string | null;
    activeSection?: "clients" | "employees" | "dashboard" | null;
  };
  displayCurrency?: Currency;
  dashboardKpis?: {
    caMonthEur: number;
    caPrevMonthEur: number;
    caMonthMomPct: number | null;
    caYearEur: number;
    caYearLabel: string;
    marginEur: number;
    marginPct: number;
    unpaidEur: number;
    unpaidProjectCount: number;
  } | null;
  activeSection?: "clients" | "employees" | "dashboard" | null;
}): Promise<boolean> {
  const {
    text,
    lower,
    language,
    userId,
    supabase,
    appendMessage,
    router,
    pageContext,
    displayCurrency = "EUR",
    dashboardKpis,
    activeSection: activeSectionOpt,
  } = opts;

  const activeSection = activeSectionOpt ?? pageContext?.activeSection;

  // ——— Rentals: items to return this week
  if (
    /(?:locations?|rentals?).{0,30}(?:à rendre|to return|retourner)/i.test(lower) &&
    /(?:semaine|week)/i.test(lower)
  ) {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const { data: rentals, error: rentalsErr } = await supabase
      .from("rentals")
      .select("id, equipment_name, renter_name, end_date, projects(name)")
      .eq("user_id", userId)
      .gte("end_date", weekStart.toISOString().slice(0, 10))
      .lte("end_date", weekEnd.toISOString().slice(0, 10))
      .order("end_date", { ascending: true });
    if (rentalsErr) {
      appendMessage("assistant", rentalsErr.message);
      return true;
    }
    const rows = (rentals ?? []) as {
      equipment_name: string;
      renter_name: string;
      end_date: string;
      projects?: { name?: string } | { name?: string }[] | null;
    }[];
    if (rows.length === 0) {
      appendMessage(
        "assistant",
        language === "fr"
          ? "Aucune location à rendre cette semaine."
          : "No rentals to return this week."
      );
      return true;
    }
    const lines = rows.map((r) => {
      const p = Array.isArray(r.projects) ? r.projects[0] : r.projects;
      return language === "fr"
        ? `• **${r.equipment_name}** (${r.renter_name}) — ${r.end_date}${p?.name ? ` · ${p.name}` : ""}`
        : `• **${r.equipment_name}** (${r.renter_name}) — ${r.end_date}${p?.name ? ` · ${p.name}` : ""}`;
    });
    appendMessage(
      "assistant",
      (language === "fr" ? "Locations à rendre cette semaine :" : "Rentals to return this week:") +
        "\n\n" +
        lines.join("\n")
    );
    return true;
  }

  // ——— Dashboard: commentaire sur les KPI affichés
  if (activeSection === "dashboard" && dashboardKpis) {
    const asksDashboardInsight =
      (/(?:résume|resume|analyse|analyze|commente|comment|explain|aperçu|overview)/i.test(lower) &&
        /(?:dashboard|tableau|kpi|chiffres|indicateurs|financ|numbers|situation)/i.test(lower)) ||
      /(?:vue\s+d'?ensemble|situation\s+financière|financial\s+snapshot|how\s+are\s+my\s+numbers)/i.test(lower);
    if (asksDashboardInsight) {
      const k = dashboardKpis;
      const fmt = (n: number) => formatConvertedCurrency(n, displayCurrency);
      const mom =
        k.caMonthMomPct != null
          ? `${k.caMonthMomPct >= 0 ? "+" : ""}${Math.round(k.caMonthMomPct * 10) / 10} %`
          : language === "fr"
            ? "n/d"
            : "n/a";
      appendMessage(
        "assistant",
        language === "en"
          ? `**Dashboard snapshot** (${displayCurrency}):\n` +
            `• **Monthly CA**: ${fmt(k.caMonthEur)} (vs previous month: ${mom}).\n` +
            `• **CA (${k.caYearLabel})**: ${fmt(k.caYearEur)}.\n` +
            `• **Net margin**: ${fmt(k.marginEur)} (${Math.round(k.marginPct * 10) / 10}% of revenue).\n` +
            `• **Outstanding**: ${fmt(k.unpaidEur)} across **${k.unpaidProjectCount}** project(s) with a balance.\n\n` +
            `Tap the KPI cards on the Dashboard to open details without leaving the page.`
          : `**Vue tableau de bord** (équivalents ${displayCurrency}) :\n` +
            `• **CA du mois** : ${fmt(k.caMonthEur)} (vs mois précédent : ${mom}).\n` +
            `• **CA (${k.caYearLabel})** : ${fmt(k.caYearEur)}.\n` +
            `• **Marge nette** : ${fmt(k.marginEur)} (${Math.round(k.marginPct * 10) / 10} % du CA).\n` +
            `• **Impayés** : ${fmt(k.unpaidEur)} sur **${k.unpaidProjectCount}** projet(s) avec solde.\n\n` +
            `Touchez les cartes KPI sur le tableau de bord pour le détail sans changer de page.`
      );
      return true;
    }
  }

  // ——— Current project: how much left to pay (needs open project page)
  const asksLeftToPay =
    /(?:left|remaining)\s+to\s+pay/i.test(lower) ||
    /(?:how\s+much|what|combien).{0,50}(?:left|owing|due|remaining|reste|à payer|impayé)/i.test(lower) ||
    /(?:restant|reste).{0,25}(?:à payer|impayé|due)/i.test(lower);
  const mentionsThisProject =
    /(?:current|this|the)\s+project|projet\s+actuel|ce\s+projet|ce\s+chantier|chantier\s+actuel/i.test(lower) ||
    /(?:on|sur)\s+(?:the\s+)?(?:open\s+)?project/i.test(lower);
  const leftOnCurrent = pageContext?.currentProjectId && asksLeftToPay && mentionsThisProject;
  if (leftOnCurrent) {
    const pid = pageContext!.currentProjectId!;
    const { data: proj } = await supabase
      .from("projects")
      .select("id, name, contract_amount")
      .eq("user_id", userId)
      .eq("id", pid)
      .maybeSingle();
    if (!proj) {
      appendMessage("assistant", t("assistantOpenProjectForBalance", language));
      return true;
    }
    const budget = Number((proj as { contract_amount?: number | null }).contract_amount ?? 0);
    const { data: revs } = await supabase
      .from("revenues")
      .select("amount, currency")
      .eq("user_id", userId)
      .eq("project_id", pid);
    let paidEur = 0;
    for (const r of revs ?? []) {
      const row = r as { amount: number; currency: string | null };
      paidEur += amountInCurrencyToEur(Number(row.amount), parseStoredRevenueCurrency(row.currency));
    }
    const rest = Math.max(0, budget - paidEur);
    const name = (proj as { name: string }).name;
    appendMessage(
      "assistant",
      language === "en"
        ? `**${name}** — remaining to pay (budget − revenue recorded): **${Math.round(rest * 100) / 100} €** (EUR equivalent).`
        : `**${name}** — restant à payer (budget − revenus enregistrés) : **${Math.round(rest * 100) / 100} €** (équivalent EUR).`
    );
    return true;
  }

  if (asksLeftToPay && mentionsThisProject && !pageContext?.currentProjectId) {
    appendMessage("assistant", t("assistantOpenProjectForBalance", language));
    return true;
  }

  // ——— Set planned end date for project by name
  const setEndMatch =
    /(?:set|change|update|put).{0,40}(?:the\s+)?(?:end\s+date|planned\s+end|date\s+de\s+fin).{0,80}(?:for|of|on|pour|du|de)\s+(?:the\s+)?(?:project\s+)?(?:le\s+)?(?:projet\s+)?(.+?)\s+(?:to|on|as|au|le|à|the)\s+(.+)/i.exec(
      text
    ) ||
    /(?:mets|mettre|change|modifie).{0,40}(?:la\s+)?(?:date\s+de\s+)?fin.{0,40}(?:pour|du|de)\s+(?:le\s+)?(?:projet\s+)?(.+?)\s+(?:au|le|à|pour)\s+(.+)/i.exec(
      text
    );
  if (setEndMatch) {
    const rawName = setEndMatch[1]!.replace(/[.,?]+$/, "").trim();
    const rawDate = setEndMatch[2]!.trim();
    const iso = parseEndDateString(rawDate);
    if (!iso) {
      appendMessage("assistant", t("assistantEndDateInvalid", language));
      return true;
    }
    const { data: projects } = await supabase.from("projects").select("id, name").eq("user_id", userId);
    const proj = findProjectByName((projects ?? []) as { id: string; name: string }[], rawName);
    if (!proj) {
      appendMessage("assistant", tReplace("assistantEndDateProjectNotFound", language, { name: rawName }));
      return true;
    }
    const { error } = await supabase
      .from("projects")
      .update({ end_date: iso, updated_at: new Date().toISOString() })
      .eq("id", proj.id)
      .eq("user_id", userId);
    if (error) {
      appendMessage("assistant", error.message);
      return true;
    }
    const formatted = new Date(iso + "T12:00:00").toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    appendMessage(
      "assistant",
      tReplace("assistantEndDateUpdated", language, { name: proj.name, date: formatted })
    );
    return true;
  }

  // ——— Revenue tab: open margin detail (merged finance / monthly profit breakdown)
  if (
    /(?:show|show me|open|display).{0,30}(?:my\s+)?(?:monthly\s+)?(?:profit|margin).{0,40}(?:details|detail|breakdown)/i.test(
      lower
    ) ||
    /(?:détails|detail|répartition).{0,40}(?:du\s+)?(?:profit|marge|bénéfice).{0,25}(?:mensuel|mois|du mois)?/i.test(lower)
  ) {
    router.push("/dashboard?detail=margin");
    appendMessage(
      "assistant",
      language === "en"
        ? "Opening the **Dashboard** margin detail (total revenue − project materials & expense lines)."
        : "Ouverture du détail **marge** sur le **tableau de bord** (revenus totaux − matériaux chantier et lignes de dépenses)."
    );
    return true;
  }

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

  // ——— Profit on a named project (incl. "profit margin on …")
  const profitEn =
    /(?:how much profit|what (?:was|is) the profit|profit did i make).{0,100}(?:on|for)\s+(?:the\s+)?(.+?)\s+project/i.exec(
      text
    );
  const profitFr =
    /(?:combien|quel).{0,40}(?:de\s+)?(?:bénéfice|profit).{0,60}(?:sur|du|pour)\s+(?:le\s+)?(?:projet\s+)?(.+?)(?:\?|$)/i.exec(
      text
    );
  const profitMarginEn =
    /(?:what(?:'s| is) my|how much is my).{0,20}(?:profit )?margin.{0,100}(?:on|for)\s+(?:the\s+)?(.+?)(?:\s+project)?(?:\?|$)/i.exec(
      text
    );
  const profitMarginFr =
    /(?:quelle|quel).{0,30}(?:marge|profit).{0,60}(?:sur|du|pour)\s+(?:le\s+)?(?:projet\s+)?(.+?)(?:\?|$)/i.exec(text);
  const profitMatch = profitEn || profitFr || profitMarginEn || profitMarginFr;
  if (profitMatch) {
    const rawName = profitMatch[1].trim().replace(/[.,?]$/, "");
    if (rawName.length >= 2) {
      const { data: projects } = await supabase.from("projects").select("id, name, material_costs").eq("user_id", userId);
      const proj = findProjectByName((projects ?? []) as { id: string; name: string }[], rawName);
      if (!proj) {
        appendMessage(
          "assistant",
          language === "en"
            ? `No project matches « ${rawName} » for a profit calculation.`
            : `Aucun projet ne correspond à « ${rawName} » pour le calcul du bénéfice.`
        );
        return true;
      }
      const { data: txs } = await supabase
        .from("project_transactions")
        .select("amount")
        .eq("project_id", proj.id);
      const { data: revs } = await supabase
        .from("revenues")
        .select("amount, currency")
        .eq("project_id", proj.id)
        .eq("user_id", userId);
      const { data: exps } = await supabase
        .from("expenses")
        .select("id, project_id, user_id, description, amount_ht, tva_rate, category, date, amount_ttc")
        .eq("project_id", proj.id)
        .eq("user_id", userId);
      const mc = Number((proj as { material_costs?: number }).material_costs ?? 0);
      const txList = ((txs ?? []) as { amount: number }[]).map((x) => ({ amount: Number(x.amount) }));
      const revList = ((revs ?? []) as { amount: number; currency: string }[]).map((r) => ({
        amount: Number(r.amount),
        currency: parseStoredRevenueCurrency(r.currency),
      }));
      const expList: Expense[] = ((exps ?? []) as Record<string, unknown>[]).map((row) => ({
        id: row.id as string,
        project_id: row.project_id as string,
        user_id: row.user_id as string,
        description: (row.description as string) ?? "",
        amount_ht: Number(row.amount_ht ?? 0),
        tva_rate: Number(row.tva_rate ?? 20),
        category: row.category as Expense["category"],
        date: row.date as string,
        amount_ttc: row.amount_ttc != null ? Number(row.amount_ttc) : undefined,
      }));
      const profit = projectNetProfitEur(mc, expList, txList, revList);
      const revEur = totalProjectRevenueEur(txList, revList);
      const marginPct = revEur !== 0 ? (profit / Math.abs(revEur)) * 100 : 0;
      const wantsMargin =
        /\bmargin\b/i.test(text) || profitMarginEn || profitMarginFr;
      const marginLine =
        wantsMargin && Number.isFinite(marginPct)
          ? language === "en"
            ? ` Approximate **margin**: **${Math.round(marginPct * 10) / 10} %** of revenue (EUR equivalent).`
            : ` **Marge** approximative : **${Math.round(marginPct * 10) / 10} %** du chiffre d’affaires (équivalent EUR).`
          : "";
      appendMessage(
        "assistant",
        language === "en"
          ? `Estimated **profit** on **${proj.name}** (revenue − materials & tools): **${Math.round(profit * 100) / 100} €** (EUR equivalent).${marginLine}`
          : `**Bénéfice** estimé sur **${proj.name}** (revenus − matériaux & outillage) : **${Math.round(profit * 100) / 100} €** (équivalent EUR).${marginLine}`
      );
      return true;
    }
  }

  // ——— Finance summary for a calendar year (e.g. 2026)
  const yearFin =
    /(?:give me|get|show|donne|affiche).{0,50}(?:a\s+)?(?:summary|overview|résumé).{0,80}(?:finances|financial|finance|financier).{0,50}(?:for|in|of|de|pour)\s+(20\d{2})/i.exec(
      lower
    ) ||
    /(?:summary|overview|résumé).{0,80}(?:finances|financial|finance|financier).{0,50}(?:for|in|of|de|pour)\s+(20\d{2})/i.exec(
      lower
    );
  if (yearFin) {
    const yy = parseInt(yearFin[1], 10);
    if (!Number.isNaN(yy) && yy >= 2000 && yy <= 2100) {
      const yStart = new Date(yy, 0, 1, 0, 0, 0, 0);
      const yEnd = new Date(yy, 11, 31, 23, 59, 59, 999);
      const { data: prows } = await supabase.from("projects").select("id, contract_amount").eq("user_id", userId);
      const ids = (prows ?? []).map((p) => (p as { id: string }).id);
      let txList: { amount: number; payment_date: string }[] = [];
      if (ids.length) {
        const { data: txs } = await supabase
          .from("project_transactions")
          .select("amount, payment_date")
          .in("project_id", ids);
        txList = (txs ?? []) as { amount: number; payment_date: string }[];
      }
      const { data: revs } = await supabase
        .from("revenues")
        .select("project_id, amount, date, currency")
        .eq("user_id", userId);
      const revRows = (revs ?? []) as { project_id: string; amount: number; date: string; currency: string | null }[];
      const revList = revRows.map((r) => ({ amount: r.amount, date: r.date, currency: r.currency }));
      const caYear = caInRangeEur(txList, revList, yStart, yEnd);
      let outstanding = 0;
      const paid = new Map<string, number>();
      for (const r of revRows) {
        const eur = amountInCurrencyToEur(Number(r.amount), parseStoredRevenueCurrency(r.currency));
        paid.set(r.project_id, (paid.get(r.project_id) ?? 0) + eur);
      }
      for (const p of prows ?? []) {
        const row = p as { id: string; contract_amount?: number | null };
        const c = Number(row.contract_amount ?? 0);
        const pEur = paid.get(row.id) ?? 0;
        outstanding += Math.max(0, c - pEur);
      }
      appendMessage(
        "assistant",
        language === "en"
          ? `**${yy} finances (EUR equivalent):** cash collected in **${yy}**: **${Math.round(caYear * 100) / 100} €**. **Outstanding** today (contract − revenue rows): **${Math.round(outstanding * 100) / 100} €**. Open **Revenue** for charts and PDF export.`
          : `**Finances ${yy}** (équivalent EUR) : encaissements en **${yy}** : **${Math.round(caYear * 100) / 100} €**. **Impayés** aujourd’hui (contrat − lignes revenus) : **${Math.round(outstanding * 100) / 100} €**. Onglet **Revenus** pour graphiques et export PDF.`
      );
      return true;
    }
  }

  // ——— Total unpaid balance (contract vs collected) — "this month" wording
  if (
    /(unpaid|impayé|balance due|restant|due)/i.test(lower) &&
    /(this month|ce mois|month)/i.test(lower) &&
    /(invoice|facture|total|how much|combien|what)/i.test(lower)
  ) {
    const { data: projects } = await supabase
      .from("projects")
      .select("contract_amount, amount_collected")
      .eq("user_id", userId);
    let sum = 0;
    for (const p of projects ?? []) {
      const row = p as { contract_amount?: number | null; amount_collected?: number | null };
      const c = Number(row.contract_amount ?? 0);
      const col = Number(row.amount_collected ?? 0);
      sum += Math.max(0, c - col);
    }
    appendMessage(
      "assistant",
      language === "en"
        ? `**Total unpaid balance** across projects (contract − collected): **${Math.round(sum * 100) / 100} €**. Record payments on each project to reduce this.`
        : `**Total des impayés** (contrat − encaissé, tous chantiers) : **${Math.round(sum * 100) / 100} €**. Enregistrez les paiements sur chaque projet pour le faire baisser.`
    );
    return true;
  }

  // ——— Biggest expense category (last 7 days)
  if (
    /(biggest|largest|main|plus grosse).{0,40}(expense|dépense).{0,40}(category|catégorie)/i.test(lower) &&
    /(last week|semaine dernière|7\s*days|sept jours)/i.test(lower)
  ) {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    const { data: exps } = await supabase
      .from("expenses")
      .select("category, amount_ht, tva_rate, amount_ttc, date, invoice_date")
      .eq("user_id", userId);
    const byCat = new Map<string, number>();
    const labels: Record<string, string> = {
      achat_materiel: language === "en" ? "Materials" : "Matériel",
      location: language === "en" ? "Rental / tools" : "Location / outillage",
      main_oeuvre: language === "en" ? "Labor" : "Main d’œuvre",
      sous_traitance: language === "en" ? "Subcontracting" : "Sous-traitance",
    };
    for (const r of exps ?? []) {
      const row = r as {
        category: string;
        amount_ht: number;
        tva_rate: number;
        amount_ttc?: number | null;
        date: string;
        invoice_date?: string | null;
      };
      const dStr = row.invoice_date || row.date;
      const d = new Date(dStr.includes("T") ? dStr : `${dStr}T12:00:00`);
      if (Number.isNaN(d.getTime()) || d < start) continue;
      const ttc = expenseLineTtc(row);
      byCat.set(row.category, (byCat.get(row.category) ?? 0) + ttc);
    }
    let best = "";
    let bestV = 0;
    for (const [k, v] of Array.from(byCat.entries())) {
      if (v > bestV) {
        best = k;
        bestV = v;
      }
    }
    if (bestV <= 0) {
      appendMessage(
        "assistant",
        language === "en"
          ? "No expenses recorded in the **last 7 days**."
          : "Aucune dépense sur les **7 derniers jours**."
      );
    } else {
      appendMessage(
        "assistant",
        language === "en"
          ? `Largest expense category (last 7 days): **${labels[best] ?? best}** — about **${Math.round(bestV * 100) / 100} €** TTC.`
          : `Catégorie la plus importante (7 derniers jours) : **${labels[best] ?? best}** — environ **${Math.round(bestV * 100) / 100} €** TTC.`
      );
    }
    return true;
  }

  // ——— Expenses without project → suggest linking
  const orphanHint =
    /(expense|dépense|facture).{0,50}(without|sans|no|not linked|pas de).{0,30}(project|projet|chantier)/i.test(lower) ||
    /(unlink|non rattaché|orphan)/i.test(lower);
  if (orphanHint) {
    const { data: orphans, error: oErr } = await supabase
      .from("expenses")
      .select("id, description, vendor, amount_ht, project_id")
      .eq("user_id", userId)
      .is("project_id", null)
      .limit(6);
    if (oErr || !orphans?.length) {
      appendMessage(
        "assistant",
        language === "en"
          ? "All recorded expenses are linked to a project, or none are pending assignment."
          : "Toutes les dépenses sont rattachées à un projet, ou aucune n’est en attente."
      );
      return true;
    }
    const { data: activeP } = await supabase
      .from("projects")
      .select("id, name")
      .eq("user_id", userId)
      .eq("status", "en_cours")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const suggest = activeP as { id: string; name: string } | null;
    const lines = (orphans as { description?: string; vendor?: string; amount_ht: number }[])
      .map((o) => `• ${(o.vendor || o.description || "—").slice(0, 60)} (${Math.round(Number(o.amount_ht) * 100) / 100} € HT)`)
      .join("\n");
    appendMessage(
      "assistant",
      language === "en"
        ? `These expenses have **no project**:\n${lines}\n\n${suggest ? `You can link them to the active project **${suggest.name}** from **Invoices** (edit line → project).` : "Open **Invoices**, edit a line, and choose a **project**."}`
        : `Ces dépenses **sans projet** :\n${lines}\n\n${suggest ? `Vous pouvez les lier au chantier en cours **${suggest.name}** depuis **Factures** (modifier la ligne → projet).` : "Ouvrez **Factures**, modifiez une ligne et choisissez un **projet**."}`
    );
    return true;
  }

  // ——— Payment progress for a project (revenue ÷ budget)
  const payProgIntent =
    /(payment progress|progression (?:du |de )?paiement|avancement (?:du )?paiement)/i.test(lower) &&
    /(project|projet|chantier)/i.test(lower);
  if (payProgIntent) {
    const raw =
      /(?:project|projet|chantier)\s+(.+?)(?:\?|$)/i.exec(text)?.[1]?.trim() ||
      /(?:for|pour)\s+(?:the\s+)?(?:project\s+)?(.+?)(?:\?|$)/i.exec(text)?.[1]?.trim();
    if (raw && raw.length >= 2) {
      const { data: projects } = await supabase
        .from("projects")
        .select("id, name, contract_amount")
        .eq("user_id", userId);
      const proj = findProjectByName((projects ?? []) as { id: string; name: string }[], raw.replace(/[.,?]$/, ""));
      if (proj) {
        const full = (projects ?? []).find((p) => p.id === proj.id) as { contract_amount?: number | null } | undefined;
        const budget = Number(full?.contract_amount ?? 0);
        const { data: revs } = await supabase
          .from("revenues")
          .select("amount, currency")
          .eq("user_id", userId)
          .eq("project_id", proj.id);
        let paidEur = 0;
        for (const r of revs ?? []) {
          const row = r as { amount: number; currency: string | null };
          paidEur += amountInCurrencyToEur(Number(row.amount), parseStoredRevenueCurrency(row.currency));
        }
        const pct = budget > 0 ? Math.min(100, Math.round((paidEur / budget) * 1000) / 10) : 0;
        appendMessage(
          "assistant",
          language === "en"
            ? `**${proj.name}** — payment progress (revenue ÷ budget): **${pct} %** (${Math.round(paidEur * 100) / 100} € recorded vs ${Math.round(budget * 100) / 100} € budget).`
            : `**${proj.name}** — progression du paiement (revenus ÷ budget) : **${pct} %** (${Math.round(paidEur * 100) / 100} € enregistrés / ${Math.round(budget * 100) / 100} € budget).`
        );
        return true;
      }
    }
  }

  // ——— How much does client X still owe (sum of contract − revenue over their projects)
  const oweIntent =
    /(owe|owe me|still owe|me doit|doit|reste|unpaid|impayé)/i.test(lower) &&
    /(client|customer|cliente)/i.test(lower);
  if (oweIntent) {
    const namePart =
      /(?:client|customer)\s+["'«]?([^"'»?]+)["'»]?/i.exec(text)?.[1]?.trim() ||
      /(?:does|do|est-ce que)\s+(.+?)\s+(?:still|owe|me)/i.exec(text)?.[1]?.trim();
    if (namePart && namePart.length >= 2) {
      const { data: clients } = await supabase.from("clients").select("id, name").eq("user_id", userId);
      const client = (clients ?? []).find(
        (c: { name: string }) =>
          c.name.toLowerCase().includes(namePart.toLowerCase()) || namePart.toLowerCase().includes(c.name.toLowerCase())
      ) as { id: string; name: string } | undefined;
      if (client) {
        const { data: projs } = await supabase
          .from("projects")
          .select("id, contract_amount")
          .eq("user_id", userId)
          .eq("client_id", client.id);
        const ids = (projs ?? []).map((p: { id: string }) => p.id);
        if (ids.length === 0) {
          appendMessage(
            "assistant",
            language === "en"
              ? `No projects found for client **${client.name}**.`
              : `Aucun projet pour le client **${client.name}**.`
          );
          return true;
        }
        const { data: revs } = await supabase
          .from("revenues")
          .select("project_id, amount, currency")
          .eq("user_id", userId)
          .in("project_id", ids);
        const paidByProj: Record<string, number> = {};
        for (const r of revs ?? []) {
          const row = r as { project_id: string; amount: number; currency: string | null };
          const eur = amountInCurrencyToEur(Number(row.amount), parseStoredRevenueCurrency(row.currency));
          paidByProj[row.project_id] = (paidByProj[row.project_id] ?? 0) + eur;
        }
        let owe = 0;
        for (const p of projs ?? []) {
          const row = p as { id: string; contract_amount?: number | null };
          const b = Number(row.contract_amount ?? 0);
          const paid = paidByProj[row.id] ?? 0;
          owe += Math.max(0, b - paid);
        }
        appendMessage(
          "assistant",
          language === "en"
            ? `**${client.name}** — estimated balance due (budget − revenue recorded): **${Math.round(owe * 100) / 100} €** (EUR equivalent).`
            : `**${client.name}** — solde estimé (budget − revenus enregistrés) : **${Math.round(owe * 100) / 100} €** (équivalent EUR).`
        );
        return true;
      }
    }
  }

  return false;
}
