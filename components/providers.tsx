"use client";

import { LanguageProvider } from "@/context/language-context";
import { AccessStateGuard } from "@/components/layout/access-state-guard";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AccessStateGuard />
      {children}
    </LanguageProvider>
  );
}
