import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-blue-500 focus:ring-offset-2 min-h-[28px]",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-brand-blue-500 text-white",
        secondary:
          "border-transparent bg-brand-blue-100 text-brand-blue-700",
        destructive:
          "border-transparent bg-red-100 text-red-700",
        outline: "text-gray-950 border-gray-200",
        success:
          "border-transparent bg-emerald-100 text-emerald-800",
        warning:
          "border-transparent bg-amber-100 text-amber-800",
        gray:
          "border-transparent bg-gray-200 text-gray-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
