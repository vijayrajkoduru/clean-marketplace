import { NextResponse } from "next/server";
import { REFERRAL_COOKIE } from "@/lib/wallet";

/** Referral link: remembers the code for 30 days and sends the visitor to the home page. */
export async function GET(req: Request, ctx: RouteContext<"/r/[code]">) {
  const { code } = await ctx.params;
  const res = NextResponse.redirect(new URL("/login?ref=1", req.url));
  if (/^[A-Z0-9]{6}$/i.test(code)) {
    res.cookies.set(REFERRAL_COOKIE, code.toUpperCase(), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  return res;
}
