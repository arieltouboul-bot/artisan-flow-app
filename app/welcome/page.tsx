"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import { MASTER_CODE } from "@/lib/access";
import { Clock3, KeyRound, Loader2, Lock } from "lucide-react";

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
        .select("trial_started_at")
        .eq("user_id", user.id)
        .maybeSingle();
      setTrialStartedAt(profile?.trial_started_at ?? null);
      setLoadingUser(false);
    };
    void loadUser();
  }, [localLanguage, router]);

  const activateWithCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const code = accessCode.trim().toUpperCase();
    const master = MASTER_CODE.trim().toUpperCase();
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

    if (code !== master) {
      setError(t("welcomeInvalidCode", localLanguage));
      setActivating(false);
      return;
    }

    const nowIso = new Date().toISOString();
    const { error: activateErr, data: updatedRows } = await supabase
      .from("profiles")
      .update({
        is_active: true,
        updated_at: nowIso,
      })
      .eq("user_id", userId)
      .select("user_id");
    if (activateErr || !updatedRows || updatedRows.length === 0) {
      setError(t("welcomeActivationFailed", localLanguage));
      setActivating(false);
      return;
    }

    setSuccess(t("welcomeActivationSuccess", localLanguage));
    setActivating(false);
    router.replace("/dashboard");
    router.refresh();
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

    if (trialStartedAt) {
      setSuccess(t("welcomeTrialAlreadyStarted", localLanguage));
      setStartingTrial(false);
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    const nowIso = new Date().toISOString();
    const { error: trialErr, data: trialRows } = await supabase
      .from("profiles")
      .update({
        trial_started_at: nowIso,
        updated_at: nowIso,
      })
      .eq("user_id", userId)
      .is("trial_started_at", null)
      .select("trial_started_at");

    if (trialErr || !trialRows || trialRows.length === 0) {
      setError(t("welcomeTrialStartFailed", localLanguage));
      setStartingTrial(false);
      return;
    }

    setTrialStartedAt(nowIso);
    setSuccess(t("welcomeTrialStarted", localLanguage));
    setStartingTrial(false);
    router.replace("/dashboard");
    router.refresh();
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("welcomeAccessTitle", localLanguage)}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("welcomeAccessSubtitle", localLanguage)}</p>
        </div>

        {(error || success) && (
          <div className={error ? "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" : "rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700"}>
            {error ?? success}
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
