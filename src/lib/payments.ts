import "server-only";
import { db } from "./db";
import { addEvent, STATUS } from "./booking";
import { announceNewJob } from "./jobs";
import { notifyUser } from "./notify";
import { fmt } from "@/strings";

export type PaidOutcome = "confirmed" | "refund_due" | "already_paid" | "already_refund_due" | "not_found";

/**
 * Records an online payment. Safe to call more than once (checkout callback and webhook).
 * A payment that lands after the booking was cancelled, for example when the 30-minute
 * hold ran out mid-payment, is marked for refund instead of reviving the booking.
 */
export async function markBookingPaid(bookingId: string, paymentId: string, actor: "CUSTOMER" | "SYSTEM"): Promise<PaidOutcome> {
  const outcome = await recordPayment(bookingId, paymentId, actor);
  const b = await db.booking.findUnique({ where: { id: bookingId }, select: { code: true, customerId: true, scheduledAt: true } });
  if (b && outcome === "confirmed") {
    await notifyUser(b.customerId, (t, when) => ({ title: t.paymentReceived, body: fmt(t.paymentReceivedBody, { code: b.code, when: when(b.scheduledAt) }), link: `/bookings/${b.code}` }));
    await announceNewJob(bookingId);
  }
  if (b && outcome === "refund_due") {
    await notifyUser(b.customerId, (t) => ({ title: t.refundOnWay, body: fmt(t.refundOnWayBody, { code: b.code }), link: `/bookings/${b.code}` }));
  }
  return outcome;
}

async function recordPayment(bookingId: string, paymentId: string, actor: "CUSTOMER" | "SYSTEM"): Promise<PaidOutcome> {
  return db.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!b) return "not_found";
    if (b.paymentStatus === "PAID" || b.paymentStatus === "REFUND_DUE" || b.paymentStatus === "REFUNDED") {
      return b.paymentStatus === "PAID" ? "already_paid" : "already_refund_due";
    }
    if (b.status === STATUS.CANCELLED) {
      await tx.booking.update({ where: { id: bookingId }, data: { paymentStatus: "REFUND_DUE", razorpayPaymentId: paymentId } });
      await addEvent(tx, bookingId, STATUS.CANCELLED, actor, "Payment arrived after the booking was cancelled. Refund due.");
      return "refund_due";
    }
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: "PAID",
        razorpayPaymentId: paymentId,
        status: b.status === STATUS.PENDING_PAYMENT ? STATUS.CONFIRMED : b.status,
      },
    });
    await addEvent(tx, bookingId, STATUS.CONFIRMED, actor, "Payment received online");
    if (b.couponCode) await tx.coupon.updateMany({ where: { code: b.couponCode }, data: { usedCount: { increment: 1 } } });
    return "confirmed";
  });
}
