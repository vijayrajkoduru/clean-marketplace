"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CART_COOKIE, COUPON_COOKIE, getCartLines } from "@/lib/cart";
import { computeTotals } from "@/lib/pricing";
import { isSlotBookable } from "@/lib/slots";
import { addEvent, newBookingCode, newStartCode, STATUS, type AddressSnapshot } from "@/lib/booking";
import { createRazorpayOrder, razorpayEnabled } from "@/lib/razorpay";
import { notifyBooking } from "@/lib/notify";
import { formatDateTime, rupees } from "@/lib/format";
import { site } from "@/config/site";
import { expireStalePayments } from "@/lib/maintenance";

export type CheckoutState = { error?: string };

const newAddress = z.object({
  label: z.string().trim().min(1).max(30).default("Home"),
  line1: z.string().trim().min(5, "Enter your house or flat number and street.").max(160),
  line2: z.string().trim().max(160).optional(),
  landmark: z.string().trim().max(100).optional(),
  cityId: z.string().min(1, "Choose your city."),
  pincode: z.string().regex(/^\d{6}$/, "Enter a 6-digit PIN code."),
});

export async function placeOrder(_: CheckoutState, form: FormData): Promise<CheckoutState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  const lines = await getCartLines();
  if (!lines.length) return { error: "Your cart is empty." };

  const name = String(form.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Enter your name so the professional knows whom to meet." };

  let addressId = String(form.get("addressId") ?? "");
  if (addressId === "new" || !addressId) {
    const parsed = newAddress.safeParse({
      label: form.get("label") || "Home",
      line1: form.get("line1"),
      line2: form.get("line2") || undefined,
      landmark: form.get("landmark") || undefined,
      cityId: form.get("cityId"),
      pincode: form.get("pincode"),
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the address." };
    const created = await db.address.create({ data: { ...parsed.data, userId: user.id } });
    addressId = created.id;
  }
  const address = await db.address.findFirst({ where: { id: addressId, userId: user.id }, include: { city: true } });
  if (!address) return { error: "Choose an address for the visit." };
  if (!address.city.active) return { error: `We do not serve ${address.city.name} yet.` };

  await expireStalePayments();
  const when = new Date(String(form.get("slot") ?? ""));
  if (!(await isSlotBookable(address.cityId, when))) return { error: "That time slot is no longer available. Pick another slot." };

  const wantsOnline = form.get("payment") === "ONLINE";
  if (wantsOnline && !razorpayEnabled()) return { error: "Online payment is not available right now. Choose pay after service." };

  const couponCode = (await cookies()).get(COUPON_COOKIE)?.value ?? null;
  const totals = await computeTotals(lines, couponCode);
  if (totals.subtotal < site.minOrder) return { error: `The minimum order is ${rupees(site.minOrder)}. Add more services to book.` };
  const notes = String(form.get("notes") ?? "").trim().slice(0, 500) || null;

  if (!user.name || user.name !== name) await db.user.update({ where: { id: user.id }, data: { name } });

  const snapshot: AddressSnapshot = {
    name,
    phone: user.phone,
    label: address.label,
    line1: address.line1,
    line2: address.line2,
    landmark: address.landmark,
    city: address.city.name,
    pincode: address.pincode,
  };

  const code = newBookingCode();
  const booking = await db.$transaction(async (tx) => {
    const b = await tx.booking.create({
      data: {
        code,
        customerId: user.id,
        cityId: address.cityId,
        address: JSON.stringify(snapshot),
        scheduledAt: when,
        status: wantsOnline ? STATUS.PENDING_PAYMENT : STATUS.CONFIRMED,
        paymentMethod: wantsOnline ? "ONLINE" : "PAY_AFTER_SERVICE",
        subtotal: totals.subtotal,
        discount: totals.discount,
        fee: totals.fee,
        total: totals.total,
        couponCode: totals.coupon?.code ?? null,
        startCode: newStartCode(),
        notes,
        items: {
          create: lines.map((l) => ({
            serviceId: l.serviceId,
            variantId: l.variantId,
            serviceName: l.serviceName,
            variantName: l.variantName,
            unitPrice: l.unitPrice,
            quantity: l.quantity,
            durationMins: l.durationMins,
          })),
        },
      },
    });
    await addEvent(tx, b.id, b.status, "CUSTOMER", wantsOnline ? "Booking created, waiting for payment" : "Booking confirmed");
    if (totals.coupon && !wantsOnline) await tx.coupon.update({ where: { code: totals.coupon.code }, data: { usedCount: { increment: 1 } } });
    return b;
  });

  if (wantsOnline) {
    try {
      const order = await createRazorpayOrder(booking.total, booking.code);
      await db.booking.update({ where: { id: booking.id }, data: { razorpayOrderId: order.id } });
    } catch (e) {
      console.error("[razorpay] order failed", e);
      await db.booking.update({ where: { id: booking.id }, data: { status: STATUS.CANCELLED, cancelReason: "Payment could not start" } });
      return { error: "We could not start the online payment. Please choose pay after service or try again." };
    }
  } else {
    await notifyBooking(user.phone, `Booking ${booking.code} confirmed for ${formatDateTime(when)}.`);
  }

  const store = await cookies();
  store.delete(CART_COOKIE);
  store.delete(COUPON_COOKIE);
  redirect(`/bookings/${booking.code}?placed=1`);
}
