"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const progressBarVariants = cva("w-full overflow-hidden rounded-[var(--r-full)] bg-[var(--navy-100)]", {
  variants: {
    height: {
      thin: "h-1",
      default: "h-2",
    },
  },
  defaultVariants: {
    height: "default",
  },
});

type ProgressBarProps = React.ComponentProps<"div"> &
  VariantProps<typeof progressBarVariants> & {
    value: number;
  };

function ProgressBar({ className, height, value, ...props }: ProgressBarProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clampedValue}
      className={cn(progressBarVariants({ height }), className)}
      {...props}
    >
      <div
        className="h-full rounded-[var(--r-full)] bg-[linear-gradient(90deg,var(--gold-400),var(--gold-500))] transition-[width] duration-700 ease-out"
        style={{ width: mounted ? `${clampedValue}%` : 0 }}
      />
    </div>
  );
}

export { ProgressBar, progressBarVariants, type ProgressBarProps };
