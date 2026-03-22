import { parseInvoiceText } from "@/lib/invoice-ocr";

export interface OcrConfidence {
  vendor: number;
  total_amount: number;
  tva_amount: number;
  date: number;
  overall: number;
}

export interface OcrDecisionResult {
  vendor: string;
  total_amount: number;
  tva_amount: number;
  date: string;
  confidence: OcrConfidence;
}

const clamp = (n: number) => Math.max(0, Math.min(1, n));

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  const t = normalize(text);
  return keywords.some((k) => t.includes(normalize(k)));
}

export function extractInvoiceDecision(text: string): OcrDecisionResult {
  const parsed = parseInvoiceText(text);
  const normalized = normalize(text);

  const totalKeywords = ["total", "ttc", "amount", "amount due", "montant", "net a payer", "net a payer"];
  const tvaKeywords = ["tva", "vat", "tax", "maam", "מע"];
  const dateKeywords = ["date", "invoice date", "issued", "le "];

  const vendorConfidence = parsed.vendor ? 0.75 : 0.25;
  const totalConfidence = parsed.amount_ttc > 0 ? (hasAnyKeyword(normalized, totalKeywords) ? 0.92 : 0.72) : 0.2;
  const tvaConfidence = parsed.tva > 0 ? (hasAnyKeyword(normalized, tvaKeywords) ? 0.85 : 0.65) : 0.3;
  const dateConfidence = parsed.date ? (hasAnyKeyword(normalized, dateKeywords) ? 0.9 : 0.7) : 0.2;

  const overall = clamp((vendorConfidence + totalConfidence + tvaConfidence + dateConfidence) / 4);

  return {
    vendor: parsed.vendor,
    total_amount: parsed.amount_ttc,
    tva_amount: parsed.tva,
    date: parsed.date,
    confidence: {
      vendor: vendorConfidence,
      total_amount: totalConfidence,
      tva_amount: tvaConfidence,
      date: dateConfidence,
      overall,
    },
  };
}

