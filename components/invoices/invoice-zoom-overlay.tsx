"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
 * Full-screen toggle zoom: tap thumbnail opens; tap image, backdrop, or ✕ closes.
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
                >
                  {deleting ? (
                    <span className="h-4 w-4 animate-pulse">…</span>
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  {language === "en" ? "Delete" : "Supprimer"}
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
              src={imageUrl}
              alt=""
              className="max-h-[78vh] w-auto max-w-[92vw] cursor-zoom-out rounded-lg object-contain shadow-2xl ring-1 ring-white/20"
              onClick={onClose}
              transition={{ type: "spring", damping: 28, stiffness: 380 }}
            />
            <p className="mt-2 text-center text-xs text-white/80">
              {language === "en" ? "Tap the image or background to close" : "Touchez l’image ou le fond pour fermer"}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
