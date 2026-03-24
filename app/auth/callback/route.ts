import { createServerClient as createRouteHandlerClient, type CookieOptionsWithName } from "@supabase/auth-helpers-nextjs";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.log("[auth/callback] Missing Supabase env variables.");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next");
  const type = requestUrl.searchParams.get("type");

  if (!code) {
    console.log("[auth/callback] Missing code query parameter.");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();
  const supabase = createRouteHandlerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptionsWithName }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.log("[auth/callback] exchangeCodeForSession failed:", {
      message: error.message,
      status: error.status ?? null,
      code: error.code ?? null,
      next,
      type,
    });
    return NextResponse.redirect(new URL("/login", request.url), { headers: response.headers });
  }

  if (type === "recovery" || !!next) {
    console.log("[auth/callback] Recovery flow detected, redirecting to reset password.");
    return NextResponse.redirect(new URL("/auth/reset-password", request.url), { headers: response.headers });
  }

  console.log("[auth/callback] Redirecting to dashboard.");
  return NextResponse.redirect(new URL("/dashboard", request.url), { headers: response.headers });
}
