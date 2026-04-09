"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Hammer, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import { clearAccessIntent, getAccessIntent } from "@/lib/access-intent";
import { trialDaysRemaining } from "@/lib/access";

function SignupPageContent() {
  const { language, setLanguage } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [friendlyDuplicate, setFriendlyDuplicate] = useState(false);
  const isTrialValid = (trialStartedAt: string | null | undefined) => trialDaysRemaining(trialStartedAt) > 0;

  const applyAccessIntent = async () => {
    const intent = getAccessIntent();
    if (!intent) return;
    const supabase = createClient();
    if (!supabase) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (intent === "premium") {
      await supabase
        .from("profiles")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("profiles")
        .update({ trial_started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("trial_started_at", null);
    }
    clearAccessIntent();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setCanResendConfirmation(false);
    setFriendlyDuplicate(false);
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setError("Configuration Supabase manquante.");
      setLoading(false);
      return;
    }
    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (signError) {
      const lower = signError.message.toLowerCase();
      const isAlreadyRegistered =
        lower.includes("user already registered") ||
        lower.includes("already") ||
        lower.includes("exists") ||
        lower.includes("registered");
      const duplicateMsg =
        language === "fr"
          ? "Cet email est déjà utilisé. Veuillez vous connecter."
          : "This email is already in use. Please sign in.";
      const displayError = isAlreadyRegistered ? duplicateMsg : signError.message;
      setError(displayError);
      setToast({ type: "error", message: displayError });
      setCanResendConfirmation(isAlreadyRegistered);
      setFriendlyDuplicate(isAlreadyRegistered);
      return;
    }
    if (data?.user) {
      const { error: profileUpsertError } = await supabase
        .from("profiles")
        .upsert({ id: data.user.id, email });
      // Keep signup resilient if the profiles schema uses user_id instead of id.
      if (profileUpsertError) {
        await supabase.from("profiles").upsert(
          {
            user_id: data.user.id,
            company_name: companyName.trim() || null,
            preferred_language: language,
            preferred_currency: "EUR",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
      }
    }
    if (data?.user && !data.session) {
      setInfo(t("signupCheckSpam", language));
    }
    if (data?.session) {
      await supabase.auth.refreshSession();
      await applyAccessIntent();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) {
        window.location.href = "/access";
        return;
      }
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", currentUser.id)
        .single();
      if (profileErr || !profile) {
        window.location.href = "/access";
        return;
      }
      if (profile.is_active || isTrialValid(profile.trial_started_at)) {
        window.location.href = "/dashboard";
      } else {
        window.location.href = "/access";
      }
      return;
    }
    setToast({ type: "success", message: t("signupSuccessToast", language) });
    setSuccessOpen(true);
  };

  const handleResendConfirmation = async () => {
    const supabase = createClient();
    if (!supabase || !email) return;
    setResendLoading(true);
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setResendLoading(false);
    if (resendError) {
      setToast({ type: "error", message: resendError.message });
      return;
    }
    setToast({ type: "success", message: t("signupCheckSpam", language) });
  };

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(id);
  }, [toast]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      {toast && (
        <div className="fixed right-4 top-4 z-[200]">
          <div className={toast.type === "success" ? "rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white shadow-lg" : "rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg"}>
            {toast.message}
          </div>
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-4 flex justify-end">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setLanguage("fr")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${language === "fr" ? "bg-brand-blue-500 text-white" : "text-slate-600"}`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold ${language === "en" ? "bg-brand-blue-500 text-white" : "text-slate-600"}`}
            >
              EN
            </button>
          </div>
        </div>
        <div className="flex justify-center mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue-500 text-white shadow-brand-glow">
            <Hammer className="h-8 w-8" />
          </div>
        </div>
        <Card className="overflow-hidden shadow-brand-glow">
          <CardHeader>
            <CardTitle className="text-xl text-center">{t("signupTitle", language)}</CardTitle>
            <p className="text-sm text-gray-500 text-center">{t("signupSubtitle", language)}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-700 mb-1 block">
                  {t("email", language)}
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("placeholderEmail", language)}
                  className="min-h-[48px]"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="text-sm font-medium text-gray-700 mb-1 block">
                  {t("passwordMin", language)}
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-[48px]"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label htmlFor="company" className="text-sm font-medium text-gray-700 mb-1 block">
                  {t("companyName", language)}
                </label>
                <Input
                  id="company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t("placeholderCompany", language)}
                  className="min-h-[48px]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">{t("language", language)}</label>
                <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
                  <button
                    type="button"
                    onClick={() => setLanguage("fr")}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium min-h-[44px] ${language === "fr" ? "bg-brand-blue-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                  >
                    🇫🇷 {t("french", language)}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    className={`flex-1 rounded-md px-3 py-2 text-sm font-medium min-h-[44px] ${language === "en" ? "bg-brand-blue-500 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                  >
                    🇬🇧 {t("english", language)}
                  </button>
                </div>
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
              )}
              {friendlyDuplicate && (
                <p className="text-sm text-amber-800 bg-amber-50 p-2 rounded-lg">
                  {t("signupDuplicateFriendlyExact", language)}{" "}
                  <Link href="/login" className="font-medium text-brand-blue-700 underline">
                    {t("signIn", language)}
                  </Link>{" "}
                  {language === "fr" ? "ou" : "or"}{" "}
                  <Link href="/forgot-password" className="font-medium text-brand-blue-700 underline">
                    {t("resetPassword", language)}
                  </Link>
                  .
                </p>
              )}
              {info && (
                <p className="text-sm text-amber-800 bg-amber-50 p-2 rounded-lg">{info}</p>
              )}
              {canResendConfirmation && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full min-h-[44px]"
                  onClick={handleResendConfirmation}
                  disabled={resendLoading}
                >
                  {resendLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("resendConfirmationEmail", language)}
                </Button>
              )}
              <Button type="submit" className="w-full min-h-[48px]" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  t("signUp", language)
                )}
              </Button>
            </form>
            <p className="text-sm text-gray-500 text-center mt-4">
              {t("alreadyAccount", language)}{" "}
              <Link href="/login" className="text-brand-blue-600 hover:underline font-medium">
                {t("signIn", language)}
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="h-screen w-screen max-w-none rounded-none border-0 p-0">
          <div className="flex h-full w-full items-center justify-center bg-white p-6 text-center">
            <div className="max-w-xl">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  ✉️ {language === "fr" ? "Email envoyé" : "Email sent"}
                </DialogTitle>
              </DialogHeader>
              <p className="mt-4 text-base text-gray-700">
                {t("signupEmailSentModal", language).replace("{email}", email)}
              </p>
              <DialogFooter className="mt-6">
                <Link href="/login" className="w-full sm:w-auto">
                  <Button className="w-full min-h-[44px]">{t("backToLogin", language)}</Button>
                </Link>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <SignupPageContent />
    </Suspense>
  );
}
