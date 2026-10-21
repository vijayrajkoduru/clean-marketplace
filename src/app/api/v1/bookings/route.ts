import { z } from "zod";
import { fail, ok, preflight, readBody, withUser } from "@/lib/api";
import { bookingList } from "@/lib/app-views";
import { cartSchema } from "@/lib/app-schemas";
import { getCartLines } from "@/lib/cart";
import { extrasFor } from "@/lib/cart-extras";
import { addressSchema, placeBooking } from "@/lib/orders";
import { razorpayKeyId } from "@/lib/razorpay";

export const OPTIONS = preflight;

/** The signed-in customer's bookings, newest visit first. */
export async function GET(request: Request) {
  return withUser(request, async (user) => ok({ bookings: await bookingList(user) }));
}

const bookingSchema = cartSchema.extend({
  name: z.string(),
  addressId: z.string().nullish(),
  newAddress: addressSchema.optional(),
  slot: z.string().min(1, "Pick a time for the visit."),
  payment: z.enum(["ONLINE", "PAY_AFTER_SERVICE"]),
  notes: z.string().max(500).nullish(),
});

/**
 * Places a booking. For online payment the answer includes the Razorpay order to open in the app;
 * the booking is confirmed once the payment is checked (POST /bookings/[code]/payment).
 */
export async function POST(request: Request) {
  return withUser(request, async (user) => {
    const body = await readBody(request, bookingSchema);
    if ("response" in body) return body.response;
    const d = body.data;
    const r = await placeBooking(user, {
      lines: await getCartLines(d.items.map((i) => ({ v: i.variantId, q: i.quantity, g: i.guests, m: i.menu }))),
      couponCode: d.couponCode ?? null,
      extras: await extrasFor(user.id, { wantsPlus: Boolean(d.buyPlus), creditOff: d.useCredit === false }),
      name: d.name,
      addressId: d.addressId,
      newAddress: d.newAddress,
      slot: d.slot,
      online: d.payment === "ONLINE",
      notes: d.notes,
    });
    if (!r.ok) return fail(r.error);
    const { code, total, razorpayOrderId } = r.booking;
    return ok({ code, total, payment: razorpayOrderId ? { orderId: razorpayOrderId, keyId: razorpayKeyId(), amountPaise: total * 100 } : null }, 201);
  });
}
