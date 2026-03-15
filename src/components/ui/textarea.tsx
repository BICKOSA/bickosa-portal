"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { inputStyles } from "@/components/ui/input";

type TextareaProps = React.ComponentProps<"textarea"> & {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  containerClassName?: string;
  labelClassName?: string;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
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
    const textareaId = id ?? generatedId;
    const describedById = error
      ? `${textareaId}-error`
      : helperText
        ? `${textareaId}-helper`
        : undefined;

    return (
      <div className={cn("flex w-full flex-col gap-1.5", containerClassName)}>
        {label ? (
          <label
            htmlFor={textareaId}
            className={cn("text-sm font-medium text-[var(--text-1)]", labelClassName)}
          >
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={Boolean(error)}
          aria-describedby={describedById}
          className={cn(
            inputStyles,
            "min-h-[96px] resize-y",
            error
              ? "border-[var(--error)] focus:border-[var(--error)] focus:ring-[color:rgba(185,28,28,0.18)]"
              : undefined,
            className,
          )}
          {...props}
        />
        {error ? (
          <p id={`${textareaId}-error`} className="text-xs text-[var(--error)]">
            {error}
          </p>
        ) : helperText ? (
          <p id={`${textareaId}-helper`} className="text-xs text-[var(--text-3)]">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea, type TextareaProps };
