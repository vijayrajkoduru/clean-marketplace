"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { CART_COOKIE, COUPON_COOKIE, NO_CREDIT_COOKIE, PLUS_COOKIE, getCartLines } from "@/lib/cart";
import { cartExtras } from "@/lib/cart-extras";
import { placeBooking } from "@/lib/orders";

export type CheckoutState = { error?: string };

/** Website checkout: the cart, coupon and extras come from cookies, the rest from the form. */
export async function placeOrder(_: CheckoutState, form: FormData): Promise<CheckoutState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  const store = await cookies();
  const result = await placeBooking(user, {
    lines: await getCartLines(),
    couponCode: store.get(COUPON_COOKIE)?.value ?? null,
    extras: await cartExtras(user.id),
    name: String(form.get("name") ?? ""),
    addressId: String(form.get("addressId") ?? ""),
    newAddress: {
      label: String(form.get("label") || "Home"),
      line1: String(form.get("line1") ?? ""),
      line2: String(form.get("line2") ?? "") || undefined,
      landmark: String(form.get("landmark") ?? "") || undefined,
      cityId: String(form.get("cityId") ?? ""),
      pincode: String(form.get("pincode") ?? ""),
    },
    slot: String(form.get("slot") ?? ""),
    online: form.get("payment") === "ONLINE",
    notes: String(form.get("notes") ?? ""),
  });
  if (!result.ok) return { error: result.error };

  store.delete(CART_COOKIE);
  store.delete(COUPON_COOKIE);
  store.delete(PLUS_COOKIE);
  store.delete(NO_CREDIT_COOKIE);
  redirect(`/bookings/${result.booking.code}?placed=1`);
}
