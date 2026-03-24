"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { FloatingAssistant } from "@/components/assistant/floating-assistant";
import { FloatingContextHelp } from "@/components/ui/floating-context-help";
import { useProfile } from "@/hooks/use-profile";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";

const MOBILE_BREAKPOINT = 768;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setIsMobile(mq.matches);
    const listener = () => setIsMobile(mq.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const close = () => setIsSidebarOpen(false);
    window.addEventListener("artisanflow-close-mobile-sidebar", close);
    return () => window.removeEventListener("artisanflow-close-mobile-sidebar", close);
  }, []);

  useEffect(() => {
    const collapse = () => setSidebarCollapsed(true);
    window.addEventListener("artisanflow-collapse-desktop-sidebar", collapse);
    return () => window.removeEventListener("artisanflow-collapse-desktop-sidebar", collapse);
  }, []);

  const { profile, upsertProfile } = useProfile();
  const { language, setLanguage } = useLanguage();
  useEffect(() => {
    const lang = profile?.preferred_language;
    if (lang === "fr" || lang === "en") setLanguage(lang);
  }, [profile?.preferred_language, setLanguage]);

  useEffect(() => {
    const profileLang = profile?.preferred_language;
    if (!profileLang || (profileLang !== "fr" && profileLang !== "en")) return;
    if (profileLang === language) return;
    void upsertProfile({ preferred_language: language });
  }, [language, profile?.preferred_language, upsertProfile]);

  useEffect(() => {
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSidebarOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  const showOverlay = isMobile && isSidebarOpen;
  const sidebarTranslate = isMobile && !isSidebarOpen ? "-translate-x-full" : "translate-x-0";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      {/* Overlay : fond noir semi-transparent pour fermer le menu au clic */}
      {showOverlay && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar : translate-x-0 si ouvert, -translate-x-full si caché (mobile) ; toujours visible sur PC */}
      <div
        className={cn(
          "fixed left-0 top-0 z-[100] h-full md:z-[100]",
          isMobile && !isSidebarOpen && "pointer-events-none"
        )}
      >
        <div
          className={cn(
            "h-full w-[260px] transition-transform duration-300 ease-out md:w-auto md:translate-x-0",
            sidebarTranslate
          )}
        >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onCloseMobile={() => setIsSidebarOpen(false)}
          mobileMode={isMobile}
        />
        </div>
      </div>

      <main
        className={cn(
          "relative min-h-screen p-4 pt-20 pb-8 transition-[margin] duration-200 md:pt-4 md:p-6 lg:p-8",
          sidebarCollapsed ? "md:ml-[72px]" : "md:ml-[260px]"
        )}
      >
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="mx-auto max-w-7xl min-w-0"
        >
          {children}
        </motion.div>
        <FloatingContextHelp />
        <FloatingAssistant />
      </main>
    </div>
  );
}
