"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";

export const dynamic = "force-dynamic";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const check = async () => {
      const supabase = createClient();
      if (!supabase) {
        setError("Configuration Supabase manquante.");
        setReady(true);
        return;
      }
      const type = searchParams.get("type");
      const code = searchParams.get("code");
      const accessToken = searchParams.get("access_token");
      const recoveryDetected = type === "recovery" || !!code || !!accessToken;
      setIsRecoveryFlow(recoveryDetected);
      const { data } = await supabase.auth.getUser();
      if (!data.user && recoveryDetected) {
        setError(t("resetPasswordInvalidLink", language));
      }
      setReady(true);
    };
    check();
  }, [language, searchParams]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(id);
  }, [toast]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError(t("resetPasswordMinLength", language));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("resetPasswordMismatch", language));
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setError("Configuration Supabase manquante.");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      setToast({ type: "error", message: updateError.message });
      return;
    }
    setToast({ type: "success", message: t("resetPasswordSuccess", language) });
    setTimeout(() => router.replace("/login"), 2000);
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
      <div className="mx-auto mt-16 w-full max-w-md">
        <Card className="shadow-brand-glow">
          <CardHeader>
            <CardTitle>{t("resetPasswordTitle", language)}</CardTitle>
          </CardHeader>
          <CardContent>
            {!ready ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-brand-blue-600" />
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                {!isRecoveryFlow && (
                  <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-700">
                    {t("resetPasswordInvalidLink", language)}
                  </p>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t("newPassword", language)}</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="min-h-[48px]"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t("confirmPassword", language)}</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="min-h-[48px]"
                    required
                  />
                </div>
                {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full min-h-[48px]" disabled={loading || !ready}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("resetPasswordSubmit", language)}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
