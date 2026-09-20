import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
        outline: "border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300",
        success: "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
        warning: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
        danger: "border-transparent bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
        info: "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
