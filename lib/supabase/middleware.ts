import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkAccess } from "@/lib/access";

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLoginOrSignup = path === "/login" || path === "/signup";
  const isAuthCallback = path.startsWith("/auth/");
  const isPublicLanding = path === "/";
  const isAuthPage = isLoginOrSignup || isAuthCallback;
  const isWelcomePage = path === "/welcome";
  const isStatic = path.startsWith("/_next") || path.includes(".");

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active, trial_started_at")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log("User Status:", profile?.is_active, profile?.trial_started_at);

    const canAccessApp = checkAccess(profile);
    console.log("[Access Check] canAccessApp:", canAccessApp, "path:", path);

    if ((isAuthPage || isPublicLanding) && !isWelcomePage) {
      console.log("[Redirecting]", path, "->", canAccessApp ? "/dashboard" : "/welcome");
      return NextResponse.redirect(new URL(canAccessApp ? "/dashboard" : "/welcome", request.url));
    }

    if (!canAccessApp && !isWelcomePage && !isAuthPage && !isStatic) {
      console.log("[Redirecting]", path, "-> /welcome");
      return NextResponse.redirect(new URL("/welcome", request.url));
    }

    if (canAccessApp && isWelcomePage) {
      console.log("[Redirecting] /welcome -> /dashboard");
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (!user && !isPublicLanding && !isLoginOrSignup && !isAuthCallback && !isStatic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
