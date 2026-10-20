"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { site } from "@/config/site";
import { db } from "@/lib/db";
import { CART_COOKIE, COUPON_COOKIE, decodeCart, encodeCart, getCartLines } from "@/lib/cart";
import { computeTotals } from "@/lib/pricing";

const cookieOpts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 14 };

async function writeCart(entries: { v: string; q: number }[]) {
  const store = await cookies();
  if (entries.length) store.set(CART_COOKIE, encodeCart(entries), cookieOpts);
  else store.delete(CART_COOKIE);
}

export async function setCartQuantity(variantId: string, quantity: number): Promise<{ ok: boolean; error?: string }> {
  const q = Math.max(0, Math.min(10, Math.floor(quantity)));
  const store = await cookies();
  const entries = decodeCart(store.get(CART_COOKIE)?.value);
  const existing = entries.find((e) => e.v === variantId);
  if (q > 0 && !existing) {
    const variant = await db.serviceVariant.findFirst({ where: { id: variantId, active: true, service: { active: true } } });
    if (!variant) return { ok: false, error: "This option is no longer available." };
    if (entries.length >= site.maxCartItems) return { ok: false, error: "Your cart is full." };
    entries.push({ v: variantId, q });
  } else if (existing) {
    existing.q = q;
  }
  await writeCart(entries.filter((e) => e.q > 0));
  refresh();
  return { ok: true };
}

export type CouponState = { message?: string; error?: string };

export async function applyCoupon(_: CouponState, form: FormData): Promise<CouponState> {
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  if (!code) return { error: "Enter a coupon code." };
  const lines = await getCartLines();
  const totals = await computeTotals(lines, code);
  if (totals.couponError) return { error: totals.couponError };
  (await cookies()).set(COUPON_COOKIE, code, cookieOpts);
  refresh();
  return { message: `${code} applied.` };
}

export async function removeCoupon(): Promise<void> {
  (await cookies()).delete(COUPON_COOKIE);
  refresh();
}
