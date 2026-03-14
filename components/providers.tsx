"use client";

import { LanguageProvider } from "@/context/language-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
