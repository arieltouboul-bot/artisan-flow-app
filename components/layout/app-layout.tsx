"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "./sidebar";
import { Logo } from "./logo";
import { FloatingAssistant } from "@/components/assistant/floating-assistant";
import { cn } from "@/lib/utils";

const MOBILE_BREAKPOINT = 768;

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isOpen = mobileMenuOpen;
  const [isMobile, setIsMobile] = useState(true); // true par défaut pour éviter flash sidebar sur mobile
  const pathname = usePathname();

  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);

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
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Barre mobile : logo cliquable (ouvre/ferme la Sidebar) en haut à gauche */}
      <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden">
        <button
          type="button"
          onClick={toggleMobileMenu}
          className="flex min-h-[44px] min-w-[44px] -ml-1 items-center justify-start rounded-lg transition-colors hover:bg-gray-100 active:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500 focus-visible:ring-offset-2"
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
          aria-expanded={isOpen}
        >
          <Logo showText size="compact" />
        </button>
        <div className="flex-1 min-w-2" aria-hidden="true" />
      </header>

      {/* Overlay mobile quand le menu est ouvert */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar : sur mobile glisse depuis la gauche (animation) ; sur PC reste fixe à gauche */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full md:z-40",
          isMobile && !mobileMenuOpen && "pointer-events-none"
        )}
      >
        <motion.div
          className="h-full"
          initial={false}
          animate={{
            x: isMobile && !mobileMenuOpen ? "-100%" : 0,
          }}
          transition={{
            type: "tween",
            duration: 0.3,
            ease: [0.32, 0.72, 0, 1],
          }}
        >
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
            onCloseMobile={() => setMobileMenuOpen(false)}
            mobileMode={isMobile}
          />
        </motion.div>
      </div>

      {/* Contenu : marge à gauche sur desktop uniquement */}
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
        <FloatingAssistant />
      </main>
    </div>
  );
}

