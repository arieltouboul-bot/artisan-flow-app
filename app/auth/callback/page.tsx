"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const supabase = createClient();
      if (!supabase) {
        setError("Supabase non configuré.");
        return;
      }
      const code = searchParams.get("code");
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
      }
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: existingProfile, error: profileLookupError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profileLookupError) {
        setError(profileLookupError.message);
        return;
      }

      if (!existingProfile) {
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        const { error: upsertError } = await supabase.from("profiles").upsert(
          {
            user_id: user.id,
            company_name: (meta.company_name as string) ?? null,
            preferred_language: meta.preferred_language === "en" ? "en" : "fr",
            preferred_currency:
              meta.preferred_currency === "USD" ||
              meta.preferred_currency === "GBP" ||
              meta.preferred_currency === "ILS"
                ? meta.preferred_currency
                : "EUR",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        if (upsertError) {
          setError(upsertError.message);
          return;
        }
      }

      router.replace("/clients?welcome=1");
    };
    run();
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 p-6 text-center">
      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-brand-blue-600" />
          <p className="text-sm text-gray-600">Confirmation en cours...</p>
        </>
      )}
    </div>
  );
}
