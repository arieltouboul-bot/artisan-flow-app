import { NextRequest, NextResponse } from "next/server";

export interface ParsedSupplierInfo {
  name: string;
  address: string;
  phone: string;
}

/** Regex: téléphone FR (10 chiffres, espaces/tirets/points) ou international (+33, etc.) */
const PHONE_REGEX = /(\+?\d[\d\s.\-()]{8,20}\d|\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2})/g;

function parseWithHeuristic(text: string): ParsedSupplierInfo {
  const trimmed = text.trim();
  const phones: string[] = [];
  let rest = trimmed.replace(PHONE_REGEX, (m) => {
    phones.push(m.trim());
    return " ";
  });
  rest = rest.replace(/\s+/g, " ").trim();
  const phone = phones[0] ?? "";

  const parts = rest.split(/[,;\n]/).map((p) => p.trim()).filter(Boolean);
  const name = parts[0] ?? "";
  const address = parts.slice(1).join(", ") || rest;
  return { name, address, phone };
}

export async function POST(request: NextRequest) {
  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return NextResponse.json({ error: "text required" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "Tu extrais d'un texte copié depuis Google Maps les champs: nom du lieu, adresse postale, numéro de téléphone. Réponds UNIQUEMENT en JSON valide avec exactement les clés: name, address, phone. Utilise des chaînes vides si absent.",
            },
            {
              role: "user",
              content: text,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const raw = data.choices?.[0]?.message?.content;
        if (raw) {
          const parsed = JSON.parse(raw) as { name?: string; address?: string; phone?: string };
          return NextResponse.json({
            name: String(parsed.name ?? "").trim(),
            address: String(parsed.address ?? "").trim(),
            phone: String(parsed.phone ?? "").trim(),
          });
        }
      }
    } catch {
      // Fall through to heuristic
    }
  }

  const result = parseWithHeuristic(text);
  return NextResponse.json(result);
}
