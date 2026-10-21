import "server-only";
import { io } from "next/cache";
import { site } from "@/config/site";
import { db } from "./db";
import { rupees } from "./format";
import type { CartLine } from "./cart";

/** Why a coupon cannot be used. couponErrorText() turns it into a message. */
export type CouponError = { code: "notFound" | "inactive" | "expired" | "usedUp" | "minOrder"; coupon?: string; short?: number };

type CouponTexts = { notFound: string; inactive: string; expired: string; usedUp: string; minOrder: string };

export function couponErrorText(e: CouponError, t: CouponTexts): string {
  return t[e.code].replace("{amount}", rupees(e.short ?? 0)).replace("{code}", e.coupon ?? "");
}

export type Totals = {
  subtotal: number;
  mrpTotal: number;
  /** Coupon discount. */
  discount: number;
  /** Plus membership discount. */
  plusDiscount: number;
  /** Plus membership price, when it is bought with this booking. */
  plusFee: number;
  /** Referral credit used. */
  walletUsed: number;
  fee: number;
  total: number;
  coupon: { code: string; description: string } | null;
  couponError: CouponError | null;
  /** Plus applies to this booking (already a member, or buying now). */
  plus: boolean;
};

export type Extras = {
  /** The customer already has an active Plus membership. */
  plusActive?: boolean;
  /** The customer is buying Plus with this booking. */
  buyPlus?: boolean;
  /** Referral credit the customer has and wants to use. */
  walletBalance?: number;
};

/** What Plus saves on an item total. */
export function plusSaving(subtotal: number): number {
  return Math.min(site.plus.maxDiscount, Math.floor((subtotal * site.plus.discountPercent) / 100));
}

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

export function couponDiscount(c: CouponRow, subtotal: number): { discount: number } | { error: CouponError } {
  if (!c.active) return { error: { code: "inactive" } };
  if (c.expiresAt && c.expiresAt.getTime() < Date.now()) return { error: { code: "expired" } };
  if (c.usageLimit !== null && c.usedCount >= c.usageLimit) return { error: { code: "usedUp" } };
  if (subtotal < c.minOrder) return { error: { code: "minOrder", coupon: c.code, short: c.minOrder - subtotal } };
  let discount = c.type === "PERCENT" ? Math.floor((subtotal * c.value) / 100) : c.value;
  if (c.maxDiscount !== null) discount = Math.min(discount, c.maxDiscount);
  return { discount: Math.max(0, Math.min(discount, subtotal)) };
}

/**
 * Totals for a cart. Prices include GST.
 * Order: item total - coupon - Plus discount + visiting fee + Plus price - referral credit.
 * Plus members (and customers buying Plus now) pay no visiting fee.
 */
export async function computeTotals(lines: CartLine[], couponCode?: string | null, extras: Extras = {}): Promise<Totals> {
  // Coupon expiry reads the clock.
  await io();
  const subtotal = lines.reduce((n, l) => n + l.lineTotal, 0);
  const mrpTotal = lines.reduce((n, l) => n + (l.mrp ?? l.unitPrice) * l.quantity, 0);
  const plus = Boolean(extras.plusActive || extras.buyPlus) && subtotal > 0;
  const fee = subtotal === 0 || subtotal >= site.freeFeeAbove || plus ? 0 : site.convenienceFee;
  const plusFee = extras.buyPlus && !extras.plusActive && subtotal > 0 ? site.plus.price : 0;
  let discount = 0;
  let coupon: Totals["coupon"] = null;
  let couponError: CouponError | null = null;
  if (couponCode && subtotal > 0) {
    const row = await db.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
    if (!row) couponError = { code: "notFound" };
    else {
      const r = couponDiscount(row, subtotal);
      if ("error" in r) couponError = r.error;
      else {
        discount = r.discount;
        coupon = { code: row.code, description: row.description };
      }
    }
  }
  const plusDiscount = plus ? Math.min(plusSaving(subtotal), subtotal - discount) : 0;
  const beforeCredit = subtotal - discount - plusDiscount + fee + plusFee;
  // Referral credit covers at most part of the services, never the Plus price or the fee.
  const creditable = subtotal - discount - plusDiscount;
  const walletUsed = Math.max(0, Math.min(extras.walletBalance ?? 0, Math.floor((creditable * site.referral.maxUsePercent) / 100)));
  return {
    subtotal,
    mrpTotal,
    discount,
    plusDiscount,
    plusFee,
    walletUsed,
    fee,
    total: beforeCredit - walletUsed,
    coupon,
    couponError,
    plus,
  };
}
