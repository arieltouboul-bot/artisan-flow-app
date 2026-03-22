"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type OmniTabSearchProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
  "aria-label"?: string;
};

/**
 * Top-of-tab search field (pairs with debounced filtering in the parent).
 */
export function OmniTabSearch({
  value,
  onChange,
  placeholder,
  className,
  "aria-label": ariaLabel,
}: OmniTabSearchProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className="h-11 w-full rounded-lg border-gray-200 bg-white pl-10 pr-3 shadow-sm"
      />
    </div>
  );
}
