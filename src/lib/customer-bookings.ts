import "server-only";
import { revalidateTag } from "next/cache";
import { fmt } from "@/strings";
import { db } from "./db";
import type { SessionUser } from "./auth";
import { addEvent, customerCanChange, STATUS } from "./booking";
import { isSlotBookable } from "./slots";
import { verifyCheckoutSignature } from "./razorpay";
import { notifyUser } from "./notify";
import { markBookingPaid } from "./payments";
import { restoreBookingExtras } from "./wallet";
import { formatDateTime } from "./format";

/**
 * What customers can do with their own bookings, shared by the website and the mobile app API.
 */

export type Result = { ok: true } | { ok: false; error: string };

async function ownBooking(user: SessionUser, code: string) {
  return db.booking.findFirst({ where: { code, customerId: user.id } });
}

export async function cancelBooking(user: SessionUser, code: string, reason: string): Promise<Result> {
  const booking = await ownBooking(user, code);
  if (!booking) return { ok: false, error: "Booking not found." };
  if (!customerCanChange(booking)) return { ok: false, error: "This booking can no longer be cancelled online. Please contact support." };
  const paid = booking.paymentStatus === "PAID";
  const note = reason.trim().slice(0, 200);
  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: STATUS.CANCELLED,
        cancelReason: note || "Cancelled by customer",
        paymentStatus: paid ? "REFUND_DUE" : booking.paymentStatus,
      },
    });
    await addEvent(tx, booking.id, STATUS.CANCELLED, "CUSTOMER", note || undefined);
    await restoreBookingExtras(tx, booking);
  });
  await notifyUser(user.id, (t) => ({ title: t.bookingCancelled, body: fmt(t.cancelledBody, { code }) + (paid ? t.refundPart : ""), link: `/bookings/${code}` }));
  if (booking.partnerId) {
    const partner = await db.partner.findUnique({ where: { id: booking.partnerId }, select: { userId: true } });
    if (partner) await notifyUser(partner.userId, (t, when) => ({ title: t.jobCancelled, body: fmt(t.jobCancelledByCustomerBody, { code, when: when(booking.scheduledAt) }), link: "/partner" }));
  }
  return { ok: true };
}

export async function rescheduleBooking(user: SessionUser, code: string, iso: string): Promise<Result> {
  const booking = await ownBooking(user, code);
  if (!booking) return { ok: false, error: "Booking not found." };
  if (!customerCanChange(booking)) return { ok: false, error: "This booking can no longer be rescheduled online." };
  const when = new Date(iso);
  if (!(await isSlotBookable(booking.cityId, when, new Date(), booking.id))) return { ok: false, error: "That slot is full. Pick another time." };
  await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: booking.id }, data: { scheduledAt: when } });
    await addEvent(tx, booking.id, booking.status, "CUSTOMER", `Rescheduled to ${formatDateTime(when)}`);
  });
  await notifyUser(user.id, (t, at) => ({ title: t.bookingRescheduled, body: fmt(t.bookingRescheduledBody, { code, when: at(when) }), link: `/bookings/${code}` }));
  if (booking.partnerId) {
    const partner = await db.partner.findUnique({ where: { id: booking.partnerId }, select: { userId: true } });
    if (partner) await notifyUser(partner.userId, (t, at) => ({ title: t.jobRescheduled, body: fmt(t.jobRescheduledBody, { code, when: at(when) }), link: "/partner" }));
  }
  return { ok: true };
}

export async function rateBooking(user: SessionUser, code: string, rating: number, comment: string): Promise<Result> {
  const booking = await ownBooking(user, code);
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.status !== STATUS.COMPLETED) return { ok: false, error: "You can rate a booking after it is completed." };
  const stars = Math.round(rating);
  if (!(stars >= 1 && stars <= 5)) return { ok: false, error: "Choose 1 to 5 stars." };
  const existing = await db.review.findUnique({ where: { bookingId: booking.id } });
  if (existing) return { ok: false, error: "You have already rated this booking." };
  const items = await db.bookingItem.findMany({ where: { bookingId: booking.id }, select: { serviceId: true } });
  const serviceIds = [...new Set(items.map((i) => i.serviceId))];
  await db.$transaction([
    db.review.create({
      data: { bookingId: booking.id, userId: user.id, partnerId: booking.partnerId, rating: stars, comment: comment.trim().slice(0, 500) || null },
    }),
    ...serviceIds.map((id) => db.service.update({ where: { id }, data: { ratingSum: { increment: stars }, ratingCount: { increment: 1 } } })),
  ]);
  // Ratings show on cached catalogue pages; refresh them in the background.
  revalidateTag("catalog", "max");
  return { ok: true };
}

export type PaymentProof = { orderId: string; paymentId: string; signature: string };

/** Confirms an online payment from the Razorpay checkout. The webhook confirms it too, if this never arrives. */
export async function confirmOnlinePayment(user: SessionUser, code: string, payment: PaymentProof): Promise<Result> {
  const booking = await ownBooking(user, code);
  if (!booking) return { ok: false, error: "Booking not found." };
  if (booking.paymentStatus === "PAID") return { ok: true };
  if (booking.razorpayOrderId !== payment.orderId) {
    return { ok: false, error: "This payment does not match the booking. Contact support if money was deducted." };
  }
  if (!verifyCheckoutSignature(payment.orderId, payment.paymentId, payment.signature)) {
    return { ok: false, error: "We could not verify this payment. Contact support if money was deducted." };
  }
  const outcome = await markBookingPaid(booking.id, payment.paymentId, "CUSTOMER");
  if (outcome === "refund_due" || outcome === "already_refund_due") {
    return { ok: false, error: "Your slot was released before the payment finished. We will refund the full amount in 5 to 7 working days. Please book again." };
  }
  return { ok: true };
}
