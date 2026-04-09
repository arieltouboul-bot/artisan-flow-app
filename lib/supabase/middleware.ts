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
  if (path.startsWith("/_next") || path.includes("/static/")) {
    return NextResponse.next({ request });
  }
  const isPublicLanding = path === "/";
  const isLoginOrSignup = path === "/login" || path === "/signup";
  const isAccessPage = path === "/access";
  const isAuthCallback = path.startsWith("/auth/");
  const isPublicRoute = isPublicLanding || isLoginOrSignup || isAuthCallback || isAccessPage;
  const isStatic = path.startsWith("/_next") || path.includes(".");

  // Static routes are always reachable.
  if (isStatic) {
    return response;
  }

  // If not connected and trying to access protected area -> login.
  if (!user) {
    if (isPublicRoute) return response;
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Connected users trying to access /access or /login are redirected if already eligible.
  if (isAccessPage || isLoginOrSignup) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active, trial_started_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (checkAccess(profile)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  if (isPublicLanding || isAuthCallback) {
    return response;
  }

  // Connected user trying to access app routes must have active access.
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, trial_started_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const canAccessApp = checkAccess(profile);
  console.log("Middleware Access Check:", {
    userId: user.id,
    isActive: profile?.is_active ?? false,
    trialStartedAt: profile?.trial_started_at ?? null,
    canAccessApp,
  });
  if (!canAccessApp) {
    return NextResponse.redirect(new URL("/access", request.url));
  }

  return response;
}
