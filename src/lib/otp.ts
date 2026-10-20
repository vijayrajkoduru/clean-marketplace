import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { sendLoginCode, smsProvider } from "./notify";

export const PHONE_RE = /^[6-9]\d{9}$/;
const CODE_TTL_MS = 5 * 60 * 1000;
const RESEND_GAP_MS = 30 * 1000;
const MAX_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;

function hashCode(phone: string, code: string): string {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

export type IssueResult = { ok: true; devCode?: string } | { ok: false; error: string };

/**
 * Codes sent per client IP in the last hour. In memory, so it covers one server;
 * it stops one visitor from sending SMS to many numbers (and running up the SMS bill).
 */
const MAX_PER_IP_HOUR = 40; // generous: mobile networks put many customers behind one IP
const ipSends = new Map<string, number[]>();

function ipAllowed(ip: string, now: number): boolean {
  // Without a real client address (no proxy header, or local traffic) every visitor would share
  // one bucket and lock each other out, so the per-IP brake only applies when the IP is known.
  if (ip === "unknown" || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("::ffff:127.")) return true;
  const recent = (ipSends.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  if (recent.length >= MAX_PER_IP_HOUR) {
    ipSends.set(ip, recent);
    return false;
  }
  recent.push(now);
  ipSends.set(ip, recent);
  if (ipSends.size > 10_000) ipSends.clear();
  return true;
}

/** Creates and sends a 6-digit login code, with resend, hourly and per-IP limits. */
export async function issueLoginCode(phone: string, ip = "unknown"): Promise<IssueResult> {
  const now = Date.now();
  // Local testing (codes shown on screen, no SMS cost) skips the hourly caps.
  const testing = process.env.NODE_ENV !== "production" && smsProvider() === "console";
  if (!testing && !ipAllowed(ip, now)) return { ok: false, error: "Too many codes requested from this network. Try again later." };
  const latest = await db.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (latest && now - latest.createdAt.getTime() < RESEND_GAP_MS) {
    return { ok: false, error: "Please wait 30 seconds before asking for a new code." };
  }
  const lastHour = await db.otpCode.count({ where: { phone, createdAt: { gte: new Date(now - 60 * 60 * 1000) } } });
  if (!testing && lastHour >= MAX_PER_HOUR) return { ok: false, error: "Too many codes requested. Try again in an hour." };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.otpCode.create({ data: { phone, codeHash: hashCode(phone, code), expiresAt: new Date(now + CODE_TTL_MS) } });
  try {
    await sendLoginCode(phone, code);
  } catch (e) {
    console.error("[sms] failed", e);
    return { ok: false, error: "We could not send the code. Please try again in a minute." };
  }
  const showCode = process.env.NODE_ENV !== "production" && smsProvider() === "console";
  return { ok: true, devCode: showCode ? code : undefined };
}

/** Checks a code. Each code allows 5 attempts and expires after 5 minutes. */
export async function verifyLoginCode(phone: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await db.otpCode.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return { ok: false, error: "This code has expired. Ask for a new one." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Too many wrong attempts. Ask for a new code." };
  const expected = Buffer.from(row.codeHash, "hex");
  const given = Buffer.from(hashCode(phone, code), "hex");
  if (!timingSafeEqual(expected, given)) {
    await db.otpCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: "That code is not right. Check the SMS and try again." };
  }
  await db.otpCode.update({ where: { id: row.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}
