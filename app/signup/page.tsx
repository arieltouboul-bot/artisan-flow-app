"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Hammer, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";

export default function SignupPage() {
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
   const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      (typeof window !== "undefined" ? window.location.origin : "");
    const { error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${baseUrl}/auth/confirm`,
        data: {
          company_name: companyName.trim() || null,
        },
      },
    });
    setLoading(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center"
        >
          <Card className="overflow-hidden shadow-brand-glow">
            <CardContent className="pt-6">
              <p className="text-gray-700 mb-4">{t("checkEmail", language)}</p>
              <Link href="/login">
                <Button className="w-full min-h-[48px]">{t("backToLogin", language)}</Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
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
    </div>
  );
}
