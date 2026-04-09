"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/language-context";
import { setAccessIntent } from "@/lib/access-intent";
import { KeyRound, Lock, Clock3 } from "lucide-react";

const MASTER_CODE = "PRO-BUILD-2026";
const content = {
  fr: {
    title: "Choisissez votre accès",
    subtitle: "Entrez votre code Premium ou démarrez un essai de 7 jours.",
    premiumTitle: "Accès Premium",
    premiumSubtitle: "Débloquez l'application avec votre code client.",
    codePlaceholder: "Code d'accès",
    premiumCta: "Continuer en Premium",
    trialTitle: "Essai 7 jours",
    trialSubtitle: "Testez ArtisanFlow sans engagement.",
    trialCta: "Démarrer l'essai",
    invalidCode: "Code invalide.",
  },
  en: {
    title: "Choose your access",
    subtitle: "Enter your Premium code or start a 7-day trial.",
    premiumTitle: "Premium Access",
    premiumSubtitle: "Unlock the app with your customer code.",
    codePlaceholder: "Access code",
    premiumCta: "Continue with Premium",
    trialTitle: "7-day Trial",
    trialSubtitle: "Try ArtisanFlow with no commitment.",
    trialCta: "Start trial",
    invalidCode: "Invalid code.",
  },
} as const;

export default function AccessPage() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [localLanguage, setLocalLanguage] = useState(language);
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const c = content[localLanguage];

  const handlePremium = () => {
    if (accessCode.trim().toUpperCase() !== MASTER_CODE) {
      setError(c.invalidCode);
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{c.title}</h1>
          <p className="mt-2 text-sm text-slate-600">{c.subtitle}</p>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-2 border-indigo-100 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                <KeyRound className="h-4 w-4 text-blue-600" />
                {c.premiumTitle}
              </CardTitle>
              <p className="text-sm text-slate-500">{c.premiumSubtitle}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder={c.codePlaceholder}
                className="min-h-[48px]"
                autoComplete="off"
              />
              <Button type="button" className="w-full min-h-[48px] bg-blue-600 text-white hover:bg-blue-700" onClick={handlePremium}>
                {c.premiumCta}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-100 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                <Clock3 className="h-4 w-4 text-blue-600" />
                {c.trialTitle}
              </CardTitle>
              <p className="text-sm text-slate-500">{c.trialSubtitle}</p>
            </CardHeader>
            <CardContent>
              <Button type="button" className="w-full min-h-[48px] bg-blue-600 text-white hover:bg-blue-700" onClick={handleTrial}>
                {c.trialCta}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
