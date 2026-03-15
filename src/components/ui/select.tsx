"use client";

import * as React from "react";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { inputStyles } from "@/components/ui/input";

const Select = SelectPrimitive.Root;

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return <SelectPrimitive.Group className={cn("p-1", className)} {...props} />;
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return <SelectPrimitive.Value className={cn("line-clamp-1", className)} {...props} />;
}

type SelectTriggerProps = SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default";
};

function SelectTrigger({ className, children, size = "default", ...props }: SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        inputStyles,
        "flex items-center justify-between",
        size === "sm" ? "h-9 text-xs" : "h-10 text-sm",
        className,
      )}
      {...props}
    >
      <div className="truncate text-left text-sm">{children}</div>
      <SelectPrimitive.Icon render={<ChevronDownIcon className="size-4 text-[var(--text-3)]" />} />
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<SelectPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger">) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="z-50"
      >
        <SelectPrimitive.Popup
          className={cn(
            "max-h-[320px] w-[var(--anchor-width)] overflow-auto rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--white)] p-1 text-[var(--text-1)] shadow-[var(--shadow-md)]",
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return <SelectPrimitive.GroupLabel className={cn("px-2 py-1 text-xs text-[var(--text-3)]", className)} {...props} />;
}

function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      className={cn(
        "relative flex cursor-default items-center rounded-[var(--r-sm)] px-2 py-1.5 text-sm outline-none focus:bg-[var(--navy-50)] data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="truncate">{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={<span className="absolute right-2 inline-flex size-4 items-center justify-center" />}
      >
        <CheckIcon className="size-4 text-[var(--navy-700)]" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return <SelectPrimitive.Separator className={cn("my-1 h-px bg-[var(--border)]", className)} {...props} />;
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow className={cn("flex items-center justify-center py-1", className)} {...props}>
      <ChevronUpIcon className="size-4 text-[var(--text-3)]" />
    </SelectPrimitive.ScrollUpArrow>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow className={cn("flex items-center justify-center py-1", className)} {...props}>
      <ChevronDownIcon className="size-4 text-[var(--text-3)]" />
    </SelectPrimitive.ScrollDownArrow>
  );
}

type SelectFieldProps = {
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  error?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

function SelectField({ label, helperText, error, className, children }: SelectFieldProps) {
  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      {label ? <div className="text-sm font-medium text-[var(--text-1)]">{label}</div> : null}
      {children}
      {error ? (
        <p className="text-xs text-[var(--error)]">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[var(--text-3)]">{helperText}</p>
      ) : null}
    </div>
  );
}

export {
  Select,
  SelectContent,
  SelectField,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
