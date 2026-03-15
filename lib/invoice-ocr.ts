/**
 * Local invoice OCR: regex parsing of raw text (from Tesseract or other OCR).
 * Used client-side after Tesseract.js extracts text from image.
 * 100% gratuit, aucune API externe.
 */

export type InvoiceCurrency = "EUR" | "USD" | "ILS" | "GBP";

/** Result type used by the scan UI (materiel + factures). */
export interface ScanInvoiceResult {
  vendor: string;
  date: string;
  amount_ht: number;
  tva: number;
  amount_ttc: number;
  items: string[];
  currency: string;
}

export interface ParsedInvoiceData {
  vendor: string;
  date: string;
  amount_ht: number;
  tva: number;
  amount_ttc: number;
  items: string[];
  currency?: InvoiceCurrency;
}

const EMPTY: ParsedInvoiceData = {
  vendor: "",
  date: "",
  amount_ht: 0,
  tva: 0,
  amount_ttc: 0,
  items: [],
};

/**
 * Clean OCR output: remove control chars, weird symbols, and nonsensical mixed scripts.
 * Keeps digits, Latin letters, basic punctuation, and Hebrew for invoice parsing.
 */
export function cleanExtractedText(text: string): string {
  if (!text || typeof text !== "string") return "";
  return (
    text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[^\w\s\u0590-\u05FF.,;:\/\-€$₪£%°'"\n\r]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\n\s+/g, "\n")
      .trim()
  );
}

/**
 * Parse amount: only accept numbers with at most 2 decimal places.
 * Rejects phone/SIRET. Normalizes European format: 1.234,56€ → 1234.56 (remove thousand dots, comma → dot).
 */
function parseAmountStrict(s: string): number | null {
  let cleaned = s.replace(/\s/g, "").replace(/[€$₪£]/g, "").trim();
  if (/,\d{1,2}$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    cleaned = cleaned.replace(",", ".");
  }
  const match = cleaned.match(/^\d{1,9}(?:\.\d{1,2})?$/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Legacy: accepts any number (used for dates, rates). */
function parseAmount(s: string): number | null {
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  const match = cleaned.match(/[\d.]+/);
  if (!match) return null;
  const n = parseFloat(match[0]);
  return Number.isFinite(n) ? n : null;
}

/** Normalize date to YYYY-MM-DD from DD/MM/YYYY, DD.MM.YY, DD-MM-YYYY */
function normalizeDate(s: string): string {
  const trimmed = String(s ?? "").trim();
  const iso = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = trimmed.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (d) {
    const y = d[3].length === 2 ? `20${d[3]}` : d[3];
    const month = d[2].padStart(2, "0");
    const day = d[1].padStart(2, "0");
    return `${y}-${month}-${day}`;
  }
  return "";
}

/**
 * Parse raw OCR text and extract vendor, date, amount_ht, tva, amount_ttc, items.
 * Uses regex for: TTC (after TOTAL/TTC/NET), TVA (amount or %), Date (DD/MM/YYYY, DD.MM.YY).
 */
export function parseInvoiceText(text: string): ParsedInvoiceData {
  const result = { ...EMPTY };
  const raw = cleanExtractedText(text);
  if (!raw) return result;

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const fullText = raw.replace(/\r?\n/g, " ");

  // —— Currency: detect symbol in text (€, $, ₪, £)
  if (/\€|EUR|euro/i.test(fullText)) result.currency = "EUR";
  else if (/\$|USD|dollar/i.test(fullText)) result.currency = "USD";
  else if (/₪|ILS|shekel|NIS/i.test(fullText)) result.currency = "ILS";
  else if (/£|GBP|pound/i.test(fullText)) result.currency = "GBP";

  // —— Montant TTC : TOTAL, TTC, NET, סך הכל (Hebrew total)
  const ttcPatterns = [
    /(?:TOTAL\s+TTC|TTC\s*TOTAL|NET\s+(?:À|A)\s+PAYER|TOTAL\s+À\s+PAYER|TOTAL\s+NET)[\s:]*([\d\s.,]+)\s*[€$₪£]?/i,
    /(?:TTC|TOTAL)[\s:]*([\d\s.,]+)\s*[€$₪£]?/i,
    /(?:montant\s+total|total\s+ttc)[\s:]*([\d\s.,]+)\s*[€$₪£]?/i,
    /\u05E1\u05DA\u0020\u05D4\u05DB\u05DC[\s:]*([\d\s.,]+)/, // סך הכל
    /(?:grand\s+total|total\s+amount)[\s:]*([\d\s.,]+)\s*[€$₪£]?/i,
  ];
  const candidates: number[] = [];
  for (const re of ttcPatterns) {
    const m = fullText.match(re);
    if (m) {
      const val = parseAmountStrict(m[1].trim());
      if (val != null && val > 0 && val < 1e9) candidates.push(val);
    }
  }
  if (candidates.length > 0) result.amount_ttc = Math.max(...candidates);
  if (result.amount_ttc === 0) {
    const lastWithSymbol = fullText.match(/([\d\s.,]{1,20})\s*[€$₪£]\s*$/);
    if (lastWithSymbol) {
      const val = parseAmountStrict(lastWithSymbol[1].trim());
      if (val != null && val > 0) result.amount_ttc = val;
    }
  }

  // —— TVA / VAT / מע"מ (Ma'am Israel): amount or derive from rate
  const tvaAmountPatterns = [
    /TVA[\s:]*([\d\s.,]+)\s*[€$₪£]?/gi,
    /VAT[\s:]*([\d\s.,]+)\s*[€$₪£]?/gi,
    /\u05DE\u05E2[\u05F3"]?\u05DE[\s:]*([\d\s.,]+)/g, // Ma'am מע"מ
  ];
  for (const re of tvaAmountPatterns) {
    const match = fullText.match(re);
    if (match) {
      const last = match[match.length - 1];
      const val = parseAmountStrict(last.replace(/TVA[\s:]*|VAT[\s:]*|\u05DE\u05E2[\u05F3"]?\u05DE[\s:]*/gi, "").replace(/[€$₪£]/g, "").trim());
      if (val != null && val >= 0) {
        result.tva = val;
        break;
      }
    }
  }
  if (result.amount_ttc > 0 && result.tva === 0) {
    const ratePatterns = [/(\d{1,2}(?:[.,]\d+)?)\s*%\s*TVA/i, /(\d{1,2}(?:[.,]\d+)?)\s*%\s*VAT/i, /\u05DE\u05E2[\u05F3"]?\u05DE\s*(\d{1,2}(?:[.,]\d+)?)\s*%/];
    for (const rateRe of ratePatterns) {
      const rateMatch = fullText.match(rateRe);
      if (rateMatch) {
        const rate = parseFloat(rateMatch[1].replace(",", "."));
        if (Number.isFinite(rate) && rate > 0 && rate < 30) {
          result.tva = result.amount_ttc - result.amount_ttc / (1 + rate / 100);
          break;
        }
      }
    }
    if (result.tva === 0 && result.currency) {
      const defaultRate = result.currency === "ILS" ? 17 : result.currency === "GBP" ? 20 : 20;
      result.tva = result.amount_ttc - result.amount_ttc / (1 + defaultRate / 100);
    }
  }

  // —— Amount HT (from TTC - TVA if we have both)
  if (result.amount_ttc > 0 && result.tva >= 0) {
    result.amount_ht = Math.round((result.amount_ttc - result.tva) * 100) / 100;
  }
  const htRe = /(?:HT|TOTAL\s+HT|MONTANT\s+HT)[\s:]*([\d\s.,]+)\s*[€$₪£]?/i;
  const htMatch = fullText.match(htRe);
  if (htMatch) {
    const val = parseAmountStrict(htMatch[1].trim());
    if (val != null && val > 0) result.amount_ht = val;
  }

  // —— Date : DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY, DD.MM.YY
  const dateRe = /(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/g;
  let dateMatch = dateRe.exec(fullText);
  let bestDate = "";
  while (dateMatch) {
    const normalized = normalizeDate(dateMatch[0]);
    if (normalized) bestDate = normalized;
    dateMatch = dateRe.exec(fullText);
  }
  if (bestDate) result.date = bestDate;

  // —— Vendor: first non-numeric line (often company name at top)
  for (const line of lines) {
    if (line.length < 3) continue;
    if (/^\d+[\s.,]?\d*$/.test(line) || /^\s*€|TVA|TTC|TOTAL|HT\s*$/i.test(line)) continue;
    if (line.length > 4 && line.length < 80) {
      result.vendor = line;
      break;
    }
  }

  // —— Items: lines that look like product/description (optional)
  const itemLines = lines.filter(
    (l) =>
      l.length > 2 &&
      l.length < 120 &&
      !/^TOTAL|TTC|TVA|HT\s|€\s*$|^\d{1,2}[\/.-]\d/.test(l) &&
      (/\d/.test(l) || l.length > 10)
  );
  if (itemLines.length > 0) result.items = itemLines.slice(0, 30);

  return result;
}
