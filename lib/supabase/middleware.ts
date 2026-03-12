import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
  const isAuthPage = path === "/login" || path === "/signup" || path.startsWith("/auth/");
  const isStatic = path.startsWith("/_next") || path.includes(".");

  if (user && (isAuthPage || path === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (!user && path !== "/" && !isAuthPage && !isStatic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
