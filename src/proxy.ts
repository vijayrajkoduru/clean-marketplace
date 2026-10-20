import { NextResponse, type NextRequest } from "next/server";

/**
 * Sends signed-out visitors on private pages straight to the login page, before
 * anything renders. It only checks that a session cookie exists; the pages
 * themselves still check the session and the role.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("clean_session")) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/partner", "/account/:path*", "/bookings/:path*", "/checkout"],
};
