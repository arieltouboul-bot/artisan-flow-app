import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function getCurrencySymbol(currency: Currency = "EUR"): string {
  return CURRENCY_SYMBOLS[currency];
}

export function formatCurrency(value: number, currency: Currency = "EUR"): string {
  return new Intl.NumberFormat(CURRENCY_LOCALES[currency], {
    style: "currency",
    currency,
  }).format(value);
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
