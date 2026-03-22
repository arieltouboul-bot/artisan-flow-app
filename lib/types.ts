export interface ExpenseInsertPayload {
  user_id: string;
  vendor?: string;
  description: string;
  amount_ht: number;
  amount_ttc?: number | null;
  tva_amount?: number | null;
  tva_rate: number;
  category: string;
  date: string;
  invoice_date?: string;
  image_url?: string | null;
  project_id?: string | null;
  confidence_score?: number | null;
}

export interface MaterialScanResult {
  vendor: string;
  date: string;
  amount_ht: number;
  tva: number;
  amount_ttc: number;
}

