"use client";

import Link from "next/link";
import { Clock3 } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { useProfile } from "@/hooks/use-profile";
import { t, tReplace } from "@/lib/translations";
import { trialDaysRemaining } from "@/lib/access";

export function TrialBanner() {
  const { profile } = useProfile();
  const { language } = useLanguage();

  const isActive = Boolean(profile?.is_active);
  const daysRemaining = trialDaysRemaining(profile?.trial_started_at ?? null);
  const show = !isActive && daysRemaining > 0;

  if (!show) return null;

  return (
    <div className="sticky top-16 z-40 mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:text-sm">
      <Clock3 className="h-3.5 w-3.5 shrink-0" />
      <span>{tReplace("trialBannerText", language, { days: daysRemaining })}</span>{" "}
      <Link href="/access" className="font-semibold underline underline-offset-2">
        {t("trialBannerActivateLink", language)}
      </Link>
    </div>
  );
}
