"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

type ToggleProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: React.ReactNode;
  description?: React.ReactNode;
};

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-[var(--r-md)] border text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-transparent text-[var(--text-2)] hover:bg-[var(--navy-50)]",
        outline: "border-[var(--border)] bg-[var(--white)] text-[var(--text-1)] hover:bg-[var(--navy-50)]",
      },
      size: {
        default: "h-10 px-3",
        sm: "h-9 px-2.5 text-xs",
        lg: "h-11 px-4",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ToggleVariantProps = VariantProps<typeof toggleVariants>;

const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, description, id, checked, defaultChecked, onChange, disabled, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const [internalChecked, setInternalChecked] = React.useState(Boolean(defaultChecked));
    const isControlled = checked !== undefined;
    const isChecked = isControlled ? Boolean(checked) : internalChecked;

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "inline-flex cursor-pointer items-center gap-3",
          disabled ? "cursor-not-allowed opacity-60" : undefined,
          className,
        )}
      >
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className="peer sr-only"
          checked={isControlled ? isChecked : undefined}
          defaultChecked={!isControlled ? internalChecked : undefined}
          onChange={(event) => {
            if (!isControlled) {
              setInternalChecked(event.target.checked);
            }
            onChange?.(event);
          }}
          disabled={disabled}
          {...props}
        />
        <span className="relative inline-flex h-6 w-11 items-center rounded-[var(--r-full)] bg-[var(--border-2)] transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--navy-400)] peer-checked:bg-[var(--navy-600)]">
          <span className="absolute left-[3px] size-4 rounded-full bg-[var(--white)] shadow-[var(--shadow-sm)] transition-transform peer-checked:translate-x-[20px]" />
        </span>
        {(label || description) && (
          <span className="flex flex-col">
            {label ? <span className="text-sm font-medium text-[var(--text-1)]">{label}</span> : null}
            {description ? <span className="text-xs text-[var(--text-3)]">{description}</span> : null}
          </span>
        )}
      </label>
    );
  },
);

Toggle.displayName = "Toggle";

export { Toggle, type ToggleProps };
export { toggleVariants, type ToggleVariantProps };
