"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/context/language-context";
import { useProfile } from "@/hooks/use-profile";
import { HELP_SECTIONS_EN } from "./help-sections-en";
import { HELP_SECTIONS_FR } from "./help-sections-fr";
import { t } from "@/lib/translations";

export function resolveHelpLanguage(opts: {
  profilePreferred?: string | null;
  contextLanguage: "fr" | "en";
  navigatorLanguage: string | null;
}): "fr" | "en" {
  const p = opts.profilePreferred;
  if (p === "fr" || p === "en") return p;
  const ctx = opts.contextLanguage;
  if (ctx === "fr" || ctx === "en") return ctx;
  if (opts.navigatorLanguage?.toLowerCase().startsWith("fr")) return "fr";
  return "en";
}

/**
 * Bilingual Help & Support: prefers profile language, then app session (localStorage), then browser `navigator.language`.
 * Dispatches an event so the app shell can close the mobile sidebar for maximum reading width.
 */
export function HelpSupport() {
  const { language } = useLanguage();
  const { profile } = useProfile();
  const [navigatorLanguage, setNavigatorLanguage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined") setNavigatorLanguage(navigator.language);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("artisanflow-close-mobile-sidebar"));
    window.dispatchEvent(new CustomEvent("artisanflow-collapse-desktop-sidebar"));
  }, []);

  const lang = useMemo(
    () =>
      resolveHelpLanguage({
        profilePreferred: profile?.preferred_language,
        contextLanguage: language,
        navigatorLanguage,
      }),
    [profile?.preferred_language, language, navigatorLanguage]
  );

  const list = lang === "fr" ? HELP_SECTIONS_FR : HELP_SECTIONS_EN;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
          {t("helpPageTitle", lang)}
        </h1>
        <p className="mt-1 text-gray-500">{t("helpPageSubtitle", lang)}</p>
      </div>

      <Tabs defaultValue={list[0]?.id ?? "start"} className="w-full">
        <TabsList className="flex h-auto flex-wrap gap-1 bg-gray-100 p-1">
          {list.map((s) => (
            <TabsTrigger key={s.id} value={s.id} className="gap-1.5 text-xs sm:text-sm">
              <s.icon className="h-4 w-4 shrink-0" />
              <span className="max-w-[140px] truncate sm:max-w-none">{s.title}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        {list.map((s) => (
          <TabsContent key={s.id} value={s.id} className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <s.icon className="h-5 w-5 text-brand-blue-500" />
                  {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent>{s.body}</CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <Card className="border-brand-blue-100 bg-brand-blue-50/40">
        <CardContent className="pt-6 text-sm text-gray-700">
          <p>{t("helpContact", lang)}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
