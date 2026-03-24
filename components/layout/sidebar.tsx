"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAppointmentSoon } from "@/hooks/use-sidebar-badges";
import { useStaleProjectsCount } from "@/hooks/use-sidebar-badges";
import {
  LayoutDashboard,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  Hammer,
  LogOut,
  Calendar,
  HelpCircle,
  X,
  Package,
  Receipt,
  Banknote,
  Settings,
  Users,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/language-context";

/**
 * Navigation principale (ordre fixe) :
 * Dashboard → Projects → Clients → Team → Revenues → Invoices → Inventory → Appointments → Settings,
 * puis Help & Support en bas du panneau.
 */
const mainNavItems = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/projets", key: "projects", icon: FolderKanban },
  /** Table Supabase `clients` — page `app/(app)/clients/page.tsx` */
  { href: "/clients", key: "clients", icon: Users },
  { href: "/team", key: "team", icon: UsersRound },
  { href: "/revenus", key: "revenues", icon: Banknote },
  { href: "/factures", key: "invoices", icon: Receipt },
  { href: "/materiel", key: "material", icon: Package },
  { href: "/calendar", key: "calendar", icon: Calendar },
  { href: "/settings", key: "settings", icon: Settings },
];

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  onCloseMobile?: () => void;
  mobileMode?: boolean;
};

export function Sidebar({ collapsed, onToggle, onCloseMobile, mobileMode }: SidebarProps) {
  const expanded = mobileMode ? true : !collapsed;
  const width = mobileMode ? 260 : collapsed ? 72 : 260;
  const pathname = usePathname();
  const router = useRouter();
  const { language } = useLanguage();
  const appointmentSoon = useAppointmentSoon();
  const staleProjectsCount = useStaleProjectsCount();
  const [online, setOnline] = useState(
    typeof window !== "undefined" ? window.navigator.onLine : true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "flex h-screen flex-col border-r border-gray-200 bg-white shadow-sm",
        mobileMode ? "relative" : "fixed left-0 top-0 z-[100]"
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue-500 text-white shadow-brand-glow"
          >
            <Hammer className="h-5 w-5" />
          </motion.div>
          <AnimatePresence mode="wait">
            {expanded && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="whitespace-nowrap text-lg font-bold text-brand-blue-600"
              >
                ArtisanFlow
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        {mobileMode && onCloseMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 min-h-[44px] min-w-[44px] shrink-0"
            onClick={onCloseMobile}
            aria-label={t("closeMenu", language)}
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3">
          {mainNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" &&
                (item.key === "team"
                  ? pathname.startsWith("/team") || pathname.startsWith("/employees")
                  : item.key === "settings"
                    ? pathname.startsWith("/settings") || pathname.startsWith("/parametres")
                    : item.key === "clients"
                      ? pathname === "/clients" || pathname.startsWith("/clients/")
                    : pathname.startsWith(item.href)));
            const Icon = item.icon;
            const label = t(item.key, language);
            const showCalendarBadge = item.key === "calendar" && appointmentSoon;
            const showProjectsBadge = item.key === "projects" && staleProjectsCount > 0;
            return (
              <Link key={item.href} href={item.href} onClick={() => onCloseMobile?.()}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex min-h-[48px] items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-blue-50 text-brand-blue-600 shadow-sm"
                      : "text-gray-600 hover:bg-brand-blue-50/50 hover:text-brand-blue-600"
                  )}
                >
                  <span className="relative shrink-0">
                    <Icon className="h-5 w-5" />
                    {showCalendarBadge && (
                      <span
                        className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"
                        aria-label={language === "fr" ? "Rendez-vous bientôt" : "Appointment soon"}
                      />
                    )}
                    {showProjectsBadge && (
                      <span
                        className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white ring-2 ring-white"
                        aria-label={`${staleProjectsCount} projet(s) à relancer`}
                      >
                        {staleProjectsCount > 9 ? "9+" : staleProjectsCount}
                      </span>
                    )}
                  </span>
                  <AnimatePresence mode="wait">
                    {expanded && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="truncate"
                      >
                        {label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto shrink-0 border-t border-gray-200 bg-white px-2 pb-2 pt-1">
          <Link
            href="/support"
            onClick={() => onCloseMobile?.()}
            className={cn(
              "flex min-h-[48px] w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
              pathname === "/support" || pathname.startsWith("/support/") || pathname === "/help" || pathname.startsWith("/help/")
                ? "bg-brand-blue-50 text-brand-blue-600 shadow-sm"
                : "text-gray-600 hover:bg-brand-blue-50/50 hover:text-brand-blue-600"
            )}
          >
            <HelpCircle className="h-5 w-5 shrink-0" />
            <AnimatePresence mode="wait">
              {expanded && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="truncate"
                >
                  {t("helpSupport", language)}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-200 p-3 space-y-1">
        <div className="mb-2 flex items-center justify-between rounded-lg bg-gray-50 px-2 py-1.5 text-xs">
          <span className="text-gray-500">
            {online ? t("synchronized", language) : t("offlineMode", language)}
          </span>
          <span
            className={
              online
                ? "inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"
                : "inline-flex h-2.5 w-2.5 rounded-full bg-orange-400"
            }
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full min-h-[48px] text-red-600 hover:bg-red-50 hover:text-red-700 justify-start gap-3"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <AnimatePresence mode="wait">
            {expanded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="truncate"
              >
                {t("logout", language)}
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
        {!mobileMode && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="w-full min-h-[48px]"
            aria-label={collapsed ? t("expandSidebar", language) : t("collapseSidebar", language)}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>
    </motion.aside>
  );
}
