"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { checkAccess } from "@/lib/access";

export function AccessStateGuard() {
  const pathname = usePathname();

  useEffect(() => {
    const run = async () => {
      if (pathname !== "/welcome") return;
      const supabase = createClient();
      if (!supabase) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_active, trial_started_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (checkAccess(profile)) {
        console.log("[Access Guard] Access verified on client; forcing /dashboard");
        window.location.href = "/dashboard";
      }
    };
    void run();
  }, [pathname]);

  return null;
}
