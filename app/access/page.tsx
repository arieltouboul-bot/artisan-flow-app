"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import { setAccessIntent } from "@/lib/access-intent";
import { KeyRound, Lock, Clock3 } from "lucide-react";

const MASTER_CODE = "PRO-BUILD-2026";

export default function AccessPage() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [localLanguage, setLocalLanguage] = useState(language);
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handlePremium = () => {
    if (accessCode.trim().toUpperCase() !== MASTER_CODE) {
      setError(t("accessInvalidCode", localLanguage));
      return;
    }
    setAccessIntent("premium");
    router.push("/signup");
  };

  const handleTrial = () => {
    setAccessIntent("trial");
    router.push("/signup");
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex justify-end">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => {
                setLocalLanguage("fr");
                setLanguage("fr");
              }}
              className={localLanguage === "fr" ? "rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white" : "rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600"}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => {
                setLocalLanguage("en");
                setLanguage("en");
              }}
              className={localLanguage === "en" ? "rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white" : "rounded-md px-3 py-1.5 text-xs font-semibold text-slate-600"}
            >
              EN
            </button>
          </div>
        </div>

        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("accessPageTitle", localLanguage)}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("accessPageSubtitle", localLanguage)}</p>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-2 border-indigo-100 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                <KeyRound className="h-4 w-4 text-blue-600" />
                {t("accessPremiumTitle", localLanguage)}
              </CardTitle>
              <p className="text-sm text-slate-500">{t("accessPremiumSubtitle", localLanguage)}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder={t("accessCodePlaceholder", localLanguage)}
                className="min-h-[48px]"
                autoComplete="off"
              />
              <Button type="button" className="w-full min-h-[48px] bg-blue-600 text-white hover:bg-blue-700" onClick={handlePremium}>
                {t("accessContinuePremium", localLanguage)}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-100 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                <Clock3 className="h-4 w-4 text-blue-600" />
                {t("accessTrialTitle", localLanguage)}
              </CardTitle>
              <p className="text-sm text-slate-500">{t("accessTrialSubtitle", localLanguage)}</p>
            </CardHeader>
            <CardContent>
              <Button type="button" className="w-full min-h-[48px] bg-blue-600 text-white hover:bg-blue-700" onClick={handleTrial}>
                {t("accessContinueTrial", localLanguage)}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
