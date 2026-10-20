import "server-only";
import { db } from "./db";
import { addEvent, STATUS } from "./booking";

export type PaidOutcome = "confirmed" | "refund_due" | "already_paid" | "not_found";

/**
 * Records an online payment. Safe to call more than once (checkout callback and webhook).
 * A payment that lands after the booking was cancelled, for example when the 30-minute
 * hold ran out mid-payment, is marked for refund instead of reviving the booking.
 */
export async function markBookingPaid(bookingId: string, paymentId: string, actor: "CUSTOMER" | "SYSTEM"): Promise<PaidOutcome> {
  return db.$transaction(async (tx) => {
    const b = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!b) return "not_found";
    if (b.paymentStatus === "PAID" || b.paymentStatus === "REFUND_DUE" || b.paymentStatus === "REFUNDED") {
      return b.paymentStatus === "PAID" ? "already_paid" : "refund_due";
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
