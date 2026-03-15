import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/auth";

const PUBLIC_PATHS = new Set([
  "/",
  "/about",
  "/events",
  "/donate",
  "/login",
  "/register",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }

  return pathname.startsWith("/events/");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname) || !pathname.startsWith("/portal")) {
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

  if (pathname.startsWith("/portal/admin")) {
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/portal/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/portal/:path*"],
};
