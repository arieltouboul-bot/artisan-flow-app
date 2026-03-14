import { NextRequest, NextResponse } from "next/server";

export interface ScanInvoiceResult {
  vendor: string;
  date: string;
  amount_ht: number;
  tva: number;
  amount_ttc: number;
  items: string[];
}

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
          {
            role: "system",
            content:
              "You are an invoice OCR assistant. Analyze the invoice image and extract structured data. Reply ONLY with a valid JSON object (no markdown, no code block) with exactly these keys: vendor (string, store/supplier name), date (string, format YYYY-MM-DD), amount_ht (number, total excluding tax), tva (number, VAT amount in same currency), amount_ttc (number, total including tax), items (array of strings, list of product/line descriptions). Use 0 for missing numbers. Use empty string for missing vendor. Use empty array for items if none found.",
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract invoice data from this image and return the JSON object only." },
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

    const result: ScanInvoiceResult = {
      vendor,
      date,
      amount_ht: Number.isFinite(amount_ht) ? amount_ht : 0,
      tva: Number.isFinite(tva) ? tva : 0,
      amount_ttc: Number.isFinite(amount_ttc) ? amount_ttc : 0,
      items,
    };
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
