import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Check, Save } from "lucide-react";
import { cn } from "@/lib/utils";

function validationMobileLayout(label: string): "none" | "check" | "save" {
  const t = label.trim();
  if (!t) return "none";
  const lower = t.toLowerCase();
  if (lower === "ok" || lower === "✓") return "check";
  if (lower === "save" || lower === "enregistrer") return "save";
  if (/\b(save|enregistrer|sauvegarder)\b/i.test(t)) return "save";
  if (t.length >= 12 && /save|enregistrer|sauvegard/i.test(t)) return "save";
  return "none";
}

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[44px] min-w-[44px] px-6",
  {
    variants: {
      variant: {
        default:
          "bg-brand-blue-500 text-white hover:bg-brand-blue-600 shadow-brand-glow hover:shadow-brand-glow-lg",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        outline:
          "border border-brand-blue-500/30 bg-transparent hover:bg-brand-blue-500/10 text-brand-blue-600",
        secondary: "bg-brand-blue-50 text-brand-blue-700 hover:bg-brand-blue-100",
        ghost: "hover:bg-brand-blue-500/10 text-brand-blue-600",
        link: "text-brand-blue-500 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 min-h-[44px]",
        lg: "h-12 px-8 min-h-[48px] text-base",
        icon: "h-11 w-11 min-h-[44px] min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children: rawChildren, ...props }, ref) => {
    const layout =
      typeof rawChildren === "string" ? validationMobileLayout(rawChildren) : "none";
    const children =
      layout === "check" ? (
        <span className="inline-flex items-center justify-center gap-1.5">
          <Check className="h-[18px] w-[18px] shrink-0 opacity-95" strokeWidth={2.25} aria-hidden="true" />
          <span>{rawChildren}</span>
        </span>
      ) : layout === "save" ? (
        <span className="inline-flex items-center justify-center gap-1.5">
          <Save className="h-[18px] w-[18px] shrink-0 opacity-95" strokeWidth={2.25} aria-hidden="true" />
          <span className="max-w-[11rem] truncate sm:max-w-none">{rawChildren}</span>
        </span>
      ) : (
        rawChildren
      );
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
