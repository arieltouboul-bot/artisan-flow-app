"use client";

import { Hammer } from "lucide-react";
import { cn } from "@/lib/utils";

type LogoProps = {
  /** Afficher le texte "ArtisanFlow" à côté de l’icône */
  showText?: boolean;
  /** Taille : compact (header mobile), normal (sidebar) */
  size?: "compact" | "normal";
  className?: string;
};

export function Logo({ showText = true, size = "compact", className }: LogoProps) {
  const iconSize = size === "compact" ? "h-8 w-8" : "h-10 w-10";
  const iconInner = size === "compact" ? "h-4 w-4" : "h-5 w-5";
  const textSize = size === "compact" ? "text-base font-bold" : "text-lg font-bold";

  return (
    <span
      className={cn("inline-flex items-center gap-2 overflow-hidden", className)}
      aria-hidden="true"
    >
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-brand-blue-500 text-white shadow-brand-glow",
          iconSize
        )}
      >
        <Hammer className={iconInner} aria-hidden="true" />
      </span>
      {showText && (
        <span className={cn("whitespace-nowrap text-brand-blue-600", textSize)}>
          ArtisanFlow
        </span>
      )}
    </span>
  );
}
