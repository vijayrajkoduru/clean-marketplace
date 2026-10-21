"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { site } from "@/config/site";
import { db } from "@/lib/db";
import { CART_COOKIE, COUPON_COOKIE, NO_CREDIT_COOKIE, PLUS_COOKIE, decodeCart, encodeCart, getCartLines, type CartEntry } from "@/lib/cart";
import { checkGuests, checkMenu, getServiceMenu } from "@/lib/menu";
import { computeTotals, couponErrorText } from "@/lib/pricing";
import { strings, fmt } from "@/strings";

const cookieOpts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 14 };

async function writeCart(entries: CartEntry[]) {
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
    // Catering is added with its guests and menu (setCartMenu), not as a plain quantity.
    if (variant.unit === "plate") return { ok: false, error: "Choose the menu and the number of guests first." };
    if (entries.length >= site.maxCartItems) return { ok: false, error: "Your cart is full." };
    entries.push({ v: variantId, q });
  } else if (existing) {
    // A per-plate line is one item; it can only be removed here.
    existing.q = existing.g ? Math.min(q, 1) : q;
  }
  await writeCart(entries.filter((e) => e.q > 0));
  refresh();
  return { ok: true };
}

/**
 * Puts a per-plate package (catering) in the cart with its guests and chosen dishes, after
 * checking them. Another package of the same service in the cart is replaced.
 */
export async function setCartMenu(variantId: string, guests: number, dishIds: string[]): Promise<{ ok: boolean; error?: string }> {
  const variant = await db.serviceVariant.findFirst({ where: { id: variantId, active: true, unit: "plate", service: { active: true } } });
  if (!variant) return { ok: false, error: "This package is no longer available." };
  const g = Math.floor(Number(guests));
  const guestError = checkGuests(g, variant.minGuests, variant.maxGuests);
  if (guestError) return { ok: false, error: guestError };
  const menu = await getServiceMenu(variant.serviceId);
  const picked = Array.isArray(dishIds) ? dishIds.filter((d) => typeof d === "string").slice(0, 60) : [];
  let m: string[] = [];
  if (menu) {
    const checked = checkMenu(menu, variant.id, picked);
    if (!checked.ok) return { ok: false, error: checked.error };
    m = checked.dishIds;
  }
  const store = await cookies();
  const others = await db.serviceVariant.findMany({ where: { serviceId: variant.serviceId }, select: { id: true } });
  const sameService = new Set(others.map((o) => o.id));
  const entries = decodeCart(store.get(CART_COOKIE)?.value).filter((e) => !sameService.has(e.v));
  if (entries.length >= site.maxCartItems) return { ok: false, error: "Your cart is full." };
  entries.push({ v: variant.id, q: 1, g, m });
  await writeCart(entries);
  refresh();
  return { ok: true };
}

export type CouponState = { message?: string; error?: string };

export async function applyCoupon(_: CouponState, form: FormData): Promise<CouponState> {
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  const d = strings;
  if (!code) return { error: d.coupon.enterCode };
  const lines = await getCartLines();
  const totals = await computeTotals(lines, code);
  if (totals.couponError) return { error: couponErrorText(totals.couponError, d.coupon) };
  (await cookies()).set(COUPON_COOKIE, code, cookieOpts);
  refresh();
  return { message: fmt(d.coupon.applied, { code }) };
}

export async function removeCoupon(): Promise<void> {
  (await cookies()).delete(COUPON_COOKIE);
  refresh();
}

/** Adds or removes Plus membership from the current booking. */
export async function setPlus(on: boolean): Promise<void> {
  const store = await cookies();
  if (on) store.set(PLUS_COOKIE, "1", cookieOpts);
  else store.delete(PLUS_COOKIE);
  refresh();
}

/** Turns use of referral credit on this booking on or off. */
export async function setUseCredit(on: boolean): Promise<void> {
  const store = await cookies();
  if (on) store.delete(NO_CREDIT_COOKIE);
  else store.set(NO_CREDIT_COOKIE, "1", cookieOpts);
  refresh();
}
