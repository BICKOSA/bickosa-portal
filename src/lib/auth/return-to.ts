"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";

const STORAGE_KEY = "bickosa.returnTo";
const DEFAULT_RETURN_TO = "/dashboard";

function isSafeInternalPath(value: string | null | undefined): value is string {
  return Boolean(value && value.startsWith("/") && !value.startsWith("//"));
}

export function normalizeReturnTo(value: string | null | undefined): string {
  if (!isSafeInternalPath(value)) {
    return DEFAULT_RETURN_TO;
  }
  const stripped = value.replace(/^\/portal(?=\/|$)/, "");
  return stripped || DEFAULT_RETURN_TO;
}

function readStored(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* sessionStorage may be unavailable (e.g. Safari private mode) */
  }
}

export function clearStoredReturnTo(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* no-op */
  }
}

/**
 * Returns the resolved returnTo target (URL param first, then sessionStorage,
 * falling back to /dashboard) and keeps sessionStorage in sync so the value
 * survives navigation between /login, /register, /forgot-password, etc.
 */
export function useReturnTo(): string {
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("returnTo");

  useEffect(() => {
    if (isSafeInternalPath(fromUrl)) {
      writeStored(fromUrl);
    }
  }, [fromUrl]);

  return useMemo(() => {
    if (isSafeInternalPath(fromUrl)) {
      return normalizeReturnTo(fromUrl);
    }
    return normalizeReturnTo(readStored());
  }, [fromUrl]);
}

/**
 * Raw returnTo value (URL param or sessionStorage), suitable for forwarding
 * through internal links. Returns null when there's nothing to carry.
 */
export function useRawReturnTo(): string | null {
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("returnTo");

  useEffect(() => {
    if (isSafeInternalPath(fromUrl)) {
      writeStored(fromUrl);
    }
  }, [fromUrl]);

  const stored = typeof window !== "undefined" ? readStored() : null;
  const candidate = fromUrl ?? stored;
  return isSafeInternalPath(candidate) ? candidate : null;
}

export function withReturnTo(href: string, returnTo: string | null): string {
  if (!returnTo) return href;
  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}
