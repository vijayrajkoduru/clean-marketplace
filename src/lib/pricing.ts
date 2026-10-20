import "server-only";
import { io } from "next/cache";
import { site } from "@/config/site";
import { db } from "./db";
import { rupees } from "./format";
import type { CartLine } from "./cart";

export type Totals = {
  subtotal: number;
  mrpTotal: number;
  discount: number;
  fee: number;
  total: number;
  coupon: { code: string; description: string } | null;
  couponError: string | null;
};

type CouponRow = {
  code: string;
  description: string;
  type: string;
  value: number;
  minOrder: number;
  maxDiscount: number | null;
  active: boolean;
  expiresAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
};

export function couponDiscount(c: CouponRow, subtotal: number): { discount: number } | { error: string } {
  if (!c.active) return { error: "This coupon is no longer active." };
  if (c.expiresAt && c.expiresAt.getTime() < Date.now()) return { error: "This coupon has expired." };
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return { error: "This coupon has been fully used." };
  if (subtotal < c.minOrder) return { error: `Add ${rupees(c.minOrder - subtotal)} more to use ${c.code}.` };
  let discount = c.type === "PERCENT" ? Math.floor((subtotal * c.value) / 100) : c.value;
  if (c.maxDiscount !== null) discount = Math.min(discount, c.maxDiscount);
  return { discount: Math.max(0, Math.min(discount, subtotal)) };
}

/** Totals for a cart. Prices include GST. The fee is waived on larger orders. */
export async function computeTotals(lines: CartLine[], couponCode?: string | null): Promise<Totals> {
  // Coupon expiry reads the clock.
  await io();
  const subtotal = lines.reduce((n, l) => n + l.lineTotal, 0);
  const mrpTotal = lines.reduce((n, l) => n + (l.mrp ?? l.unitPrice) * l.quantity, 0);
  const fee = subtotal === 0 || subtotal >= site.freeFeeAbove ? 0 : site.convenienceFee;
  let discount = 0;
  let coupon: Totals["coupon"] = null;
  let couponError: string | null = null;
  if (couponCode && subtotal > 0) {
    const row = await db.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    if (!row) couponError = "We could not find that coupon.";
    else {
      const r = couponDiscount(row, subtotal);
      if ("error" in r) couponError = r.error;
      else {
        discount = r.discount;
        coupon = { code: row.code, description: row.description };
      }
    }
  }
  return { subtotal, mrpTotal, discount, fee, total: subtotal - discount + fee, coupon, couponError };
}
