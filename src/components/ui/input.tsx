import * as React from "react";

import { cn } from "@/lib/utils";

const inputStyles =
  "w-full rounded-[var(--r-md)] border-[1.5px] border-[var(--border)] bg-[var(--white)] px-3 py-2 text-sm text-[var(--text-1)] outline-none placeholder:text-[var(--text-4)] transition-colors focus:border-[var(--navy-400)] focus:ring-2 focus:ring-[color:rgba(61,100,176,0.2)] disabled:cursor-not-allowed disabled:opacity-60";

type InputProps = React.ComponentProps<"input"> & {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      containerClassName,
      labelClassName,
      id,
      ...props
    },
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const describedById = error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined;

    return (
      <div className={cn("flex w-full flex-col gap-1.5", containerClassName)}>
        {label ? (
          <label
            htmlFor={inputId}
            className={cn("text-sm font-medium text-[var(--text-1)]", labelClassName)}
          >
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedById}
          className={cn(
            inputStyles,
            error
              ? "border-[var(--error)] focus:border-[var(--error)] focus:ring-[color:rgba(185,28,28,0.18)]"
              : undefined,
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-xs text-[var(--error)]">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${inputId}-helper`} className="text-xs text-[var(--text-3)]">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input, inputStyles, type InputProps };
