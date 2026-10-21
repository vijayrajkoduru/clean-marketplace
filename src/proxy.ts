import { NextResponse, type NextRequest } from "next/server";

/**
 * Sends signed-out visitors on private pages straight to the login page, before
 * anything renders. It only checks that a session cookie exists; the pages
 * themselves still check the session and the role.
 *
 * The admin panel has its own login and cookie (see ADMIN_COOKIE in lib/auth.ts).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const adminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  if (pathname === "/admin/login") return NextResponse.next();
  if (request.cookies.has(adminArea ? "clean_admin_session" : "clean_session")) return NextResponse.next();
  // Admins open invoices from the admin panel.
  if (/^\/bookings\/[^/]+\/invoice$/.test(pathname) && request.cookies.has("clean_admin_session")) return NextResponse.next();
  const login = new URL(adminArea ? "/admin/login" : "/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/partner", "/account/:path*", "/bookings/:path*", "/checkout", "/notifications"],
};
