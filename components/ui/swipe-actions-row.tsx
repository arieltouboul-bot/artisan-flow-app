"use client";

import { useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { motion, useMotionValue, useTransform, animate, useMotionValueEvent } from "framer-motion";
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
 * Swipe left reveals edit/delete; actions stay fully hidden until the row moves enough.
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
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const offset = useMotionValue(0);
  const actionsOpacity = useTransform(offset, [0, -24, -REVEAL], [0, 0, 1]);
  const [actionsInteractive, setActionsInteractive] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  useMotionValueEvent(offset, "change", (v) => {
    setActionsInteractive(v < -22);
    setShowSwipeHint(v > -12);
  });

  const hapticDone = useRef(false);

  const onPointerDown = (e: ReactPointerEvent) => {
    if (disabled) return;
    hapticDone.current = false;
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
    offset.set(next);
    if (!hapticDone.current && next < -36) {
      hapticDone.current = true;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(12);
        } catch {
          /* ignore */
        }
      }
    }
  };

  const endDrag = () => {
    setDragging(false);
    hapticDone.current = false;
    const cur = offset.get();
    const target = cur < -REVEAL / 2 ? -REVEAL : 0;
    animate(offset, target, { type: "spring", stiffness: 420, damping: 32 });
  };

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-gray-100 bg-white", className)}>
      <motion.div
        className={cn(
          "absolute right-0 top-0 z-0 flex h-full min-h-[72px] items-stretch",
          !actionsInteractive && "pointer-events-none"
        )}
        style={{ opacity: actionsOpacity }}
        aria-hidden={true}
      >
        <button
          type="button"
          tabIndex={actionsInteractive ? 0 : -1}
          className="flex w-[60px] shrink-0 items-center justify-center bg-brand-blue-500 text-white active:bg-brand-blue-600"
          onClick={(e) => {
            e.stopPropagation();
            animate(offset, 0, { type: "spring", stiffness: 420, damping: 32 });
            onEdit();
          }}
          disabled={disabled}
          aria-label={editLabel}
        >
          <Pencil className="h-5 w-5" />
        </button>
        <button
          type="button"
          tabIndex={actionsInteractive ? 0 : -1}
          className="flex w-[60px] shrink-0 items-center justify-center bg-red-500 text-white active:bg-red-600"
          onClick={(e) => {
            e.stopPropagation();
            animate(offset, 0, { type: "spring", stiffness: 420, damping: 32 });
            onDelete();
          }}
          disabled={disabled}
          aria-label={deleteLabel}
        >
          <Trash2 className="h-5 w-5" />
        </button>
      </motion.div>

      <motion.div
        className="relative z-20 isolate touch-pan-y border-r border-transparent bg-white shadow-[2px_0_12px_rgba(0,0,0,0.06)] [touch-action:pan-y]"
        style={{ x: offset }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        <div className="relative pr-7">
          {children}
          <span
            className={cn(
              "pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 select-none text-[15px] font-light leading-none text-gray-400 transition-opacity duration-150",
              showSwipeHint ? "opacity-90" : "opacity-0"
            )}
            aria-hidden
          >
            ‹
          </span>
        </div>
      </motion.div>
    </div>
  );
}
