"use client";

import { useState, useRef, useEffect } from "react";
import { amountInCurrencyToEur, convertCurrency, formatConvertedCurrency, type Currency, cn } from "@/lib/utils";

function parseAmountInput(s: string): number | null {
  const cleaned = s.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

type Props = {
  amountEur: number;
  displayCurrency: Currency;
  onCommit: (newEur: number) => Promise<void>;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

export function InlineEditableAmountEur({
  amountEur,
  displayCurrency,
  onCommit,
  disabled,
  className,
  "aria-label": ariaLabel,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const displayed = formatConvertedCurrency(amountEur, displayCurrency);

  const commit = async () => {
    const raw = parseAmountInput(draft);
    if (raw == null) {
      setEditing(false);
      return;
    }
    const newEur = amountInCurrencyToEur(raw, displayCurrency);
    setBusy(true);
    try {
      await onCommit(newEur);
    } finally {
      setBusy(false);
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        disabled={busy}
        className={cn(
          "w-[7.5rem] min-w-0 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-sm tabular-nums shadow-sm",
          className
        )}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") void commit();
          if (e.key === "Escape") setEditing(false);
        }}
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || busy}
      className={cn(
        "tabular-nums rounded px-0.5 text-left underline decoration-dotted decoration-slate-400 underline-offset-2 hover:bg-slate-100 disabled:opacity-50 disabled:no-underline",
        className
      )}
      aria-label={ariaLabel}
      onClick={() => {
        const inDisplay = convertCurrency(amountEur, displayCurrency);
        setDraft(inDisplay.toFixed(2));
        setEditing(true);
      }}
    >
      {displayed}
    </button>
  );
}
