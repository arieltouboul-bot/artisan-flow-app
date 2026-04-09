export type AccessIntent = "premium" | "trial";

const ACCESS_INTENT_KEY = "af_access_status";

export function setAccessIntent(intent: AccessIntent): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCESS_INTENT_KEY, intent);
}

export function getAccessIntent(): AccessIntent | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(ACCESS_INTENT_KEY);
  return raw === "premium" || raw === "trial" ? raw : null;
}

export function clearAccessIntent(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACCESS_INTENT_KEY);
}
