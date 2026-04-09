"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import { checkAccess } from "@/lib/access";
import { Clock3, KeyRound, Loader2, Lock } from "lucide-react";

const MASTER_CODE = "PRO-BUILD-2026";

export default function WelcomeAccessPage() {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [localLanguage, setLocalLanguage] = useState(language);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [trialStartedAt, setTrialStartedAt] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [activating, setActivating] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);

  useEffect(() => {
    setLocalLanguage(language);
  }, [language]);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      if (!supabase) {
        setError(t("welcomeSupabaseMissing", localLanguage));
        setLoadingUser(false);
        return;
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active, trial_started_at")
        .eq("user_id", user.id)
        .maybeSingle();
      console.log("[Check Access] profile:", profile);
      setTrialStartedAt(profile?.trial_started_at ?? null);
      if (checkAccess(profile)) {
        console.log("[Redirecting] /welcome -> /dashboard (already authorized)");
        setIsFinalizing(true);
        window.location.replace("/dashboard");
        return;
      }
      setLoadingUser(false);
    };
    void loadUser();
  }, [localLanguage, router]);

  const activateWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const code = accessCode.trim().toUpperCase();
    if (!code) return;

    setError(null);
    setSuccess(null);
    setActivating(true);
    const supabase = createClient();
    if (!supabase) {
      setError(t("welcomeSupabaseMissing", localLanguage));
      setActivating(false);
      return;
    }

    if (code !== MASTER_CODE) {
      alert("Code incorrect / Invalid Code");
      setError("Invalid Code. Please try again.");
      setActivating(false);
      return;
    }
    console.log("[Code Validated] Master code accepted");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(t("notLoggedIn", localLanguage));
      setActivating(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ is_active: true })
      .eq("id", user.id);

    if (error) {
      console.error("SUPABASE ERROR:", error);
      alert("Erreur Supabase : " + error.message);
      setError("Invalid Code. Please try again.");
      setActivating(false);
      return;
    }
    void data;

    await supabase.auth.refreshSession();
    setIsFinalizing(true);
    setSuccess("Access Granted!");
    setActivating(false);
    console.log("[Redirecting] Activation success -> /dashboard");
    window.location.replace("/dashboard");
  };

  const startTrial = async () => {
    if (!userId) return;
    setError(null);
    setSuccess(null);
    setStartingTrial(true);

    const supabase = createClient();
    if (!supabase) {
      setError(t("welcomeSupabaseMissing", localLanguage));
      setStartingTrial(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError(t("notLoggedIn", localLanguage));
      setStartingTrial(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({ trial_started_at: new Date().toISOString() })
      .eq("id", user.id);

    if (error) {
      console.log("[welcome] trial update failed:", error);
      alert("Erreur Trial : " + error.message);
      setError(t("welcomeTrialStartFailed", localLanguage));
      setStartingTrial(false);
      return;
    }
    void data;

    console.log("[Code Validated] Trial started");
    await supabase.auth.refreshSession();
    setIsFinalizing(true);
    setTrialStartedAt(new Date().toISOString());
    setSuccess(t("welcomeTrialStarted", localLanguage));
    setStartingTrial(false);
    console.log("[Redirecting] Trial success -> /dashboard");
    window.location.replace("/dashboard");
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gray-100 px-4 py-8 sm:py-12">
        <div className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-700">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t("loading", localLanguage)}</span>
          </div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("welcomeAccessTitle", localLanguage)}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("welcomeAccessSubtitle", localLanguage)}</p>
        </div>

        {(error || success) && (
          <div className={error ? "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" : "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"}>
            {error ?? success}
          </div>
        )}

        {isFinalizing && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
            {t("welcomeFinalizingAccess", localLanguage)}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-2 border-indigo-100 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                <KeyRound className="h-4 w-4 text-blue-600" />
                {t("welcomePremiumTitle", localLanguage)}
              </CardTitle>
              <p className="text-sm text-slate-500">{t("welcomePremiumSubtitle", localLanguage)}</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={activateWithCode} className="space-y-3">
                <Input
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder={t("welcomeAccessCodePlaceholder", localLanguage)}
                  className="min-h-[48px]"
                  disabled={loadingUser || activating || startingTrial}
                  autoComplete="off"
                />
                <Button type="submit" className="w-full min-h-[48px] bg-blue-600 text-white hover:bg-blue-700" disabled={loadingUser || activating || startingTrial || !accessCode.trim()}>
                  {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : t("welcomeActivateButton", localLanguage)}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-100 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                <Clock3 className="h-4 w-4 text-blue-600" />
                {t("welcomeTrialTitle", localLanguage)}
              </CardTitle>
              <p className="text-sm text-slate-500">{t("welcomeTrialSubtitle", localLanguage)}</p>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-slate-500">{t("welcomeTrialReassuring", localLanguage)}</p>
              <Button
                type="button"
                className="w-full min-h-[48px] bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => void startTrial()}
                disabled={loadingUser || activating || startingTrial}
              >
                {loadingUser || startingTrial ? <Loader2 className="h-4 w-4 animate-spin" /> : t("welcomeTrialButton", localLanguage)}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
