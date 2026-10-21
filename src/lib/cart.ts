import "server-only";
import { cookies } from "next/headers";
import { site } from "@/config/site";
import { db } from "./db";
import { checkGuests, checkMenu, getServiceMenu, type MenuLine } from "./menu";

export const CART_COOKIE = "clean_cart";
export const COUPON_COOKIE = "clean_coupon";
/** "1" when the customer added Plus membership to this booking. */
export const PLUS_COOKIE = "clean_plus";
/** "1" when the customer chose not to use their referral credit. */
export const NO_CREDIT_COOKIE = "clean_no_credit";

/** A cart entry. Per-plate items (catering) also carry the guests (g) and the chosen dish ids (m). */
export type CartEntry = { v: string; q: number; g?: number; m?: string[] };

export const MAX_GUESTS = 5000;
const MAX_DISHES = 60;

export type CartLine = {
  variantId: string;
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  variantName: string;
  image: string | null;
  /** For per-plate items this is the whole line (platePrice x guests) and quantity is 1. */
  unitPrice: number;
  mrp: number | null;
  quantity: number;
  durationMins: number;
  lineTotal: number;
  /** Per-plate items only. */
  guests: number | null;
  platePrice: number | null;
  menu: MenuLine[] | null;
  dishIds: string[] | null;
  /** Why this line cannot be booked as it is (for example, the menu changed). */
  problem: string | null;
};

export function decodeCart(raw: string | undefined): CartEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.v === "string" && Number.isInteger(e.q) && e.q > 0)
      .slice(0, site.maxCartItems)
      .map((e) => {
        const entry: CartEntry = { v: e.v, q: Math.min(e.q, 10) };
        if (Number.isInteger(e.g) && e.g > 0) entry.g = Math.min(e.g, MAX_GUESTS);
        if (Array.isArray(e.m)) entry.m = e.m.filter((x: unknown) => typeof x === "string").slice(0, MAX_DISHES);
        return entry;
      });
  } catch {
    return [];
  }
}

export function encodeCart(entries: CartEntry[]): string {
  return Buffer.from(JSON.stringify(entries), "utf8").toString("base64url");
}

export async function readCart(): Promise<CartEntry[]> {
  return decodeCart((await cookies()).get(CART_COOKIE)?.value);
}

/**
 * Cart entries resolved against live prices. Inactive items are dropped. Per-plate items are
 * priced from the guests and the menu, which are checked again here; a line that no longer
 * passes gets a `problem` and cannot be booked until it is fixed.
 */
export async function getCartLines(entries?: CartEntry[]): Promise<CartLine[]> {
  const list = entries ?? (await readCart());
  if (!list.length) return [];
  const variants = await db.serviceVariant.findMany({
    where: { id: { in: list.map((e) => e.v) }, active: true, service: { active: true } },
    include: { service: { include: { category: { select: { image: true } } } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));
  const lines: CartLine[] = [];
  for (const e of list) {
    const v = byId.get(e.v);
    if (!v) continue;
    const base = {
      variantId: v.id,
      serviceId: v.serviceId,
      serviceSlug: v.service.slug,
      serviceName: v.service.name,
      variantName: v.name,
      image: v.service.image ?? v.service.category.image,
      durationMins: v.durationMins,
    };
    if (v.unit !== "plate") {
      lines.push({ ...base, unitPrice: v.price, mrp: v.mrp, quantity: e.q, lineTotal: v.price * e.q, guests: null, platePrice: null, menu: null, dishIds: null, problem: null });
      continue;
    }
    const guests = e.g ?? v.minGuests ?? 0;
    const menu = await getServiceMenu(v.serviceId);
    const checked = menu ? checkMenu(menu, v.id, e.m ?? []) : null;
    const extra = checked?.ok ? checked.extraPerPlate : 0;
    const platePrice = v.price + extra;
    const problem = checkGuests(guests, v.minGuests, v.maxGuests) ?? (checked && !checked.ok ? checked.error : null);
    lines.push({
      ...base,
      quantity: 1,
      unitPrice: platePrice * guests,
      lineTotal: platePrice * guests,
      mrp: v.mrp ? (v.mrp + extra) * guests : null,
      guests,
      platePrice,
      menu: checked?.ok ? checked.lines : null,
      dishIds: checked?.ok ? checked.dishIds : (e.m ?? []),
      problem,
    });
  }
  return lines;
}

/** Items in the cart for the header badge: a catering order counts as one item, not one per guest. */
export async function cartCount(): Promise<number> {
  const entries = await readCart();
  return entries.reduce((n, e) => n + e.q, 0);
}
