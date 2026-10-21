import "server-only";
import { db } from "./db";
import { partnerEarning } from "./booking";

export type Balance = { jobs: number; earnings: number; collected: number; balance: number; bookingIds: string[] };

/**
 * What is owed for a professional's completed jobs that are not settled yet.
 * earnings: their share of each job. collected: cash or UPI they took from customers on
 * pay-after-service jobs. balance = earnings - collected: positive means you pay them,
 * negative means they pay you.
 */
export async function unsettledBalance(partnerId: string, tx: Pick<typeof db, "booking"> = db): Promise<Balance> {
  const jobs = await tx.booking.findMany({
    where: { partnerId, status: "COMPLETED", payoutId: null },
    select: { id: true, subtotal: true, total: true, paymentMethod: true },
  });
  const earnings = jobs.reduce((n, b) => n + partnerEarning(b.subtotal), 0);
  const collected = jobs.reduce((n, b) => n + (b.paymentMethod === "PAY_AFTER_SERVICE" ? b.total : 0), 0);
  return { jobs: jobs.length, earnings, collected, balance: earnings - collected, bookingIds: jobs.map((b) => b.id) };
}
