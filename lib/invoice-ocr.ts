/**
 * Local invoice OCR: regex parsing of raw text (from Tesseract or other OCR).
 * Used client-side after Tesseract.js extracts text from image.
 */

export interface ParsedInvoiceData {
  vendor: string;
  date: string;
  amount_ht: number;
  tva: number;
  amount_ttc: number;
  items: string[];
}

const EMPTY: ParsedInvoiceData = {
  vendor: "",
  date: "",
  amount_ht: 0,
  tva: 0,
  amount_ttc: 0,
  items: [],
};

/** Parse a numeric amount from string (handles 1 234,56 or 1234.56 or 1234,56) */
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
  if (!text || !text.trim()) return result;

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const fullText = text.replace(/\r?\n/g, " ");

  // —— Montant TTC : après TOTAL TTC, TTC, NET A PAYER, etc.
  const ttcPatterns = [
    /(?:TOTAL\s+TTC|TTC\s*TOTAL|NET\s+(?:À|A)\s+PAYER|TOTAL\s+À\s+PAYER|TOTAL\s+NET)[\s:]*([\d\s.,]+)\s*€?/i,
    /(?:TTC|TOTAL)[\s:]*([\d\s.,]+)\s*€?/i,
    /(?:montant\s+total|total\s+ttc)[\s:]*([\d\s.,]+)\s*€?/i,
  ];
  for (const re of ttcPatterns) {
    const m = fullText.match(re);
    if (m) {
      const val = parseAmount(m[1]);
      if (val != null && val > 0) {
        result.amount_ttc = val;
        break;
      }
    }
  }
  // Fallback: last number that looks like a total (e.g. line ending with €)
  if (result.amount_ttc === 0) {
    const lastEuro = fullText.match(/([\d\s.,]+)\s*€\s*$/);
    if (lastEuro) {
      const val = parseAmount(lastEuro[1]);
      if (val != null && val > 0) result.amount_ttc = val;
    }
  }

  // —— TVA : montant en € (ligne "TVA : 12,34 €") ou déduit depuis taux (20% TTC → HT = TTC/1.2, TVA = TTC - HT)
  const tvaAmountRe = /TVA[\s:]*([\d\s.,]+)\s*€/gi;
  const tvaAmountMatch = fullText.match(tvaAmountRe);
  if (tvaAmountMatch) {
    const lastTva = tvaAmountMatch[tvaAmountMatch.length - 1];
    const val = parseAmount(lastTva.replace(/TVA[\s:]*/i, "").replace("€", ""));
    if (val != null && val >= 0) result.tva = val;
  }
  if (result.amount_ttc > 0 && result.tva === 0) {
    const rateMatch = fullText.match(/(\d{1,2}(?:[.,]\d+)?)\s*%\s*TVA/);
    if (rateMatch) {
      const rate = parseFloat(rateMatch[1].replace(",", "."));
      if (Number.isFinite(rate) && rate > 0 && rate < 30)
        result.tva = result.amount_ttc - result.amount_ttc / (1 + rate / 100);
    }
  }

  // —— Amount HT (from TTC - TVA if we have both)
  if (result.amount_ttc > 0 && result.tva >= 0) {
    result.amount_ht = Math.round((result.amount_ttc - result.tva) * 100) / 100;
  }
  const htRe = /(?:HT|TOTAL\s+HT|MONTANT\s+HT)[\s:]*([\d\s.,]+)\s*€?/i;
  const htMatch = fullText.match(htRe);
  if (htMatch) {
    const val = parseAmount(htMatch[1]);
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
