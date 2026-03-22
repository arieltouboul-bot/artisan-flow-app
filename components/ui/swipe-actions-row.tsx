"use client";

import { useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const REVEAL = 120;

type SwipeActionsRowProps = {
  children: ReactNode;
  onEdit: () => void;
  onDelete: () => void;
  disabled?: boolean;
  className?: string;
  editLabel?: string;
  deleteLabel?: string;
};

/**
 * Short swipe left reveals edit (blue) and delete (red). Tap icon to run action immediately.
 */
export function SwipeActionsRow({
  children,
  onEdit,
  onDelete,
  disabled,
  className,
  editLabel = "Edit",
  deleteLabel = "Delete",
}: SwipeActionsRowProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (disabled) return;
    setDragging(true);
    startX.current = e.clientX;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!dragging || disabled) return;
    const dx = e.clientX - startX.current;
    const next = Math.min(0, Math.max(-REVEAL, dx));
    setOffset(next);
  };

  const endDrag = () => {
    setDragging(false);
    setOffset((o) => (o < -REVEAL / 2 ? -REVEAL : 0));
  };

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-gray-100 bg-white", className)}>
      <div className="absolute right-0 top-0 z-0 flex h-full min-h-[72px] items-stretch" aria-hidden="true">
        <button
          type="button"
          className="flex w-[60px] shrink-0 items-center justify-center bg-brand-blue-500 text-white active:bg-brand-blue-600"
          onClick={(e) => {
            e.stopPropagation();
            setOffset(0);
            onEdit();
          }}
          disabled={disabled}
          aria-label={editLabel}
        >
          <Pencil className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="flex w-[60px] shrink-0 items-center justify-center bg-red-500 text-white active:bg-red-600"
          onClick={(e) => {
            e.stopPropagation();
            setOffset(0);
            onDelete();
          }}
          disabled={disabled}
          aria-label={deleteLabel}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </div>
      <div
        className="relative z-10 touch-pan-y bg-white [touch-action:pan-y]"
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? "none" : "transform 0.2s ease-out",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        {children}
      </div>
    </div>
  );
}
