/** En préparation (gris), En cours (bleu), Urgent/Retard (rouge), Terminé (vert), Annulé (gris) */
export type ProjectStatus = "en_preparation" | "en_cours" | "urgent_retard" | "termine" | "annule";

export interface Client {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  /** Montant du contrat (€) */
  contract_amount: number | null;
  /** Coût des matériaux (€) */
  material_costs: number | null;
  /** Montant déjà encaissé (€) */
  amount_collected: number | null;
  created_at?: string;
}

/** Marge brute = contrat - coûts */
export function clientMargeBrute(c: Client): number {
  const ctr = c.contract_amount ?? 0;
  const costs = c.material_costs ?? 0;
  return ctr - costs;
}

/** Somme restante due = contrat - encaissé */
export function clientRestantDu(c: Client): number {
  const ctr = c.contract_amount ?? 0;
  const collected = c.amount_collected ?? 0;
  return Math.max(0, ctr - collected);
}

export interface Project {
  id: string;
  user_id?: string;
  name: string;
  client_id: string;
  client?: Client;
  status: ProjectStatus;
  address?: string | null;
  /** Date de début (YYYY-MM-DD) */
  start_date: string | null;
  /** Date de fin prévue (YYYY-MM-DD) */
  end_date: string | null;
  /** Anciens champs conservés pour compat */
  started_at?: string | null;
  ended_at?: string | null;
  /** Notes / instructions / codes d'accès */
  notes: string | null;
  /** Montant du contrat (€) */
  contract_amount: number | null;
  /** Coût des matériaux (€) */
  material_costs: number | null;
  /** Montant déjà encaissé (€) */
  amount_collected: number | null;
  /** Taux TVA du projet (%) */
  vat_rate?: number | null;
  created_at: string;
  updated_at: string;
}

/** Marge par projet = contrat - coûts matériaux */
export function projectMarge(p: Project): number {
  const ctr = p.contract_amount ?? 0;
  const costs = p.material_costs ?? 0;
  return ctr - costs;
}

/** Restant dû pour le projet */
export function projectRestantDu(p: Project): number {
  const ctr = p.contract_amount ?? 0;
  const collected = p.amount_collected ?? 0;
  return Math.max(0, ctr - collected);
}

/** Restant dû après somme des revenus (table `revenues`, équivalent EUR) vs budget contrat */
export function projectBalanceDueRevenue(p: Project, revenueSumEur: number): number {
  const ctr = p.contract_amount ?? 0;
  return Math.max(0, ctr - revenueSumEur);
}

export interface ProjectTask {
  id: string;
  project_id: string;
  label: string;
  completed: boolean;
  sort_order: number;
  created_at?: string;
}

export interface ProjectPhoto {
  id: string;
  project_id: string;
  url: string;
  name?: string;
  created_at: string;
}

export interface ProjectTransaction {
  id: string;
  project_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  created_at?: string;
}

export type AppointmentType = "devis" | "chantier" | "reunion";

export interface Appointment {
  id: string;
  user_id: string;
  title: string;
  project_id: string | null;
  project?: { id: string; name: string; address?: string | null } | null;
  start_at: string;
  end_at: string;
  type: AppointmentType;
  created_at?: string;
  updated_at?: string;
}

export interface QuoteItem {
  id?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price_buy: number;
  unit_price_sell: number;
  total_buy: number;
  total_sell: number;
  margin: number;
  /** Pour distinguer Matériel / Pose sur le PDF */
  lineType?: "material" | "pose" | null;
  /** Taux de TVA par ligne (0, 5.5, 10, 20) */
  tva_rate?: number;
}

export interface Quote {
  id: string;
  project_id: string;
  client_id: string;
  number: string;
  /** Notes ou observations (affichées sur le devis / PDF) */
  notes?: string | null;
  /** Pourcentage d'acompte à la signature (ex: 30) */
  acompte_percentage?: number | null;
  items: QuoteItem[];
  total_ht: number;
  total_ttc: number;
  tva_rate: number;
  status: "brouillon" | "envoye" | "accepte" | "refuse";
  valid_until: string;
  created_at: string;
}

/** Catégories de dépenses (table expenses) */
export type ExpenseCategory =
  | "achat_materiel"
  | "location"
  | "main_oeuvre"
  | "sous_traitance";

export interface Expense {
  id: string;
  project_id: string;
  user_id: string;
  description: string;
  amount_ht: number;
  tva_rate: number;
  /** Montant TVA absolu (optionnel, pour les rapports) */
  tva_amount?: number;
  /** Montant TTC (optionnel, pour les rapports) */
  amount_ttc?: number;
  /** URL de l'image de facture scannée (optionnel) */
  image_url?: string | null;
  category: ExpenseCategory;
  date: string;
  created_at?: string;
}

export interface Invoice {
  id: string;
  project_id: string;
  quote_id?: string;
  number: string;
  amount: number;
  status: "emise" | "payee" | "en_retard";
  due_date: string;
  paid_at?: string | null;
  created_at: string;
}

export interface Employee {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  role: string;
  salary_type?: "daily" | "monthly" | null;
  salary_amount?: number | null;
  salary_currency?: "EUR" | "USD" | "GBP" | "ILS" | null;
  created_at?: string;
}

export interface EmployeePayment {
  id: string;
  user_id: string;
  employee_id: string;
  project_id: string | null;
  payment_date: string;
  amount: number;
  currency: "EUR" | "USD" | "GBP" | "ILS";
  created_at?: string;
}

export interface ProjectEmployee {
  id: string;
  project_id: string;
  employee_id: string;
  employee?: Employee;
  created_at?: string;
}

export interface MaterialCatalogItem {
  id: string;
  user_id: string;
  name: string;
  unit: string;
  price_per_unit: number;
  category: string | null;
  created_at?: string;
}

export interface Rental {
  id: string;
  user_id: string;
  project_id: string;
  equipment_name: string;
  renter_name: string;
  start_date: string;
  end_date: string;
  price_per_day: number;
  created_at?: string;
  updated_at?: string;
}
