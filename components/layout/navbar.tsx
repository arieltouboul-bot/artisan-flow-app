"use client";

import { Logo } from "./logo";
import { cn } from "@/lib/utils";

type NavbarProps = {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
};

export function Navbar({ isSidebarOpen, setIsSidebarOpen }: NavbarProps) {
  return (
    <header
      className={cn(
        "fixed left-0 right-0 top-0 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 md:hidden",
        isSidebarOpen ? "z-[95]" : "z-[90]"
      )}
    >
      <button
        type="button"
        onClick={() => setIsSidebarOpen((prev) => !prev)}
        className="flex min-h-[44px] min-w-[44px] -ml-1 items-center justify-start rounded-lg transition-colors hover:bg-gray-100 active:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500 focus-visible:ring-offset-2"
        aria-label={isSidebarOpen ? "Fermer le menu" : "Ouvrir le menu"}
        aria-expanded={isSidebarOpen}
      >
        <Logo showText size="compact" />
      </button>
      <div className="flex-1 min-w-2" aria-hidden="true" />
    </header>
  );
}
