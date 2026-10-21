import "server-only";
import { io } from "next/cache";
import { db } from "./db";
import { restoreBookingExtras } from "./wallet";

const PAYMENT_WINDOW_MS = 30 * 60 * 1000;

/** Releases slots held by online bookings that were never paid within 30 minutes. */
export async function expireStalePayments(): Promise<void> {
  await io();
  const cutoff = new Date(Date.now() - PAYMENT_WINDOW_MS);
  const stale = await db.booking.findMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lt: cutoff } },
    select: { id: true, customerId: true, walletUsed: true },
  });
  for (const b of stale) {
    await db.$transaction(async (tx) => {
      const done = await tx.booking.updateMany({
        where: { id: b.id, status: "PENDING_PAYMENT" },
        data: { status: "CANCELLED", cancelReason: "Payment was not completed in 30 minutes" },
      });
      if (!done.count) return;
      await tx.bookingEvent.create({ data: { bookingId: b.id, status: "CANCELLED", actor: "SYSTEM", note: "Payment window expired" } });
      await restoreBookingExtras(tx, b);
    });
  }
}
