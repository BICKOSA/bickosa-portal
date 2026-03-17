import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";
import { isAdminUserRole } from "@/lib/auth/roles";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
]);

const PROTECTED_REWRITE_PREFIXES = [
  "/dashboard",
  "/directory",
  "/profile",
  "/admin",
  "/mentorship",
  "/sports",
  "/careers",
  "/donate",
  "/settings",
  "/governance",
];

const PROTECTED_DIRECT_PREFIXES = ["/events"];

type RateLimitRule = {
  prefix: string;
  limit: number;
  windowMs: number;
  keyType: "ip" | "user";
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_RULES: RateLimitRule[] = [
  {
    prefix: "/api/donations",
    limit: 10,
    windowMs: 60_000,
    keyType: "ip",
  },
  {
    prefix: "/api/directory",
    limit: 30,
    windowMs: 60_000,
    keyType: "user",
  },
  {
    prefix: "/api/upload",
    limit: 5,
    windowMs: 60_000,
    keyType: "user",
  },
];

const globalRateLimitStore = globalThis as typeof globalThis & {
  __bickosaRateLimitStore?: Map<string, RateLimitEntry>;
};

function getRateLimitStore(): Map<string, RateLimitEntry> {
  if (!globalRateLimitStore.__bickosaRateLimitStore) {
    globalRateLimitStore.__bickosaRateLimitStore = new Map<string, RateLimitEntry>();
  }

  return globalRateLimitStore.__bickosaRateLimitStore;
}

function getRequestIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const [first] = forwardedFor.split(",");
    if (first) {
      return first.trim();
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

async function getUserRateLimitKey(request: NextRequest): Promise<string> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (session?.user?.id) {
    return `user:${session.user.id}`;
  }

  return `anon-ip:${getRequestIp(request)}`;
}

async function applyRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const rule = RATE_LIMIT_RULES.find((item) => matchesPrefix(request.nextUrl.pathname, item.prefix));
  if (!rule) {
    return null;
  }

  const keyBase =
    rule.keyType === "ip" ? `ip:${getRequestIp(request)}` : await getUserRateLimitKey(request);
  const now = Date.now();
  const store = getRateLimitStore();
  const scopedKey = `${rule.prefix}:${keyBase}`;
  const current = store.get(scopedKey);

  if (!current || current.resetAt <= now) {
    store.set(scopedKey, {
      count: 1,
      resetAt: now + rule.windowMs,
    });
    return null;
  }

  if (current.count >= rule.limit) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      {
        message: "Too many requests. Please try again shortly.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
        },
      },
    );
  }

  current.count += 1;
  store.set(scopedKey, current);
  return null;
}

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }

  return pathname.startsWith("/events/");
}

function isProtectedPath(pathname: string): boolean {
  return (
    PROTECTED_REWRITE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix)) ||
    PROTECTED_DIRECT_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix))
  );
}

function shouldRewriteToPortal(pathname: string): boolean {
  return PROTECTED_REWRITE_PREFIXES.some((prefix) => matchesPrefix(pathname, prefix));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const rateLimitedResponse = await applyRateLimit(request);
  if (rateLimitedResponse) {
    return rateLimitedResponse;
  }

  if (matchesPrefix(pathname, "/portal")) {
    const redirectUrl = request.nextUrl.clone();
    const strippedPath = pathname.slice("/portal".length) || "/dashboard";
    redirectUrl.pathname = strippedPath;
    return NextResponse.redirect(redirectUrl);
  }

  if (isPublicPath(pathname) || !isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (matchesPrefix(pathname, "/admin")) {
    const role = (session.user as { role?: string }).role;
    if (!isAdminUserRole(role)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  if (shouldRewriteToPortal(pathname)) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/portal${pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/portal/:path*",
    "/dashboard/:path*",
    "/directory/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/mentorship/:path*",
    "/events/:path*",
    "/sports/:path*",
    "/careers/:path*",
    "/donate/:path*",
    "/settings/:path*",
    "/governance/:path*",
    "/api/donations/:path*",
    "/api/directory/:path*",
    "/api/upload/:path*",
  ],
};
