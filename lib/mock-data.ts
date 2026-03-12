import type { Project, Client, Invoice, Quote } from "@/types/database";

export const mockClients: Client[] = [
  { id: "1", name: "Jean Dupont", email: "jean@mail.com", phone: "06 12 34 56 78", address: "12 rue de la Paix, 75001 Paris", contract_amount: null, material_costs: null, amount_collected: null },
  { id: "2", name: "Marie Martin", email: "marie@mail.com", phone: "06 98 76 54 32", address: "5 avenue des Champs, 69001 Lyon", contract_amount: null, material_costs: null, amount_collected: null },
  { id: "3", name: "Pierre Bernard", email: null, phone: "06 11 22 33 44", address: "3 place du Marché, 33000 Bordeaux", contract_amount: null, material_costs: null, amount_collected: null },
];

export const mockProjects: Project[] = [
  { id: "1", name: "Rénovation cuisine", client_id: "1", status: "en_cours", address: "12 rue de la Paix, Paris", start_date: "2025-01-15", end_date: null, started_at: "2025-01-15", ended_at: null, notes: null, contract_amount: 5000, material_costs: 2000, amount_collected: 2000, created_at: "2025-01-10T00:00:00Z", updated_at: "2025-03-01T00:00:00Z", client: mockClients[0] },
  { id: "2", name: "Extension salon", client_id: "2", status: "en_preparation", address: "5 avenue des Champs, Lyon", start_date: null, end_date: null, started_at: null, ended_at: null, notes: null, contract_amount: 8000, material_costs: 0, amount_collected: 0, created_at: "2025-02-01T00:00:00Z", updated_at: "2025-02-20T00:00:00Z", client: mockClients[1] },
  { id: "3", name: "Salle de bain complète", client_id: "1", status: "termine", address: "12 rue de la Paix, Paris", start_date: "2024-11-01", end_date: "2025-01-10", started_at: "2024-11-01", ended_at: "2025-01-10", notes: null, contract_amount: 4500, material_costs: 1800, amount_collected: 4500, created_at: "2024-10-15T00:00:00Z", updated_at: "2025-01-10T00:00:00Z", client: mockClients[0] },
];

export const mockInvoices: Invoice[] = [
  { id: "1", project_id: "1", number: "FAC-2025-001", amount: 4500, status: "en_retard", due_date: "2025-02-28", created_at: "2025-02-01T00:00:00Z" },
  { id: "2", project_id: "1", number: "FAC-2025-002", amount: 3200, status: "emise", due_date: "2025-04-15", created_at: "2025-03-01T00:00:00Z" },
  { id: "3", project_id: "3", number: "FAC-2024-012", amount: 8900, status: "payee", due_date: "2025-01-15", paid_at: "2025-01-10", created_at: "2024-12-20T00:00:00Z" },
];

/** CA par mois (pour graphique) - 6 derniers mois */
export const mockMonthlyRevenue: { month: string; ca: number; cout: number }[] = [
  { month: "Oct", ca: 12000, cout: 7200 },
  { month: "Nov", ca: 18500, cout: 11100 },
  { month: "Déc", ca: 22000, cout: 13200 },
  { month: "Jan", ca: 15000, cout: 9000 },
  { month: "Fév", ca: 8500, cout: 5100 },
  { month: "Mar", ca: 14200, cout: 8520 },
];

export function getDashboardStats() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const yearStart = new Date(currentYear, 0, 1);
  const monthStart = new Date(currentYear, currentMonth, 1);

  const invoicesPaid = mockInvoices.filter((i) => i.status === "payee");
  const invoicesOverdue = mockInvoices.filter((i) => i.status === "en_retard");
  const caAnnuel = mockMonthlyRevenue.reduce((s, m) => s + m.ca, 0);
  const caMensuel = mockMonthlyRevenue[mockMonthlyRevenue.length - 1]?.ca ?? 0;
  const coutAnnuel = mockMonthlyRevenue.reduce((s, m) => s + m.cout, 0);
  const margeAnnuelle = caAnnuel - coutAnnuel;
  const margeMensuelle = (mockMonthlyRevenue[mockMonthlyRevenue.length - 1]?.ca ?? 0) - (mockMonthlyRevenue[mockMonthlyRevenue.length - 1]?.cout ?? 0);
  const facturesImpayees = invoicesOverdue.reduce((s, i) => s + i.amount, 0);

  return {
    caMensuel,
    caAnnuel,
    margeMensuelle,
    margeAnnuelle,
    tauxMarge: caAnnuel > 0 ? Math.round((margeAnnuelle / caAnnuel) * 100) : 0,
    facturesImpayees,
    nbFacturesEnRetard: invoicesOverdue.length,
    chartData: mockMonthlyRevenue,
  };
}
