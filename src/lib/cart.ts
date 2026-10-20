import "server-only";
import { cookies } from "next/headers";
import { site } from "@/config/site";
import { db } from "./db";

export const CART_COOKIE = "clean_cart";
export const COUPON_COOKIE = "clean_coupon";

export type CartEntry = { v: string; q: number };

export type CartLine = {
  variantId: string;
  serviceId: string;
  serviceSlug: string;
  serviceName: string;
  variantName: string;
  image: string | null;
  unitPrice: number;
  mrp: number | null;
  quantity: number;
  durationMins: number;
  lineTotal: number;
};

export function decodeCart(raw: string | undefined): CartEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.v === "string" && Number.isInteger(e.q) && e.q > 0)
      .slice(0, site.maxCartItems)
      .map((e) => ({ v: e.v, q: Math.min(e.q, 10) }));
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

/** Cart entries resolved against live prices. Inactive items are dropped. */
export async function getCartLines(entries?: CartEntry[]): Promise<CartLine[]> {
  const list = entries ?? (await readCart());
  if (!list.length) return [];
  const variants = await db.serviceVariant.findMany({
    where: { id: { in: list.map((e) => e.v) }, active: true, service: { active: true } },
    include: { service: { include: { category: { select: { image: true } } } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));
  return list.flatMap((e) => {
    const v = byId.get(e.v);
    if (!v) return [];
    return [
      {
        variantId: v.id,
        serviceId: v.serviceId,
        serviceSlug: v.service.slug,
        serviceName: v.service.name,
        variantName: v.name,
        image: v.service.image ?? v.service.category.image,
        unitPrice: v.price,
        mrp: v.mrp,
        quantity: e.q,
        durationMins: v.durationMins,
        lineTotal: v.price * e.q,
      },
    ];
  });
}

export async function cartCount(): Promise<number> {
  const entries = await readCart();
  return entries.reduce((n, e) => n + e.q, 0);
}
