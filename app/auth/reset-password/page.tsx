"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  const { language } = useLanguage();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      if (!supabase) {
        setError(t("connectionError", language));
        setReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      setHasSession(Boolean(data.session));
      if (!data.session) {
        setError(t("resetPasswordExpiredRestart", language));
      }
      setReady(true);
    };
    run();
  }, [language]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError(t("resetPasswordMinLength", language));
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError(t("connectionError", language));
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login?reset=success");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
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
            ) : hasSession ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">{t("newPassword", language)}</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="min-h-[48px]"
                    required
                  />
                </div>
                {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}
                <Button type="submit" className="w-full min-h-[48px]" disabled={loading}>
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("resetPasswordSubmit", language)}
                </Button>
              </form>
            ) : (
              <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-700">{error}</p>
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
