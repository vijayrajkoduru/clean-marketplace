import "server-only";
import { randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { site } from "@/config/site";
import { db } from "./db";
import { notifyUser } from "./notify";
import { rupees } from "./format";
import { fmt } from "@/strings";

type Tx = Prisma.TransactionClient;

/** Holds a referral code from a /r/CODE link until the visitor logs in. */
export const REFERRAL_COOKIE = "clean_ref";

export async function walletBalance(userId: string, tx: Pick<Tx, "walletEntry"> = db): Promise<number> {
  const agg = await tx.walletEntry.aggregate({ where: { userId }, _sum: { amount: true } });
  return Math.max(0, agg._sum.amount ?? 0);
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** The user's referral code, created the first time it is needed. */
export async function referralCodeFor(userId: string): Promise<string> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { referralCode: true } });
  if (u?.referralCode) return u.referralCode;
  for (let attempt = 0; attempt < 5; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
    try {
      await db.user.update({ where: { id: userId }, data: { referralCode: code } });
      return code;
    } catch {
      // code taken; try another
    }
  }
  throw new Error("Could not create a referral code");
}

/**
 * Gives back what a cancelled booking used: referral credit is returned to the wallet
 * and a Plus membership bought with the booking is cancelled. Safe to call twice.
 */
export async function restoreBookingExtras(tx: Tx, booking: { id: string; customerId: string; walletUsed: number }): Promise<void> {
  if (booking.walletUsed > 0) {
    const already = await tx.walletEntry.findFirst({ where: { bookingId: booking.id, reason: "Returned from cancelled booking" } });
    if (!already) {
      await tx.walletEntry.create({ data: { userId: booking.customerId, amount: booking.walletUsed, reason: "Returned from cancelled booking", bookingId: booking.id } });
    }
  }
  await tx.membership.updateMany({ where: { bookingId: booking.id, status: "ACTIVE" }, data: { status: "CANCELLED" } });
}

/** When a referred customer's first booking is completed, the person who referred them earns credit. */
export async function rewardReferrer(customerId: string): Promise<void> {
  const customer = await db.user.findUnique({ where: { id: customerId }, select: { name: true, referredById: true } });
  if (!customer?.referredById) return;
  const completed = await db.booking.count({ where: { customerId, status: "COMPLETED" } });
  if (completed !== 1) return;
  const reason = `Referral reward for ${customerId}`;
  const exists = await db.walletEntry.findFirst({ where: { userId: customer.referredById, reason } });
  if (exists) return;
  await db.walletEntry.create({ data: { userId: customer.referredById, amount: site.referral.reward, reason } });
  await notifyUser(customer.referredById, (t) => ({
    title: fmt(t.referralEarned, { amount: rupees(site.referral.reward) }),
    body: fmt(t.referralEarnedBody, { name: customer.name?.split(" ")[0] ?? t.yourFriend }),
    link: "/account",
  }));
}

/** Links a new customer to the person who referred them and gives the welcome credit. */
export async function applyReferral(newUserId: string, code: string): Promise<void> {
  const referrer = await db.user.findUnique({ where: { referralCode: code.toUpperCase() }, select: { id: true, name: true } });
  if (!referrer || referrer.id === newUserId) return;
  await db.$transaction([
    db.user.update({ where: { id: newUserId }, data: { referredById: referrer.id } }),
    db.walletEntry.create({ data: { userId: newUserId, amount: site.referral.friendCredit, reason: `Welcome credit from ${referrer.name?.split(" ")[0] ?? "a friend"}` } }),
  ]);
  await notifyUser(newUserId, (t) => ({
    title: fmt(t.welcomeCredit, { amount: rupees(site.referral.friendCredit) }),
    body: fmt(t.welcomeCreditBody, { amount: rupees(site.referral.friendCredit) }),
    link: "/account",
  }));
}
