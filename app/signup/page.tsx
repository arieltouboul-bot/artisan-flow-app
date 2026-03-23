"use client";

import { useEffect, useState } from "react";
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

export default function SignupPage() {
  const { language, setLanguage } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setError("Configuration Supabase manquante.");
      setLoading(false);
      return;
    }
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : null) ??
      (typeof window !== "undefined" ? window.location.origin : "");
    const { error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${baseUrl}/auth/callback`,
        data: {
          company_name: companyName.trim() || null,
          preferred_language: language,
          preferred_currency: "EUR",
        },
      },
    });
    setLoading(false);
    if (signError) {
      setError(signError.message);
      setToast({ type: "error", message: t("signupErrorToast", language) });
      return;
    }
    setToast({ type: "success", message: t("signupSuccessToast", language) });
    setSuccessOpen(true);
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{language === "fr" ? "Inscription réussie" : "Sign-up successful"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-700">{t("checkEmail", language)}</p>
          <DialogFooter>
            <Link href="/login" className="w-full sm:w-auto">
              <Button className="w-full min-h-[44px]">{t("backToLogin", language)}</Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
