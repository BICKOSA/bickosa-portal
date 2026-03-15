"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastVariant = "navy" | "success";

type ToastItem = {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
};

type ToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastContextValue = {
  toast: (options: ToastOptions) => void;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

function toastStyles(variant: ToastVariant) {
  if (variant === "success") {
    return "border-[var(--success)] bg-[var(--success-bg)] text-[var(--success)]";
  }

  return "border-[var(--navy-900)] bg-[var(--navy-900)] text-[var(--white)]";
}

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setItems((previous) => previous.filter((item) => item.id !== id));
  }, []);

  const toast = React.useCallback(
    ({ title, description, variant = "navy", durationMs = 3500 }: ToastOptions) => {
      const id = crypto.randomUUID();
      setItems((previous) => [...previous, { id, title, description, variant }]);

      window.setTimeout(() => {
        dismiss(id);
      }, durationMs);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[70] flex w-full max-w-sm flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto rounded-[var(--r-lg)] border p-4 shadow-[var(--shadow-md)]",
              toastStyles(item.variant),
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="font-[var(--font-ui)] text-sm font-semibold">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-xs opacity-90">{item.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="inline-flex size-6 items-center justify-center rounded-[var(--r-sm)] hover:bg-[color:rgba(255,255,255,0.15)]"
                aria-label="Dismiss toast"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider.");
  }
  return context;
}

export { ToastProvider, useToast, type ToastOptions, type ToastVariant };
