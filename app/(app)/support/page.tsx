"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/context/language-context";
import { t } from "@/lib/translations";
import { ChevronDown, CircleDollarSign, Smartphone, UsersRound, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function SupportPage() {
  const { language } = useLanguage();
  const [openId, setOpenId] = useState<string>("install");

  const sections = [
    {
      id: "install",
      icon: Smartphone,
      iconClass: "text-blue-600",
      borderClass: "border-blue-100",
      title: t("supportInstallTitle", language),
      body: t("supportInstallBody", language),
    },
    {
      id: "margins",
      icon: CircleDollarSign,
      iconClass: "text-emerald-600",
      borderClass: "border-emerald-100",
      title: t("supportMarginsTitle", language),
      body: t("supportMarginsBody", language),
    },
    {
      id: "team",
      icon: UsersRound,
      iconClass: "text-slate-600",
      borderClass: "border-slate-200",
      title: t("supportTeamTitle", language),
      body: t("supportTeamBody", language),
    },
    {
      id: "settings",
      icon: Settings,
      iconClass: "text-violet-600",
      borderClass: "border-violet-100",
      title: t("supportSettingsTitle", language),
      body: t("supportSettingsBody", language),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">
        {t("supportPageTitle", language)}
      </h1>
      <p className="text-sm text-gray-500">{t("supportPageSubtitle", language)}</p>

      <Card className="border-gray-200">
        <CardContent className="space-y-3 pt-6">
          {sections.map((section) => {
            const Icon = section.icon;
            const isOpen = openId === section.id;
            return (
              <div key={section.id} className={cn("rounded-lg border bg-white", section.borderClass)}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? "" : section.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon className={cn("h-5 w-5 shrink-0", section.iconClass)} />
                    <span className="font-medium text-gray-900">{section.title}</span>
                  </div>
                  <ChevronDown
                    className={cn("h-4 w-4 shrink-0 text-gray-500 transition-transform", isOpen && "rotate-180")}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100 px-4 py-3 text-sm leading-relaxed text-gray-700">
                    {section.body}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
