"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Hammer, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import { clearAccessIntent, getAccessIntent } from "@/lib/access-intent";
import { trialDaysRemaining } from "@/lib/access";

function LoginPageContent() {
  const { language, setLanguage } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null);
  const isTrialValid = (trialStartedAt: string | null | undefined) => trialDaysRemaining(trialStartedAt) > 0;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setError("Configuration Supabase manquante.");
      setLoading(false);
      return;
    }
    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signError) {
      setLoading(false);
      setError(signError.message);
      return;
    }
    await supabase.auth.refreshSession();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      window.location.href = "/login";
      return;
    }
    const intent = getAccessIntent();
    if (intent === "premium") {
      await supabase
        .from("profiles")
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      clearAccessIntent();
      window.location.href = "/dashboard";
      return;
    }
    if (intent === "trial") {
      await supabase
        .from("profiles")
        .update({ trial_started_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("trial_started_at", null);
      clearAccessIntent();
      window.location.href = "/dashboard";
      return;
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (profileErr || !profile) {
      setLoading(false);
      window.location.href = "/access";
      return;
    }
    setLoading(false);
    if (profile.is_active || isTrialValid(profile.trial_started_at)) {
      window.location.href = "/dashboard";
    } else {
      window.location.href = "/access";
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotMessage(null);
    setForgotLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setForgotError("Configuration Supabase manquante.");
      setForgotLoading(false);
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(recoveryEmail, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset-password`,
    });
    setForgotLoading(false);
    if (resetError) {
      setForgotError(resetError.message);
      return;
    }
    setForgotMessage(t("resetPasswordEmailSentModal", language));
  };

  useEffect(() => {
    if (!forgotOpen) {
      setForgotError(null);
      setForgotMessage(null);
      setRecoveryEmail(email);
    }
  }, [forgotOpen, email]);

  useEffect(() => {
    if (searchParams.get("reset") === "success") {
      setResetSuccessMessage("Mot de passe mis à jour avec succès. Connectez-vous.");
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
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
            <CardTitle className="text-xl text-center">Connexion</CardTitle>
            <p className="text-sm text-gray-500 text-center">
              ArtisanFlow - Gestion chantiers & finances
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {resetSuccessMessage && (
                <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{resetSuccessMessage}</p>
              )}
              <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-700 mb-1 block">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  className="min-h-[48px]"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="text-sm font-medium text-gray-700 mb-1 block">
                  Mot de passe
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-[48px]"
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{error}</p>
              )}
              <Button type="submit" className="w-full min-h-[48px]" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>
            <div className="mt-3 text-center">
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-sm font-medium text-brand-blue-600 hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
            <p className="text-sm text-gray-500 text-center mt-4">
              Pas encore de compte ?{" "}
              <Link href="/signup" className="text-brand-blue-600 hover:underline font-medium">
                S&apos;inscrire
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("forgotPasswordTitle", language)}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label htmlFor="recovery-email" className="mb-1 block text-sm font-medium text-gray-700">
                {t("email", language)}
              </label>
              <Input
                id="recovery-email"
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder={t("placeholderEmail", language)}
                className="min-h-[48px]"
                required
              />
            </div>
            {forgotError && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{forgotError}</p>}
            {forgotMessage && <p className="rounded-lg bg-emerald-50 p-2 text-sm text-emerald-700">{forgotMessage}</p>}
            <Button type="submit" className="w-full min-h-[48px]" disabled={forgotLoading}>
              {forgotLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("sendRecoveryLink", language)}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
