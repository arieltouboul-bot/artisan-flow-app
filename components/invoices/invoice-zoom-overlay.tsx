"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  imageUrl: string | null;
  expenseId: string | null;
  /** Shared layout id with the thumbnail for Framer Motion layout transition */
  layoutId?: string | null;
  deleting: boolean;
  language: "fr" | "en";
  onClose: () => void;
  onDownload: () => void;
  onDelete: () => void;
};

/**
 * Aperçu plein écran : 1er clic sur la vignette ouvre ; dans l’overlay, clic sur l’image alterne zoom avant / arrière ; fond ou ✕ ferme.
 */
export function InvoiceZoomOverlay({
  open,
  imageUrl,
  expenseId,
  layoutId,
  deleting,
  language,
  onClose,
  onDownload,
  onDelete,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!open) setExpanded(false);
  }, [open]);

  return (
    <AnimatePresence>
      {open && imageUrl && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={language === "en" ? "Invoice preview" : "Aperçu facture"}
          className="fixed inset-0 z-[125] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.button
            type="button"
            aria-label={language === "en" ? "Close" : "Fermer"}
            className="absolute inset-0 bg-black/80 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 flex max-h-[92vh] max-w-[96vw] flex-col items-center"
            initial={layoutId ? undefined : { scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={layoutId ? { opacity: 0 } : { scale: 0.88, opacity: 0 }}
            transition={
              layoutId
                ? { layout: { type: "spring", damping: 28, stiffness: 380 } }
                : { type: "spring", damping: 26, stiffness: 320 }
            }
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex w-full justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload();
                }}
              >
                <Download className="h-4 w-4" />
                {language === "en" ? "Download" : "Télécharger"}
              </Button>
              {expenseId && (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="gap-1"
                  disabled={deleting}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  aria-label={language === "en" ? "Delete" : "Supprimer"}
                >
                  {deleting ? (
                    <span className="h-4 w-4 animate-pulse">…</span>
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="bg-white/90"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                aria-label={language === "en" ? "Close" : "Fermer"}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img
              layoutId={layoutId || undefined}
              layout
              src={imageUrl}
              alt=""
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setExpanded((v) => !v);
                }
              }}
              className={cn(
                "w-auto rounded-lg object-contain shadow-2xl ring-1 ring-white/20 outline-none transition-[max-height,max-width,transform] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-white",
                expanded
                  ? "max-h-[96vh] max-w-[98vw] cursor-zoom-out scale-[1.02]"
                  : "max-h-[78vh] max-w-[92vw] cursor-zoom-in"
              )}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              transition={{ type: "spring", damping: 28, stiffness: 380 }}
            />
            <p className="mt-2 text-center text-xs text-white/80">
              {language === "en"
                ? expanded
                  ? "Tap the image again to shrink, or the background to close"
                  : "Tap the image to enlarge, or the background to close"
                : expanded
                  ? "Touchez à nouveau l’image pour réduire, ou le fond pour fermer"
                  : "Touchez l’image pour agrandir, ou le fond pour fermer"}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
