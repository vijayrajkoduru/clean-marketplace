"use server";

import { refresh, revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { addEvent, customerCanChange, STATUS } from "@/lib/booking";
import { isSlotBookable } from "@/lib/slots";
import { verifyCheckoutSignature } from "@/lib/razorpay";
import { notifyBooking } from "@/lib/notify";
import { markBookingPaid } from "@/lib/payments";
import { formatDateTime } from "@/lib/format";

type Result = { ok: true } | { ok: false; error: string };

async function ownBooking(code: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const booking = await db.booking.findFirst({ where: { code, customerId: user.id } });
  return booking ? { user, booking } : null;
}

export async function cancelBooking(code: string, reason: string): Promise<Result> {
  const own = await ownBooking(code);
  if (!own) return { ok: false, error: "Booking not found." };
  const { booking } = own;
  if (!customerCanChange(booking)) return { ok: false, error: "This booking can no longer be cancelled online. Please contact support." };
  const paid = booking.paymentStatus === "PAID";
  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: STATUS.CANCELLED,
        cancelReason: reason.slice(0, 200) || "Cancelled by customer",
        paymentStatus: paid ? "REFUND_DUE" : booking.paymentStatus,
      },
    });
    await addEvent(tx, booking.id, STATUS.CANCELLED, "CUSTOMER", reason.slice(0, 200) || undefined);
  });
  await notifyBooking(own.user.phone, `Booking ${code} has been cancelled.${paid ? " Your refund will reach you in 5 to 7 working days." : ""}`);
  refresh();
  return { ok: true };
}

export async function rescheduleBooking(code: string, iso: string): Promise<Result> {
  const own = await ownBooking(code);
  if (!own) return { ok: false, error: "Booking not found." };
  const { booking } = own;
  if (!customerCanChange(booking)) return { ok: false, error: "This booking can no longer be rescheduled online." };
  const when = new Date(iso);
  if (!(await isSlotBookable(booking.cityId, when, new Date(), booking.id))) return { ok: false, error: "That slot is full. Pick another time." };
  await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: booking.id }, data: { scheduledAt: when } });
    await addEvent(tx, booking.id, booking.status, "CUSTOMER", `Rescheduled to ${formatDateTime(when)}`);
  });
  refresh();
  return { ok: true };
}

export async function rateBooking(code: string, rating: number, comment: string): Promise<Result> {
  const own = await ownBooking(code);
  if (!own) return { ok: false, error: "Booking not found." };
  const { booking, user } = own;
  if (booking.status !== STATUS.COMPLETED) return { ok: false, error: "You can rate a booking after it is completed." };
  const stars = Math.round(rating);
  if (stars < 1 || stars > 5) return { ok: false, error: "Choose 1 to 5 stars." };
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
  refresh();
  return { ok: true };
}

export async function confirmOnlinePayment(
  code: string,
  payment: { orderId: string; paymentId: string; signature: string },
): Promise<Result> {
  const own = await ownBooking(code);
  if (!own) return { ok: false, error: "Booking not found." };
  const { booking } = own;
  if (booking.paymentStatus === "PAID") return { ok: true };
  if (booking.razorpayOrderId !== payment.orderId) {
    return { ok: false, error: "This payment does not match the booking. Contact support if money was deducted." };
  }
  if (!verifyCheckoutSignature(payment.orderId, payment.paymentId, payment.signature)) {
    return { ok: false, error: "We could not verify this payment. Contact support if money was deducted." };
  }
  const outcome = await markBookingPaid(booking.id, payment.paymentId, "CUSTOMER");
  refresh();
  if (outcome === "refund_due") {
    await notifyBooking(own.user.phone, `Booking ${code} was released before your payment completed. Your full refund will reach you in 5 to 7 working days.`);
    return { ok: false, error: "Your slot was released before the payment finished. We will refund the full amount in 5 to 7 working days. Please book again." };
  }
  await notifyBooking(own.user.phone, `Payment received. Booking ${code} is confirmed for ${formatDateTime(booking.scheduledAt)}.`);
  return { ok: true };
}
