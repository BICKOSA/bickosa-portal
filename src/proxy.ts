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
  "/donate",
  "/settings",
  "/governance",
];

const PROTECTED_DIRECT_PREFIXES = ["/events"];

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
    "/donate/:path*",
    "/settings/:path*",
    "/governance/:path*",
  ],
};
