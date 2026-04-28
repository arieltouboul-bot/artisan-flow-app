"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";

export function BlueprintLoader() {
  const { language } = useLanguage();
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/92 backdrop-blur-sm">
      <div className="relative h-40 w-64 overflow-hidden rounded-lg border border-sky-500/30 bg-[#060d18] shadow-[0_0_40px_rgba(56,189,248,0.15)]">
        <motion.div
          className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(56,189,248,0.12)_50%,transparent_100%)]"
          initial={{ x: "-100%" }}
          animate={{ x: "100%" }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
        />
        <svg className="absolute inset-2 h-[calc(100%-1rem)] w-[calc(100%-1rem)] text-sky-500/40" viewBox="0 0 200 120">
          <defs>
            <pattern id="loader-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="200" height="120" fill="url(#loader-grid)" />
          <rect x="20" y="24" width="160" height="72" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="8 6" />
        </svg>
      </div>
      <motion.p
        className="mt-6 max-w-sm text-center text-sm font-medium text-sky-200/90"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {t("architectBlueprintLoading", language)}
      </motion.p>
    </div>
  );
}
