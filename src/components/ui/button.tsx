"use client";

import * as React from "react";
import { LoaderCircle } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--r-md)] border text-sm font-semibold font-[var(--font-ui)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--navy-400)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "border-[var(--navy-900)] bg-[var(--navy-900)] text-[var(--white)] hover:bg-[var(--navy-700)]",
        navy:
          "border-[var(--navy-900)] bg-[var(--navy-900)] text-[var(--white)] hover:bg-[var(--navy-700)]",
        gold: "border-[var(--gold-500)] bg-[var(--gold-500)] text-[var(--navy-900)] hover:bg-[var(--gold-400)]",
        secondary:
          "border-[var(--navy-100)] bg-[var(--navy-50)] text-[var(--navy-700)] hover:bg-[var(--navy-100)]",
        outline:
          "border-[var(--border)] bg-[var(--white)] text-[var(--text-1)] hover:bg-[var(--navy-50)]",
        "outline-light":
          "border-[color:rgba(255,255,255,0.35)] bg-transparent text-[var(--white)] hover:bg-[color:rgba(255,255,255,0.12)]",
        ghost: "border-transparent bg-transparent text-[var(--text-1)] hover:bg-[var(--navy-50)]",
        link: "border-transparent bg-transparent p-0 text-[var(--navy-700)] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-5 text-base",
        icon: "size-10 p-0",
        "icon-sm": "size-8 p-0",
        "icon-xs": "size-7 p-0",
        "icon-lg": "size-12 p-0",
        default: "h-10 px-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "navy",
      size: "md",
    },
  },
);

type ButtonProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size"> &
  VariantProps<typeof buttonVariants> & {
    isLoading?: boolean;
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  isLoading = false,
  asChild = false,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const buttonClassName = cn(buttonVariants({ variant, size, className }));
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{
      className?: string;
      children?: React.ReactNode;
      "aria-busy"?: boolean;
    }>;

    return React.cloneElement(child, {
      className: cn(buttonClassName, child.props.className),
      "aria-busy": isLoading || undefined,
      children: (
        <>
          {isLoading ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : null}
          {child.props.children}
        </>
      ),
    });
  }

  return (
    <button
      className={buttonClassName}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}

export { Button, type ButtonProps, buttonVariants };
