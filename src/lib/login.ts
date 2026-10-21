import "server-only";
import { db } from "./db";
import { adminPhones, type Role } from "./auth";
import { PHONE_RE, verifyLoginCode } from "./otp";
import { applyReferral } from "./wallet";

/**
 * Signing in with a mobile number and the 6-digit code from the SMS, shared by the website and
 * the mobile app API. Creates the account on first sign-in.
 */
export async function signInWithCode(
  phone: string,
  code: string,
  referralCode?: string | null,
): Promise<{ ok: true; userId: string; role: Role } | { ok: false; error: string }> {
  if (!PHONE_RE.test(phone)) return { ok: false, error: "Enter your mobile number again." };
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "Enter the 6-digit code from the SMS." };
  const r = await verifyLoginCode(phone, code);
  if (!r.ok) return { ok: false, error: r.error };

  const makeAdmin = adminPhones().includes(phone);
  const isNew = !(await db.user.findUnique({ where: { phone }, select: { id: true } }));
  const user = await db.user.upsert({
    where: { phone },
    update: makeAdmin ? { role: "ADMIN" } : {},
    create: { phone, role: makeAdmin ? "ADMIN" : "CUSTOMER" },
  });
  // A new customer who arrived through a referral link gets the welcome credit.
  if (referralCode && isNew) await applyReferral(user.id, referralCode);
  return { ok: true, userId: user.id, role: user.role as Role };
}
