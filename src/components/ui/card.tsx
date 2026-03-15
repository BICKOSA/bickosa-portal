import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-[var(--r-xl)] border border-[var(--border)] text-[var(--text-1)] shadow-[var(--shadow-sm)]",
  {
    variants: {
      variant: {
        default: "bg-[var(--white)]",
        surface: "bg-[var(--surface-2)]",
        "navy-tint": "bg-[var(--navy-50)]",
        navy: "border-[var(--navy-700)] bg-[var(--navy-900)] text-[var(--white)]",
        "gold-tint": "bg-[var(--gold-50)]",
      },
      accentBar: {
        true: "border-t-[3px] border-t-[var(--gold-500)]",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      accentBar: false,
    },
  },
);

type CardProps = React.ComponentProps<"div"> &
  VariantProps<typeof cardVariants> & {
    accentBar?: boolean;
  };

function Card({ className, variant, accentBar = false, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(cardVariants({ variant, accentBar }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid gap-1 border-b border-[var(--border)] px-5 py-4 [&:has([data-slot=card-action])]:grid-cols-[1fr_auto]",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("font-[var(--font-ui)] text-lg font-semibold", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-[var(--text-2)]", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-action" className={cn("self-start", className)} {...props} />
  );
}

function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-body" className={cn("px-5 py-4", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("border-t border-[var(--border)] px-5 py-4", className)}
      {...props}
    />
  );
}

const CardContent = CardBody;

export {
  Card,
  CardAction,
  CardBody,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
