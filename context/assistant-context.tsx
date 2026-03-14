"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/language-context";
import { t, tReplace } from "@/lib/translations";

export type ModifiedEntity = {
  type: "project" | "client" | "employee" | "reminder";
  id: string;
  name: string;
  fields: string[];
  link: string;
};

export type ChartDataPoint = { name: string; value: number };

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  chartData?: ChartDataPoint[];
  modifiedEntities?: ModifiedEntity[];
};

type AssistantPageContext = {
  currentProjectId?: string | null;
  currentProjectName?: string | null;
};

type AssistantContextValue = {
  messages: AssistantMessage[];
  pageContext: AssistantPageContext;
  isProcessing: boolean;
  sendMessage: (text: string) => Promise<void>;
  setPageContext: (ctx: AssistantPageContext) => void;
};

const AssistantContext = createContext<AssistantContextValue | undefined>(undefined);

function createId() {
  return Math.random().toString(36).slice(2);
}

function parseAmount(str: string): number | null {
  const m = str.replace(/\s/g, "").match(/(\d+(?:[.,]\d+)?)\s*€?/);
  if (!m) return null;
  return parseFloat(m[1].replace(",", "."));
}

/** Retourne la date (YYYY-MM-DD) pour "hier", "aujourd'hui", "aujourd'hui", ou null pour aujourd'hui par défaut. */
function parsePaymentDate(text: string): string {
  const lower = text.toLowerCase();
  const today = new Date();
  if (lower.includes("hier")) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  if (lower.includes("aujourd") || lower.includes("ce jour")) return today.toISOString().slice(0, 10);
  return today.toISOString().slice(0, 10);
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [pageContext, setPageContextState] = useState<AssistantPageContext>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const router = useRouter();

  const appendMessage = useCallback(
    (role: AssistantMessage["role"], text: string, extra?: Partial<AssistantMessage>) => {
      setMessages((prev) => [
        ...prev,
        { id: createId(), role, text, ...extra },
      ]);
    },
    []
  );

  const handleCommand = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text) return;
      appendMessage("user", text);
      setIsProcessing(true);

      const supabase = createClient();
      if (!supabase) {
        appendMessage("assistant", t("assistantCannotConnect", language));
        setIsProcessing(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        appendMessage("assistant", t("assistantMustBeLoggedIn", language));
        setIsProcessing(false);
        return;
      }

      const lower = text.toLowerCase();

      try {
        // ——— "Combien me doit Martin ?" / "Le client Martin vous doit encore 1500€ sur un total de 5000€" (réponse IA)
        const clientDoitMatch = lower.match(/(?:combien\s+me\s+doit|me\s+doit\s+combien|ce\s+que\s+me\s+doit)\s+(?:le\s+client\s+)?(.+?)(?:\.|\?|$)/i)
          || lower.match(/(?:le\s+client|client)\s+(.+?)\s+(?:vous\s+)?doit\s+encore/i)
          || lower.match(/(.+?)\s+(?:il\s+)?me\s+doit\s+combien/i)
          || lower.match(/(?:solde|reste\s+à\s+payer)\s+(?:du\s+client\s+)?(.+?)(?:\.|\?|$)/i);
        if (clientDoitMatch) {
          const clientName = (clientDoitMatch[1] ?? clientDoitMatch[0]).replace(/\?|\.$/g, "").trim();
          if (clientName.length >= 2) {
            const { data: clients } = await supabase
              .from("clients")
              .select("id, name")
              .eq("user_id", user.id);
            const client = (clients ?? []).find(
              (c: { name: string }) => c.name.toLowerCase().includes(clientName.toLowerCase())
            );
            if (!client) {
              appendMessage("assistant", tReplace("assistantNoClientFound", language, { name: clientName }));
              setIsProcessing(false);
              return;
            }
            const { data: projects } = await supabase
              .from("projects")
              .select("contract_amount, amount_collected")
              .eq("user_id", user.id)
              .eq("client_id", client.id);
            let totalContract = 0;
            let totalCollected = 0;
            for (const p of projects ?? []) {
              totalContract += Number(p.contract_amount) || 0;
              totalCollected += Number(p.amount_collected) || 0;
            }
            const restant = Math.max(0, totalContract - totalCollected);
            appendMessage(
              "assistant",
              tReplace("assistantClientOwes", language, {
                name: client.name,
                restant: Math.round(restant),
                total: Math.round(totalContract),
                collected: Math.round(totalCollected),
              })
            );
            setIsProcessing(false);
            return;
          }
        }

        // ——— "J'ai reçu un virement de 500€ pour le projet Martin hier"
        const virementMatch = lower.match(/(?:j'?ai\s+reçu|reçu)\s+(?:un\s+)?(?:virement|paiement)\s+(?:de\s+)?(.+?)\s*€?\s*(?:pour\s+le\s+projet|pour\s+projet)\s+(.+?)(?:\.|$)/i)
          || lower.match(/(?:virement|paiement)\s+(?:de\s+)?(.+?)\s*€?\s*(?:pour\s+le\s+projet|pour\s+projet)\s+(.+?)(?:\.|$)/i);
        if (virementMatch) {
          const amount = parseAmount(virementMatch[1]) ?? parseAmount(text);
          const projectName = virementMatch[2].trim();
          if (amount != null && amount > 0 && projectName) {
            const { data: projects } = await supabase
              .from("projects")
              .select("id, name")
              .eq("user_id", user.id);
            const project = (projects ?? []).find(
              (p: { name: string }) => p.name.toLowerCase().includes(projectName.toLowerCase())
            );
            if (!project) {
              appendMessage("assistant", tReplace("assistantNoProjectFound", language, { name: projectName }));
              setIsProcessing(false);
              return;
            }
            const paymentDate = parsePaymentDate(text);
            const { error: insertErr } = await supabase.from("project_transactions").insert({
              project_id: project.id,
              amount,
              payment_date: paymentDate,
              payment_method: "virement",
            });
            if (insertErr) {
              appendMessage("assistant", tReplace("assistantPaymentFailed", language, { msg: insertErr.message }));
              setIsProcessing(false);
              return;
            }
            const { data: allTx } = await supabase
              .from("project_transactions")
              .select("amount")
              .eq("project_id", project.id);
            const newTotal = (allTx ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
            await supabase
              .from("projects")
              .update({ amount_collected: newTotal, updated_at: new Date().toISOString() })
              .eq("id", project.id);
            if (typeof sessionStorage !== "undefined") {
              sessionStorage.setItem(
                "assistant_highlight",
                JSON.stringify({ projectId: project.id, field: "amount_collected" })
              );
            }
            appendMessage(
              "assistant",
              tReplace("assistantPaymentRecorded", language, { amount, name: project.name, date: paymentDate, total: newTotal }),
              {
                modifiedEntities: [
                  { type: "project", id: project.id, name: project.name, fields: [t("assistantAmountCollected", language)], link: `/projets/${project.id}` },
                ],
              }
            );
            setIsProcessing(false);
            return;
          }
        }

        // ——— "Ajoute 1500€ de CA au projet Leroy" ou "Ajoute 1500€ au projet Leroy" → crée une transaction (aujourd'hui) pour mettre à jour le graphique
        const addCaMatch = lower.match(/ajoute\s+(.+?)\s*(?:€|euros?)\s*(?:de\s*ca|d'?encaissé)?\s*au\s+projet\s+(.+?)(?:\.|$)/i)
          || lower.match(/ajoute\s+(.+?)\s+au\s+projet\s+(.+?)(?:\.|$)/i);
        if (addCaMatch) {
          const amount = parseAmount(addCaMatch[1]) ?? parseAmount(text);
          const projectName = addCaMatch[2].trim();
          if (amount != null && amount > 0 && projectName) {
            const { data: projects } = await supabase
              .from("projects")
              .select("id, name")
              .eq("user_id", user.id);
            const project = (projects ?? []).find(
              (p: { name: string }) => p.name.toLowerCase().includes(projectName.toLowerCase())
            );
            if (!project) {
              appendMessage("assistant", tReplace("assistantNoProjectFound", language, { name: projectName }));
              setIsProcessing(false);
              return;
            }
            const paymentDate = new Date().toISOString().slice(0, 10);
            const { error: insertErr } = await supabase.from("project_transactions").insert({
              project_id: project.id,
              amount,
              payment_date: paymentDate,
              payment_method: "virement",
            });
            if (insertErr) {
              appendMessage("assistant", tReplace("assistantPaymentFailed", language, { msg: insertErr.message }));
              setIsProcessing(false);
              return;
            }
            const { data: allTx } = await supabase
              .from("project_transactions")
              .select("amount")
              .eq("project_id", project.id);
            const newTotal = (allTx ?? []).reduce((s: number, r: { amount: number }) => s + Number(r.amount), 0);
            await supabase
              .from("projects")
              .update({ amount_collected: newTotal, updated_at: new Date().toISOString() })
              .eq("id", project.id);
            if (typeof sessionStorage !== "undefined") {
              sessionStorage.setItem(
                "assistant_highlight",
                JSON.stringify({ projectId: project.id, field: "amount_collected" })
              );
            }
            appendMessage(
              "assistant",
              tReplace("assistantAmountAdded", language, { amount, name: project.name, total: newTotal }),
              {
                modifiedEntities: [
                  { type: "project", id: project.id, name: project.name, fields: [t("assistantAmountCollected", language)], link: `/projets/${project.id}` },
                ],
              }
            );
            setIsProcessing(false);
            return;
          }
        }

        // ——— Nouveau projet complet : "Nouveau projet : Salle de bain 8m² en marbre pour Mme Martin à 12 rue X"
        if (
          lower.includes("nouveau projet") &&
          (lower.includes("pour ") || lower.includes("mme ") || lower.includes("m. "))
        ) {
          const surfaceMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(m2|m²)/i);
          const surface = surfaceMatch ? parseFloat(surfaceMatch[1].replace(",", ".")) : 0;
          const forMatch = text.match(/pour\s+(.+?)(?:\s+à\s+|,|\s*\.|$)/i) || text.match(/(mme?|m\.)\s*([^.]+?)(?:\s*\.|$)/i);
          const clientName = forMatch ? forMatch[1].trim().replace(/^(mme?|m\.)\s*/i, "").trim().replace(/\s+à\s+.*$/i, "").trim() || "Client" : "Client";
          let name = text.replace(/^nouveau projet\s*:\s*/i, "").split(/\s+pour\s+/i)[0].trim() || `Projet ${clientName}`;

          // Extraction adresse : "à 12 rue X", "adresse : 5 avenue Y", "au 10 rue Z", "chantier 3 place de la Gare"
          let projectAddress: string | null = null;
          const addrAt = text.match(/\s+à\s+([^.]{5,120}?)(?:\s*\.|$)/i);
          const addrAdresse = text.match(/adresse\s*[:\s]+([^.]{5,120}?)(?:\s*\.|$)/i);
          const addrAu = text.match(/\s+au\s+(\d+\s+[^.]{5,100}?)(?:\s*\.|$)/i);
          const addrChantier = text.match(/chantier\s+([^.]{8,100}?)(?:\s+pour|\s*\.|$)/i);
          if (addrAt) projectAddress = addrAt[1].trim();
          else if (addrAdresse) projectAddress = addrAdresse[1].trim();
          else if (addrAu) projectAddress = addrAu[1].trim();
          else if (addrChantier) projectAddress = addrChantier[1].trim();
          if (projectAddress && name.includes(projectAddress)) name = name.replace(projectAddress, "").trim() || name;

          let clientId: string;
          const { data: existingClients } = await supabase
            .from("clients")
            .select("id, name")
            .eq("user_id", user.id);
          const existing = (existingClients ?? []).find(
            (c: { name: string }) => c.name.toLowerCase().includes(clientName.toLowerCase())
          );
          if (existing) {
            clientId = existing.id;
          } else {
            const { data: newClient, error: insertClientErr } = await supabase
              .from("clients")
              .insert({
                user_id: user.id,
                name: clientName,
                contract_amount: 0,
                material_costs: 0,
                amount_collected: 0,
              })
              .select("id")
              .single();
            if (insertClientErr || !newClient) {
              appendMessage("assistant", tReplace("assistantClientCreateError", language, { name: clientName, msg: insertClientErr?.message ?? "" }));
              setIsProcessing(false);
              return;
            }
            clientId = newClient.id;
          }

          // Catalogue complet : Gros Œuvre (Béton, Parpaing), Second Œuvre (Placo, Fenêtres), Plomberie/Elec, Finitions (Travertin, Parquet, Zellige)
          const catalogKeywords = [
            "travertin", "marbre", "parquet", "zellige", "carrelage", "placo", "plâtre", "platre", "fenêtre", "fenetre",
            "beton", "béton", "parpaing", "plomberie", "elec", "élec", "revêtement", "salle de bain", "cuisine", "gros œuvre", "second œuvre",
          ];
          let materialCost = 0;
          let contractAmount = 0;
          try {
            const { data: catalog } = await supabase
              .from("material_catalog")
              .select("name, unit, price_per_unit, category")
              .eq("user_id", user.id);
            const materials = (catalog ?? []) as { name: string; unit: string; price_per_unit: number; category?: string }[];
            let mat = materials[0];
            for (const kw of catalogKeywords) {
              const found = materials.find(
                (m) =>
                  m.name.toLowerCase().includes(kw) ||
                  (m.category && m.category.toLowerCase().includes(kw))
              );
              if (found) {
                mat = found;
                break;
              }
            }
            if (!mat && materials.length > 0) {
              const byCategory =
                lower.includes("salle de bain") || lower.includes("marbre") || lower.includes("travertin")
                  ? materials.find((m) => /marbre|travertin|carrelage|zellige/i.test(m.name))
                  : lower.includes("placo") || lower.includes("plâtre")
                    ? materials.find((m) => /placo|platre|plâtre/i.test(m.name))
                    : materials.find((m) => /beton|parpaing|parquet|fenêtre/i.test(m.name));
              mat = byCategory ?? materials[0];
            }
            if (mat && surface > 0) {
              const unit = (mat.unit || "m2").toLowerCase();
              const isM2 = unit === "m2" || unit === "m²";
              const qty = surface;
              const prixUnitaire = Number(mat.price_per_unit) || 0;
              materialCost = Math.round(qty * (isM2 ? prixUnitaire : prixUnitaire * qty));
              // Formule : (Quantité x Prix Matériau) + Main d'œuvre (50% mat) + 10% consommables + 30% marge artisan
              const mainOeuvre = materialCost * 0.5;
              const sousTotal = materialCost + mainOeuvre;
              const consommables = sousTotal * 0.1;
              const base = sousTotal + consommables;
              const margeArtisan = base * 0.3;
              contractAmount = Math.round(base + margeArtisan);
            } else {
              materialCost = surface > 0 ? Math.round(surface * (lower.includes("salle de bain") ? 120 : 80)) : 0;
              const mainOeuvre = materialCost * 0.5;
              const base = (materialCost + mainOeuvre) * 1.1;
              contractAmount = Math.round(base * 1.3);
            }
          } catch {
            materialCost = surface > 0 ? Math.round(surface * 100) : 0;
            contractAmount = surface > 0 ? Math.round(materialCost * 2.15) : 0;
          }

          const projectPayload = {
            user_id: user.id,
            client_id: clientId,
            name: name,
            status: "en_preparation",
            address: projectAddress ?? null,
            contract_amount: contractAmount,
            material_costs: materialCost,
            amount_collected: 0,
            start_date: new Date().toISOString().slice(0, 10),
            started_at: null,
            ended_at: null,
          };
          const { data: newProject, error: insertProjErr } = await supabase
            .from("projects")
            .insert(projectPayload)
            .select("id")
            .single();

          if (insertProjErr || !newProject) {
            appendMessage("assistant", tReplace("assistantProjectNotCreated", language, { msg: insertProjErr?.message ?? t("assistantErrorGeneric", language) }));
            setIsProcessing(false);
            return;
          }

          const addrInfo = projectAddress ? tReplace("assistantProjectCreatedAddr", language, { addr: projectAddress }) : "";
          appendMessage(
            "assistant",
            tReplace("assistantProjectCreated", language, { name, client: clientName, surface, contract: contractAmount, materials: materialCost, addr: addrInfo }),
            {
              modifiedEntities: [
                { type: "project", id: newProject.id, name, fields: [t("creation", language)], link: `/projets/${newProject.id}` },
              ],
            }
          );
          router.push(`/projets/${newProject.id}`);
          setIsProcessing(false);
          return;
        }

        // ——— Marge actuelle sur l'ensemble des chantiers
        if (
          lower.includes("marge actuelle") ||
          (lower.includes("marge") && (lower.includes("ensemble") || lower.includes("chantiers") || lower.includes("tous mes")))
        ) {
          const { data: projects } = await supabase
            .from("projects")
            .select("contract_amount, material_costs")
            .eq("user_id", user.id);
          let totalContract = 0;
          let totalCosts = 0;
          for (const p of projects ?? []) {
            totalContract += Number(p.contract_amount) || 0;
            totalCosts += Number(p.material_costs) || 0;
          }
          const margeTotale = totalContract - totalCosts;
          const taux = totalContract > 0 ? Math.round((margeTotale / totalContract) * 100) : 0;
          appendMessage(
            "assistant",
            `Sur l'ensemble de tes chantiers : **marge bénéficiaire ${Math.round(margeTotale)} €** (total contrats ${Math.round(totalContract)} € − matériaux ${Math.round(totalCosts)} €). Taux de marge moyen : **${taux} %**.`
          );
          setIsProcessing(false);
          return;
        }

        // ——— Combien d'argent est encore dehors (impayés)
        if (
          lower.includes("impayé") ||
          (lower.includes("argent") && (lower.includes("dehors") || lower.includes("encore") || lower.includes("dû"))) ||
          (lower.includes("combien") && (lower.includes("doivent") || lower.includes("reste à payer")))
        ) {
          const { data: projects } = await supabase
            .from("projects")
            .select("contract_amount, amount_collected")
            .eq("user_id", user.id);
          let totalImpayes = 0;
          let nb = 0;
          for (const p of projects ?? []) {
            const restant = Math.max(0, (Number(p.contract_amount) || 0) - (Number(p.amount_collected) || 0));
            if (restant > 0) {
              totalImpayes += restant;
              nb += 1;
            }
          }
          appendMessage(
            "assistant",
            `Il reste **${Math.round(totalImpayes)} €** encore dehors (impayés) sur **${nb}** chantier(s) non soldé(s).`
          );
          setIsProcessing(false);
          return;
        }

        // ——— Marge moyenne ce mois-ci
        if (lower.includes("marge moyenne") && (lower.includes("mois") || lower.includes("ce mois"))) {
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
          const { data: projects } = await supabase
            .from("projects")
            .select("contract_amount, material_costs, start_date, created_at")
            .eq("user_id", user.id);
          const inMonth = (projects ?? []).filter((p: { start_date: string | null; created_at: string }) => {
            const d = p.start_date ? new Date(p.start_date) : new Date(p.created_at);
            return d >= monthStart && d <= monthEnd;
          });
          const margins = inMonth.map(
            (p: { contract_amount: number; material_costs: number }) =>
              (p.contract_amount ?? 0) - (p.material_costs ?? 0)
          );
          const avg = margins.length ? margins.reduce((a: number, b: number) => a + b, 0) / margins.length : 0;
          appendMessage(
            "assistant",
            `Ce mois-ci tu as ${inMonth.length} projet(s) dans la période. Marge moyenne : ${Math.round(avg)} €.`
          );
          setIsProcessing(false);
          return;
        }

        // ——— Employé le plus rentable / le plus assigné
        if (lower.includes("employé") && (lower.includes("rentable") || lower.includes("assigné") || lower.includes("projets"))) {
          const { data: assignments } = await supabase
            .from("project_employees")
            .select("employee_id, project_id");
          const { data: projects } = await supabase
            .from("projects")
            .select("id, amount_collected")
            .eq("user_id", user.id);
          const projectsMap = new Map((projects ?? []).map((p: { id: string; amount_collected: number }) => [p.id, p.amount_collected ?? 0]));
          const byEmployee = new Map<string, { count: number; ca: number }>();
          for (const a of assignments ?? []) {
            const empId = (a as { employee_id: string; project_id: string }).employee_id;
            const projId = (a as { employee_id: string; project_id: string }).project_id;
            const ca = projectsMap.get(projId) ?? 0;
            const cur = byEmployee.get(empId) ?? { count: 0, ca: 0 };
            cur.count += 1;
            cur.ca += ca;
            byEmployee.set(empId, cur);
          }
          const { data: employees } = await supabase
            .from("employees")
            .select("id, first_name, last_name")
            .eq("user_id", user.id);
          const list = (employees ?? [])
            .map((e: { id: string; first_name: string; last_name: string }) => ({
              name: `${e.first_name} ${e.last_name}`,
              ...(byEmployee.get(e.id) ?? { count: 0, ca: 0 }),
            }))
            .filter((x: { count: number }) => x.count > 0)
            .sort((a: { ca: number }, b: { ca: number }) => b.ca - a.ca);
          if (list.length === 0) {
            appendMessage("assistant", t("assistantNoEmployeesAssigned", language));
          } else {
            const top = list[0];
            appendMessage(
              "assistant",
              tReplace("assistantTopEmployee", language, { name: top.name, count: top.count, ca: Math.round(top.ca) })
            );
          }
          setIsProcessing(false);
          return;
        }

        // ——— Anticipation : chantiers en Avril / prochains mois → rappel
        if (lower.includes("rappels") || lower.includes("rappel") || lower.includes("commander") || lower.includes("matériaux")) {
          const { data: projects } = await supabase
            .from("projects")
            .select("name, start_date")
            .eq("user_id", user.id)
            .not("start_date", "is", null);
          const now = new Date();
          const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
          const inNextMonth = (projects ?? []).filter((p: { start_date: string }) => {
            const d = new Date(p.start_date);
            return d >= nextMonth && d <= nextMonthEnd;
          });
          if (inNextMonth.length >= 2) {
            const label = `Commander les matériaux pour les ${inNextMonth.length} chantiers du mois prochain`;
            await supabase.from("reminders").insert({ user_id: user.id, label, completed: false });
            appendMessage(
              "assistant",
              tReplace("assistantReminderNextMonth", language, { label, count: inNextMonth.length }),
              {
                modifiedEntities: [{ type: "reminder", id: "", name: label, fields: [t("reminderCreated", language)], link: "/dashboard" }],
              }
            );
          } else {
            appendMessage("assistant", t("assistantNotEnoughChantiers", language));
          }
          setIsProcessing(false);
          return;
        }

        // ——— Note un rappel (texte libre)
        if (lower.startsWith("note un rappel") || (lower.includes("rappel") && !lower.includes("marge"))) {
          const label = text.replace(/^(note un rappel( de)?|ajoute un rappel[: ]*)/i, "").trim() || text;
          await supabase.from("reminders").insert({ user_id: user.id, label: label.trim(), completed: false });
          appendMessage("assistant", tReplace("assistantReminderAdded", language, { label }), {
            modifiedEntities: [{ type: "reminder", id: "", name: label, fields: [t("reminder", language)], link: "/dashboard" }],
          });
          setIsProcessing(false);
          return;
        }

        // ——— Crée un projet / Nouveau projet (simple)
        if (lower.startsWith("crée un projet") || lower.startsWith("cree un projet") || lower.includes("nouveau projet")) {
          appendMessage("assistant", t("assistantOpeningNewProject", language));
          router.push("/projets/nouveau");
          setIsProcessing(false);
          return;
        }

        // ——— Ajoute un employé
        if (lower.startsWith("ajoute un employé") || lower.startsWith("ajoute un employe")) {
          appendMessage("assistant", t("assistantOpeningTeam", language));
          router.push("/employees");
          setIsProcessing(false);
          return;
        }

        // ——— "Qu'est-ce que j'ai de prévu demain ?" / "rendez-vous demain"
        if (
          (lower.includes("prévu demain") || lower.includes("prevu demain") || lower.includes("rendez-vous demain") || lower.includes("rdv demain")) ||
          (lower.includes("demain") && (lower.includes("prévu") || lower.includes("prevu") || lower.includes("rendez-vous") || lower.includes("rdv") || lower.includes("prévoir") || lower.includes("prévoir")))
        ) {
          const now = new Date();
          const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
          const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
          const { data: rows } = await supabase
            .from("appointments")
            .select("id, title, start_at, end_at, type, project:projects(id, name)")
            .eq("user_id", user.id)
            .gte("start_at", tomorrowStart.toISOString())
            .lte("start_at", tomorrowEnd.toISOString())
            .order("start_at", { ascending: true });
          const list = (rows ?? []) as unknown as { title: string; start_at: string; end_at: string; type: string; project?: { id: string; name: string } | null }[];
          const typeLabel = (type: string) => (type === "devis" ? t("typeDevis", language) : type === "chantier" ? t("typeChantier", language) : t("typeReunion", language));
          if (list.length === 0) {
            appendMessage("assistant", t("assistantNothingTomorrow", language));
          } else {
            const locale = language === "fr" ? "fr-FR" : "en-GB";
            const lines = list.map(
              (a) => `• **${a.title}** – ${new Date(a.start_at).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })} – ${typeLabel(a.type)}${a.project ? ` (projet : ${a.project.name})` : ""}`
            );
            appendMessage("assistant", tReplace("assistantAppointmentsTomorrow", language, { count: list.length }) + "\n\n" + lines.join("\n"));
          }
          setIsProcessing(false);
          return;
        }

        // ——— "Prends-moi rendez-vous avec le client Leroy mardi à 14h"
        const rdvMatch = lower.match(/(?:prends?-moi?\s+)?(?:un\s+)?rendez-vous\s+(?:avec\s+)?(?:le\s+client\s+)?(.+?)\s+(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+(?:à\s+)?(\d{1,2})h?/i);
        if (rdvMatch) {
          const clientPart = rdvMatch[1].trim();
          const dayName = rdvMatch[2].toLowerCase();
          const hour = parseInt(rdvMatch[3], 10);
          const dayMap: Record<string, number> = { dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6 };
          const targetDay = dayMap[dayName] ?? 2;
          const now = new Date();
          let d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          while (d.getDay() !== targetDay) {
            d.setDate(d.getDate() + 1);
          }
          if (d <= now) {
            d.setDate(d.getDate() + 7);
          }
          d.setHours(hour, 0, 0, 0);
          const end = new Date(d);
          end.setHours(end.getHours() + 1, 0, 0, 0);
          const clientName = clientPart.replace(/\s+(?:mardi|lundi|mercredi|jeudi|vendredi|samedi|dimanche).*$/i, "").trim() || "Client";
          let projectId: string | null = null;
          const { data: clients } = await supabase.from("clients").select("id, name").eq("user_id", user.id);
          const client = (clients ?? []).find((c: { name: string }) => c.name.toLowerCase().includes(clientName.toLowerCase()));
          if (client) {
            const { data: proj } = await supabase.from("projects").select("id").eq("user_id", user.id).eq("client_id", client.id).limit(1).single();
            if (proj) projectId = (proj as { id: string }).id;
          }
          const title = `RDV – ${clientName}`;
          const { error: insertErr } = await supabase.from("appointments").insert({
            user_id: user.id,
            title,
            project_id: projectId,
            start_at: d.toISOString(),
            end_at: end.toISOString(),
            type: "reunion",
            updated_at: new Date().toISOString(),
          });
          if (insertErr) {
            appendMessage("assistant", tReplace("assistantAppointmentError", language, { msg: insertErr.message }));
          } else {
            const locale = language === "fr" ? "fr-FR" : "en-GB";
            const dateStr = d.toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
            const projectSuffix = projectId ? t("assistantLinkedToProject", language) : "";
            appendMessage("assistant", tReplace("assistantAppointmentCreated", language, { title, date: dateStr, project: projectSuffix }), {
              modifiedEntities: [{ type: "reminder", id: "", name: title, fields: [t("appointmentLabel", language)], link: "/calendar" }],
            });
          }
          setIsProcessing(false);
          return;
        }

        // ——— Graphique dépenses (camembert) : "Répartition des dépenses" / "dépenses par catégorie"
        if (lower.includes("dépenses") || lower.includes("depenses") || lower.includes("répartition") || lower.includes("camembert")) {
          const { data: projects } = await supabase
            .from("projects")
            .select("name, material_costs")
            .eq("user_id", user.id);
          const withCosts = (projects ?? []).filter((p: { material_costs: number }) => (p.material_costs ?? 0) > 0);
          const total = withCosts.reduce((s: number, p: { material_costs: number }) => s + (p.material_costs ?? 0), 0);
          if (total === 0) {
            appendMessage("assistant", t("assistantNoExpenses", language));
          } else {
            const chartData: ChartDataPoint[] = withCosts
              .slice(0, 8)
              .map((p: { name: string; material_costs: number }) => ({
                name: p.name.length > 15 ? p.name.slice(0, 14) + "…" : p.name,
                value: Math.round(p.material_costs ?? 0),
              }));
            if (withCosts.length > 8) {
              const rest = withCosts.slice(8).reduce((s: number, p: { material_costs: number }) => s + (p.material_costs ?? 0), 0);
              chartData.push({ name: language === "fr" ? "Autres" : "Others", value: Math.round(rest) });
            }
            appendMessage(
              "assistant",
              tReplace("assistantExpensesByProject", language, { total: Math.round(total) }),
              { chartData }
            );
          }
          setIsProcessing(false);
          return;
        }

        // Réponse par défaut
        appendMessage("assistant", t("assistantDefaultHelp", language));
      } catch (err) {
        appendMessage("assistant", tReplace("assistantError", language, { msg: err instanceof Error ? err.message : t("assistantErrorGeneric", language) }));
      } finally {
        setIsProcessing(false);
      }
    },
    [appendMessage, pageContext, router, language]
  );

  const value = useMemo<AssistantContextValue>(
    () => ({
      messages,
      pageContext,
      isProcessing,
      sendMessage: handleCommand,
      setPageContext: setPageContextState,
    }),
    [messages, pageContext, isProcessing, handleCommand]
  );

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error("useAssistant must be used within AssistantProvider");
  }
  return ctx;
}
