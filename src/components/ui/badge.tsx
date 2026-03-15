import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--r-full)] border font-medium font-[var(--font-ui)]",
  {
    variants: {
      variant: {
        default: "border-[var(--navy-900)] bg-[var(--navy-900)] text-[var(--white)]",
        navy: "border-[var(--navy-900)] bg-[var(--navy-900)] text-[var(--white)]",
        secondary: "border-[var(--navy-100)] bg-[var(--navy-50)] text-[var(--navy-700)]",
        gold: "border-[var(--gold-500)] bg-[var(--gold-500)] text-[var(--navy-900)]",
        success: "border-[var(--success)] bg-[var(--success-bg)] text-[var(--success)]",
        warning: "border-[var(--gold-300)] bg-[var(--gold-50)] text-[var(--gold-800)]",
        error: "border-[var(--error)] bg-[var(--error-bg)] text-[var(--error)]",
        outline: "border-[var(--border)] bg-[var(--white)] text-[var(--text-2)]",
      },
      size: {
        sm: "h-5 px-2 text-xs",
        md: "h-6 px-2.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  },
);

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, type BadgeProps, badgeVariants };
