"use client";

import * as React from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogPortal = DialogPrimitive.Portal;

type DialogTriggerProps = Omit<React.ComponentProps<typeof DialogPrimitive.Trigger>, "render"> & {
  render?: React.ReactElement;
};

function DialogTrigger({ render, ...props }: DialogTriggerProps) {
  if (render) {
    const TriggerWithRender = DialogPrimitive.Trigger as unknown as React.ComponentType<
      React.ComponentProps<typeof DialogPrimitive.Trigger> & { render: React.ReactElement }
    >;

    return <TriggerWithRender render={render} {...props} />;
  }

  return <DialogPrimitive.Trigger {...props} />;
}

type DialogCloseProps = Omit<React.ComponentProps<typeof DialogPrimitive.Close>, "render"> & {
  render?: React.ReactElement;
};

function DialogClose({ render, ...props }: DialogCloseProps) {
  if (render) {
    const CloseWithRender = DialogPrimitive.Close as unknown as React.ComponentType<
      React.ComponentProps<typeof DialogPrimitive.Close> & { render: React.ReactElement }
    >;

    return <CloseWithRender render={render} {...props} />;
  }

  return <DialogPrimitive.Close {...props} />;
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      className={cn("fixed inset-0 z-50 bg-[rgba(6,13,31,0.55)] backdrop-blur-[3px]", className)}
      {...props}
    />
  );
}

function DialogContent({ className, children, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-[var(--r-xl)] border border-[var(--border)] bg-[var(--white)] p-6 text-[var(--text-1)] shadow-[var(--shadow-lg)]",
          className,
        )}
        {...props}
      >
        {children}
        <DialogClose className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-[var(--r-sm)] text-[var(--text-3)] hover:bg-[var(--surface-2)]">
          <X className="size-4" />
          <span className="sr-only">Close dialog</span>
        </DialogClose>
      </DialogPrimitive.Popup>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mb-3 space-y-1", className)} {...props} />;
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mt-4 flex justify-end gap-2", className)} {...props} />;
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      className={cn("font-[var(--font-ui)] text-lg font-semibold text-[var(--text-1)]", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return <DialogPrimitive.Description className={cn("text-sm text-[var(--text-2)]", className)} {...props} />;
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
