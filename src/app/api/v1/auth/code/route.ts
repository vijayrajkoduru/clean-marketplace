import { z } from "zod";
import { fail, ok, preflight, readBody } from "@/lib/api";
import { clientIp, issueLoginCode, PHONE_RE } from "@/lib/otp";

export const OPTIONS = preflight;

/** Sends a 6-digit login code by SMS. */
export async function POST(request: Request) {
  const body = await readBody(request, z.object({ phone: z.string() }));
  if ("response" in body) return body.response;
  const phone = body.data.phone.replace(/\D/g, "").slice(-10);
  if (!PHONE_RE.test(phone)) return fail("Enter a 10-digit mobile number that starts with 6, 7, 8 or 9.");
  const r = await issueLoginCode(phone, clientIp(request.headers));
  if (!r.ok) return fail(r.error, 429);
  // devCode is only set when SMS is not set up yet (SMS_PROVIDER=console), for testing.
  return ok({ ok: true, phone, devCode: r.devCode ?? null });
}
