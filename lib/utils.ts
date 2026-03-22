import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Currency = "EUR" | "USD" | "GBP" | "ILS";

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  ILS: "₪",
};

const CURRENCY_LOCALES: Record<Currency, string> = {
  EUR: "fr-FR",
  USD: "en-US",
  GBP: "en-GB",
  ILS: "he-IL",
};

/** 1 EUR = X unités de la devise. Ex: 1 EUR = 1.08 USD → montant_affiché = montant_eur * rate */
export const EUR_TO_CURRENCY_RATES: Record<Currency, number> = {
  EUR: 1,
  USD: 1.08,
  GBP: 0.85,
  ILS: 3.95,
};

/** Convertit un montant stocké en EUR vers la devise d'affichage. */
export function convertCurrency(amountEur: number, toCurrency: Currency): number {
  const rate = EUR_TO_CURRENCY_RATES[toCurrency];
  return rate != null ? amountEur * rate : amountEur;
}

/** Montant saisi dans `currency` → équivalent EUR (pour agrégation dashboard / graphiques). */
export function amountInCurrencyToEur(amount: number, currency: Currency): number {
  const rate = EUR_TO_CURRENCY_RATES[currency];
  if (!rate || rate === 0) return amount;
  return amount / rate;
}

/** Affiche un montant dans la devise de la ligne (pas de conversion). */
export function formatAmountInCurrency(amount: number, currency: Currency): string {
  return formatCurrencyWithSymbol(amount, currency);
}

/** Devise enregistrée pour une ligne revenu (EUR / USD / ILS). */
export type RevenueCurrency = Extract<Currency, "EUR" | "USD" | "ILS">;

export function parseStoredRevenueCurrency(c: string | null | undefined): RevenueCurrency {
  if (c === "USD" || c === "ILS" || c === "EUR") return c;
  return "EUR";
}

export function getCurrencySymbol(currency: Currency = "EUR"): string {
  return CURRENCY_SYMBOLS[currency];
}

export function formatCurrency(value: number, currency: Currency = "EUR"): string {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    style: "currency",
    currency,
  }).format(value);
}

/** Formate un montant en EUR converti dans la devise d'affichage (pour CA, marges, etc. stockés en EUR). */
export function formatConvertedCurrency(amountEur: number, displayCurrency: Currency): string {
  const converted = convertCurrency(amountEur, displayCurrency);
  return formatCurrency(converted, displayCurrency);
}

/** Pour affichage avec symbole personnalisé (ex: "1 234,56 €") */
export function formatCurrencyWithSymbol(value: number, currency: Currency = "EUR"): string {
  const locale = currency === "EUR" ? "fr-FR" : "en-US";
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ${getCurrencySymbol(currency)}`;
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatTime(date: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

/** Retourne YYYY-MM-DD en heure locale */
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Retourne HH:MM en heure locale */
export function toTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
