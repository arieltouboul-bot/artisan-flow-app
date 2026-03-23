"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { CircleHelp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";

export function FloatingContextHelp() {
  const pathname = usePathname();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  const message = useMemo(() => {
    if (pathname.startsWith("/projets")) return t("contextHelpProjects", language);
    if (pathname.startsWith("/revenus")) return t("contextHelpRevenues", language);
    return null;
  }, [pathname, language]);

  if (!message) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[120]">
      {open ? (
        <div className="w-72 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">{t("contextHelpTitle", language)}</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-700">{message}</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("contextHelpTitle", language)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-brand-blue-600 shadow-lg hover:bg-brand-blue-50"
        >
          <CircleHelp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
