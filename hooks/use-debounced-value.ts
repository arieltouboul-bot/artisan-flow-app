"use client";

import { useState, useEffect } from "react";

/**
 * Debounces a value by `delayMs` (default 300). Useful for instant UI in controlled input + filtered lists.
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
