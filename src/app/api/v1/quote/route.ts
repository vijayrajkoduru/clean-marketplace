import { site } from "@/config/site";
import { apiUser, ok, preflight, readBody } from "@/lib/api";
import { cartSchema } from "@/lib/app-schemas";
import { getCartLines } from "@/lib/cart";
import { extrasFor } from "@/lib/cart-extras";
import { computeTotals, couponErrorText } from "@/lib/pricing";
import { strings } from "@/strings";

export const OPTIONS = preflight;

/**
 * Prices a cart: live prices, coupon, Plus and referral credit. The app keeps the cart on the
 * phone and asks for a quote whenever it changes. Works signed out too (no Plus or credit).
 */
export async function POST(request: Request) {
  const body = await readBody(request, cartSchema);
  if ("response" in body) return body.response;
  const user = await apiUser(request);
  const { items, couponCode, buyPlus, useCredit } = body.data;
  const lines = await getCartLines(items.map((i) => ({ v: i.variantId, q: i.quantity, g: i.guests, m: i.menu })));
  const extras = await extrasFor(user?.id ?? null, { wantsPlus: Boolean(buyPlus), creditOff: useCredit === false });
  const totals = await computeTotals(lines, couponCode ?? null, extras);
  return ok({
    lines,
    totals,
    couponError: couponCode && !totals.coupon && totals.couponError ? couponErrorText(totals.couponError, strings.coupon) : null,
    plusUntil: extras.plusUntil?.toISOString() ?? null,
    credit: extras.credit,
    minOrder: site.minOrder,
    belowMinOrder: lines.length > 0 && totals.subtotal < site.minOrder,
  });
}
