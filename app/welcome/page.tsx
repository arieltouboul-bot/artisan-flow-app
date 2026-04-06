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
  const { language } = useLanguage();
  const [loadingUser, setLoadingUser] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activating, setActivating] = useState(false);
  const [startingTrial, setStartingTrial] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient();
      if (!supabase) {
        setError(t("welcomeSupabaseMissing", language));
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
      setLoadingUser(false);
    };
    void loadUser();
  }, [language, router]);

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
      setError(t("welcomeSupabaseMissing", language));
      setActivating(false);
      return;
    }

    if (code !== MASTER_CODE) {
      setError(t("welcomeInvalidCode", language));
      setActivating(false);
      return;
    }

    const nowIso = new Date().toISOString();
    const { error: activateErr } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          is_active: true,
          updated_at: nowIso,
        },
        { onConflict: "user_id" }
      );
    if (activateErr) {
      setError(t("welcomeActivationFailed", language));
      setActivating(false);
      return;
    }

    setSuccess(t("welcomeActivationSuccess", language));
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
      setError(t("welcomeSupabaseMissing", language));
      setStartingTrial(false);
      return;
    }

    const nowIso = new Date().toISOString();
    const { error: trialErr } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: userId,
          trial_started_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: "user_id" }
      );

    if (trialErr) {
      setError(t("welcomeTrialStartFailed", language));
      setStartingTrial(false);
      return;
    }

    setSuccess(t("welcomeTrialStarted", language));
    setStartingTrial(false);
    router.replace("/dashboard");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("welcomeAccessTitle", language)}</h1>
          <p className="mt-2 text-sm text-slate-600">{t("welcomeAccessSubtitle", language)}</p>
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
                {t("welcomePremiumTitle", language)}
              </CardTitle>
              <p className="text-sm text-slate-500">{t("welcomePremiumSubtitle", language)}</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={activateWithCode} className="space-y-3">
                <Input
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder={t("welcomeAccessCodePlaceholder", language)}
                  className="min-h-[48px]"
                  disabled={loadingUser || activating || startingTrial}
                  autoComplete="off"
                />
                <Button type="submit" className="w-full min-h-[48px] bg-blue-600 text-white hover:bg-blue-700" disabled={loadingUser || activating || startingTrial || !accessCode.trim()}>
                  {activating ? <Loader2 className="h-4 w-4 animate-spin" /> : t("welcomeActivateButton", language)}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-100 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-slate-900">
                <Clock3 className="h-4 w-4 text-blue-600" />
                {t("welcomeTrialTitle", language)}
              </CardTitle>
              <p className="text-sm text-slate-500">{t("welcomeTrialSubtitle", language)}</p>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                className="w-full min-h-[48px] bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => void startTrial()}
                disabled={loadingUser || activating || startingTrial}
              >
                {loadingUser || startingTrial ? <Loader2 className="h-4 w-4 animate-spin" /> : t("welcomeTrialButton", language)}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
