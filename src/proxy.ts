import { NextResponse, type NextRequest } from "next/server";

// Auth.js uses the __Secure- prefix when served over HTTPS.
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

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
    "/applications/:path*",
    "/companies/:path*",
    "/contacts/:path*",
    "/documents/:path*",
    "/settings/:path*",
  ],
};
