"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  const { language } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setError("Configuration Supabase manquante.");
      setToast({ type: "error", message: "Configuration Supabase manquante." });
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      setToast({ type: "error", message: resetError.message });
      return;
    }
    setToast({ type: "success", message: t("resetPasswordEmailSent", language) });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {toast && (
        <div className="fixed right-4 top-4 z-[200]">
          <div className={toast.type === "success" ? "rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white shadow-lg" : "rounded-lg bg-red-600 px-4 py-2 text-sm text-white shadow-lg"}>
            {toast.message}
          </div>
        </div>
      )}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-16 w-full max-w-md">
        <Card className="shadow-brand-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-brand-blue-600" />
              {t("forgotPasswordTitle", language)}
            </CardTitle>
            <p className="text-sm text-gray-500">{t("forgotPasswordSubtitle", language)}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendReset} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">{t("email", language)}</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("placeholderEmail", language)}
                  className="min-h-[48px]"
                  required
                />
              </div>
              {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full min-h-[48px]" disabled={loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("sendRecoveryLink", language)}
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-500">
              <Link href="/login" className="font-medium text-brand-blue-600 hover:underline">
                {t("backToLogin", language)}
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
