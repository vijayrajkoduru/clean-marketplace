import "server-only";
import { cookies } from "next/headers";
import { NO_CREDIT_COOKIE, PLUS_COOKIE } from "./cart";
import { activePlus } from "./membership";
import { walletBalance } from "./wallet";
import type { Extras } from "./pricing";

export type CartExtras = Extras & {
  /** Referral credit the customer has, whether or not they use it. */
  credit: number;
  /** The customer turned credit off for this booking. */
  creditOff: boolean;
  /** End date of the active membership, if any. */
  plusUntil: Date | null;
};

/** Plus and referral credit for a customer's booking: whether they add Plus, and whether they use their credit. */
export async function extrasFor(userId: string | null, choice: { wantsPlus: boolean; creditOff: boolean }): Promise<CartExtras> {
  const { wantsPlus, creditOff } = choice;
  if (!userId) return { plusActive: false, buyPlus: wantsPlus, walletBalance: 0, credit: 0, creditOff, plusUntil: null };
  const [membership, credit] = await Promise.all([activePlus(userId), walletBalance(userId)]);
  return {
    plusActive: Boolean(membership),
    buyPlus: wantsPlus && !membership,
    walletBalance: creditOff ? 0 : credit,
    credit,
    creditOff,
    plusUntil: membership?.endsAt ?? null,
  };
}

/** Plus and referral credit for the signed-in customer's website cart, from the cart cookies. */
export async function cartExtras(userId: string | null): Promise<CartExtras> {
  const store = await cookies();
  return extrasFor(userId, { wantsPlus: store.get(PLUS_COOKIE)?.value === "1", creditOff: store.get(NO_CREDIT_COOKIE)?.value === "1" });
}
