"use client";

import { useEffect, useRef } from "react";
import { MoreVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type RowActionsMenuProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
  className?: string;
};

export function RowActionsMenu({ isOpen, onOpenChange, onEdit, onDelete, isDeleting = false, className }: RowActionsMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOpenChange(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onOpenChange]);

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button
        type="button"
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none",
          isDeleting && "opacity-60 pointer-events-none"
        )}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onOpenChange(!isOpen);
        }}
        aria-label="Actions"
        aria-expanded={isOpen}
        disabled={isDeleting}
      >
        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
      </button>
      {isOpen && !isDeleting && (
        <div
          className="absolute right-0 top-full z-[100] mt-1 min-w-[140px] rounded-md border border-gray-200 bg-white py-1 shadow-lg"
          role="menu"
        >
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            onClick={() => {
              onOpenChange(false);
              onEdit();
            }}
          >
            Modifier
          </button>
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
            onClick={() => {
              onOpenChange(false);
              onDelete();
            }}
          >
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}
