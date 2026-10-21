import "server-only";
import { z } from "zod";
import { site } from "@/config/site";
import { fmt } from "@/strings";
import { db } from "./db";
import type { SessionUser } from "./auth";
import type { CartLine } from "./cart";
import { computeTotals, type Extras } from "./pricing";
import { restoreBookingExtras, walletBalance } from "./wallet";
import { isSlotBookable } from "./slots";
import { addEvent, newBookingCode, newStartCode, STATUS, type AddressSnapshot } from "./booking";
import { createRazorpayOrder, razorpayEnabled } from "./razorpay";
import { notifyUser } from "./notify";
import { announceNewJob } from "./jobs";
import { rupees } from "./format";
import { expireStalePayments } from "./maintenance";

/**
 * Placing a booking, shared by the website checkout and the mobile app API.
 */

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(30).default("Home"),
  line1: z.string().trim().min(5, "Enter your house or flat number and street.").max(160),
  line2: z.string().trim().max(160).optional(),
  landmark: z.string().trim().max(100).optional(),
  cityId: z.string().min(1, "Choose your city."),
  pincode: z.string().regex(/^\d{6}$/, "Enter a 6-digit PIN code."),
});

export type NewAddress = z.input<typeof addressSchema>;

export type PlaceBookingInput = {
  lines: CartLine[];
  couponCode: string | null;
  extras: Extras;
  name: string;
  /** A saved address of this customer, or a new one to save. */
  addressId?: string | null;
  newAddress?: NewAddress;
  /** ISO time of the chosen slot. */
  slot: string;
  online: boolean;
  notes?: string | null;
};

export type PlacedBooking = { id: string; code: string; total: number; razorpayOrderId: string | null };

export async function placeBooking(user: SessionUser, input: PlaceBookingInput): Promise<{ ok: true; booking: PlacedBooking } | { ok: false; error: string }> {
  const { lines } = input;
  if (!lines.length) return { ok: false, error: "Your cart is empty." };
  const blocked = lines.find((l) => l.problem);
  if (blocked) return { ok: false, error: `${blocked.serviceName}: ${blocked.problem}` };

  const name = input.name.trim();
  if (name.length < 2) return { ok: false, error: "Enter your name so the professional knows whom to meet." };

  let addressId = input.addressId ?? "";
  if (!addressId || addressId === "new") {
    const parsed = addressSchema.safeParse(input.newAddress ?? {});
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the address." };
    const created = await db.address.create({ data: { ...parsed.data, userId: user.id } });
    addressId = created.id;
  }
  const address = await db.address.findFirst({ where: { id: addressId, userId: user.id }, include: { city: true } });
  if (!address) return { ok: false, error: "Choose an address for the visit." };
  if (!address.city.active) return { ok: false, error: `We do not serve ${address.city.name} yet.` };

  await expireStalePayments();
  const when = new Date(input.slot);
  if (!(await isSlotBookable(address.cityId, when))) return { ok: false, error: "That time slot is no longer available. Pick another slot." };

  const wantsOnline = input.online;
  if (wantsOnline && !razorpayEnabled()) return { ok: false, error: "Online payment is not available right now. Choose pay after service." };

  const totals = await computeTotals(lines, input.couponCode, input.extras);
  if (totals.subtotal < site.minOrder) return { ok: false, error: fmt("The minimum order is {min}. Add more services to book.", { min: rupees(site.minOrder) }) };
  const notes = (input.notes ?? "").trim().slice(0, 500) || null;

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
    // Check the credit again inside the transaction, in case it was used on another booking just now.
    const walletUsed = Math.min(totals.walletUsed, await walletBalance(user.id, tx));
    const total = totals.total + (totals.walletUsed - walletUsed);
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
        plusDiscount: totals.plusDiscount,
        plusFee: totals.plusFee,
        walletUsed,
        fee: totals.fee,
        total,
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
            guests: l.guests,
            platePrice: l.platePrice,
            menu: l.menu ? JSON.stringify(l.menu) : null,
          })),
        },
      },
    });
    await addEvent(tx, b.id, b.status, "CUSTOMER", wantsOnline ? "Booking created, waiting for payment" : "Booking confirmed");
    if (totals.coupon && !wantsOnline) await tx.coupon.update({ where: { code: totals.coupon.code }, data: { usedCount: { increment: 1 } } });
    if (walletUsed > 0) await tx.walletEntry.create({ data: { userId: user.id, amount: -walletUsed, reason: `Used on booking ${code}`, bookingId: b.id } });
    if (totals.plusFee > 0) {
      const startsAt = new Date();
      const endsAt = new Date(startsAt);
      endsAt.setMonth(endsAt.getMonth() + site.plus.months);
      await tx.membership.create({ data: { userId: user.id, price: totals.plusFee, startsAt, endsAt, bookingId: b.id } });
    }
    return b;
  });

  let razorpayOrderId: string | null = null;
  if (wantsOnline) {
    try {
      const order = await createRazorpayOrder(booking.total, booking.code);
      await db.booking.update({ where: { id: booking.id }, data: { razorpayOrderId: order.id } });
      razorpayOrderId = order.id;
    } catch (e) {
      console.error("[razorpay] order failed", e);
      await db.$transaction(async (tx) => {
        await tx.booking.update({ where: { id: booking.id }, data: { status: STATUS.CANCELLED, cancelReason: "Payment could not start" } });
        await restoreBookingExtras(tx, booking);
      });
      return { ok: false, error: "We could not start the online payment. Please choose pay after service or try again." };
    }
  } else {
    const services = [...new Set(lines.map((l) => l.serviceName))].join(", ");
    await notifyUser(user.id, (t, at) => ({
      title: t.bookingConfirmed,
      body: fmt(t.bookingConfirmedBody, { services, when: at(when), code: booking.code }),
      link: `/bookings/${booking.code}`,
    }));
    await announceNewJob(booking.id);
  }

  return { ok: true, booking: { id: booking.id, code: booking.code, total: booking.total, razorpayOrderId } };
}
