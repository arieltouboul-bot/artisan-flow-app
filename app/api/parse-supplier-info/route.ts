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

  const result = parseWithHeuristic(text);
  return NextResponse.json(result);
}
