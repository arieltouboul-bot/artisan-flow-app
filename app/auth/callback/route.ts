import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");

  if (code) {
    const response = NextResponse.next();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });
    await supabase.auth.exchangeCodeForSession(code);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
      await supabase.from("profiles").upsert(
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
      const target = requestedNext ?? (existingProfile ? "/dashboard" : "/clients");
      return NextResponse.redirect(new URL(target, request.url), { headers: response.headers });
    }
    return NextResponse.redirect(new URL(requestedNext ?? "/dashboard", request.url), { headers: response.headers });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
