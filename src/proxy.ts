import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIES } from "@/lib/session-cookie";

// Optimistic check only: a cookie being present does not prove the session is
// valid. Real authorization happens in requireUser().
export function proxy(request: NextRequest) {
  const hasSessionCookie = SESSION_COOKIES.some((name) =>
    request.cookies.has(name),
  );

  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/board/:path*",
    "/applications/:path*",
    "/companies/:path*",
    "/contacts/:path*",
    "/documents/:path*",
    "/questions/:path*",
    "/settings/:path*",
  ],
};
