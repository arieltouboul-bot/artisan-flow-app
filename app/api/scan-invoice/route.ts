import { NextRequest, NextResponse } from "next/server";

export interface ScanInvoiceResult {
  vendor: string;
  date: string;
  amount_ht: number;
  tva: number;
  amount_ttc: number;
  items: string[];
  currency: string;
}

const SYSTEM_PROMPT = `You are an ultra-precise invoice OCR assistant. You MUST analyze invoices in three languages: French (Français), English, and Hebrew (עברית).

## Tax intelligence
- Identify tax by country:
  - France / EU: TVA (Taxe sur la Valeur Ajoutée). Standard rate 20%. If tax amount is not written, compute it: HT × 0.20 or TTC - TTC/1.20.
  - International / UK: VAT (Value Added Tax). If rate or amount is missing, use 20% or compute from TTC.
  - Israel: Ma'am / מע"מ. Standard rate 17%. If tax amount is not written, compute: HT × 0.17 or TTC - TTC/1.17.
- Always output both amount_ht (excl. tax) and tva (tax amount in same currency). If only TTC is visible, derive HT and tva using the detected or standard rate for the country.

## Strict extraction rules
- vendor: Company name or brand (from header/logo). String. Empty string if not found.
- currency: Detect symbol from the document (€ → EUR, $ → USD, ₪ → ILS, £ → GBP). Return ISO 4217 code only: EUR, USD, ILS, or GBP. Default EUR if unclear.
- date: Any date on the invoice. Convert to YYYY-MM-DD only. Use the invoice date or issue date.
- amount_ht: Total amount excluding tax. Number. 0 if missing.
- tva: Tax amount in the same currency. Number. Compute if not written (see tax rules above). 0 if no tax.
- amount_ttc: Total amount including tax. Number. 0 if missing.
- items: Array of strings. List product/line item descriptions. Empty array [] if none.

## Output format
Reply with a single valid JSON object. No markdown, no code fence, no explanation before or after. Only the raw JSON with exactly these keys: vendor, date, amount_ht, tva, amount_ttc, items, currency.`;

function normalizeDate(s: string): string {
  const trimmed = String(s ?? "").trim();
  const match = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const d = trimmed.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);
  if (d) {
    const y = d[3].length === 2 ? `20${d[3]}` : d[3];
    const month = d[2].padStart(2, "0");
    const day = d[1].padStart(2, "0");
    return `${y}-${month}-${day}`;
  }
  return new Date().toISOString().slice(0, 10);
}

const CURRENCY_WHITELIST = ["EUR", "USD", "ILS", "GBP"] as const;
function normalizeCurrency(s: string): string {
  const code = String(s ?? "").trim().toUpperCase();
  if (CURRENCY_WHITELIST.includes(code as (typeof CURRENCY_WHITELIST)[number])) return code;
  return "EUR";
}

export async function POST(request: NextRequest) {
  let body: { image?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const image = typeof body.image === "string" ? body.image.trim() : "";
  if (!image) {
    return NextResponse.json({ error: "image required (base64 data URL)" }, { status: 400 });
  }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 1024,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract invoice data from this image. Return only one JSON object, no other text." },
              { type: "image_url", image_url: { url: image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}` } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err || "Vision API error" }, { status: res.status === 402 ? 402 : 502 });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Empty response from Vision API" }, { status: 502 });
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const vendor = String(parsed.vendor ?? "").trim();
    const date = normalizeDate(String(parsed.date ?? ""));
    const amount_ht = Number(parsed.amount_ht);
    const tva = Number(parsed.tva);
    const amount_ttc = Number(parsed.amount_ttc);
    const items = Array.isArray(parsed.items)
      ? (parsed.items as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean)
      : [];
    const currency = normalizeCurrency(String(parsed.currency ?? "EUR"));

    const result: ScanInvoiceResult = {
      vendor,
      date,
      amount_ht: Number.isFinite(amount_ht) ? amount_ht : 0,
      tva: Number.isFinite(tva) ? tva : 0,
      amount_ttc: Number.isFinite(amount_ttc) ? amount_ttc : 0,
      items,
      currency,
    };
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
