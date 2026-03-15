/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "inline-flex items-center justify-center overflow-hidden border border-[var(--border)] bg-[var(--navy-50)] text-[var(--navy-700)]",
  {
    variants: {
      size: {
        sm: "size-7 text-xs",
        md: "size-10 text-sm",
        lg: "size-14 text-lg",
        xl: "size-20 text-2xl",
      },
      shape: {
        circle: "rounded-full",
        rounded: "rounded-[var(--r-xl)]",
      },
    },
    defaultVariants: {
      size: "md",
      shape: "circle",
    },
  },
);

type AvatarProps = React.ComponentProps<"div"> &
  VariantProps<typeof avatarVariants> & {
    src?: string | null;
    alt?: string;
    name?: string;
  };

function getInitials(name?: string) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
}

function Avatar({ className, size, shape, src, alt, name, children, ...props }: AvatarProps) {
  const initials = getInitials(name);

  return (
    <div className={cn(avatarVariants({ size, shape }), className)} {...props}>
      {children ? (
        children
      ) : src ? (
        <AvatarImage src={src} alt={alt ?? name ?? "Avatar"} />
      ) : (
        <AvatarFallback>{initials}</AvatarFallback>
      )}
    </div>
  );
}

function AvatarImage({ className, ...props }: React.ComponentProps<"img">) {
  return <img className={cn("size-full object-cover", className)} alt={props.alt ?? ""} {...props} />;
}

function AvatarFallback({ className, children, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex size-full items-center justify-center bg-[var(--navy-50)] font-[var(--font-ui)] font-semibold text-[var(--navy-700)]",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export { Avatar, AvatarFallback, AvatarImage, avatarVariants, type AvatarProps };
