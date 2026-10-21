import { z } from "zod";
import { fail, ok, preflight, readBody } from "@/lib/api";
import { createSession, userForToken } from "@/lib/auth";
import { signInWithCode } from "@/lib/login";

export const OPTIONS = preflight;

/** Checks the login code and returns a session token for the app. */
export async function POST(request: Request) {
  const body = await readBody(request, z.object({ phone: z.string(), code: z.string(), referralCode: z.string().optional() }));
  if ("response" in body) return body.response;
  const phone = body.data.phone.replace(/\D/g, "").slice(-10);
  const r = await signInWithCode(phone, body.data.code.replace(/\D/g, ""), body.data.referralCode);
  if (!r.ok) return fail(r.error);
  const session = await createSession(r.userId);
  const user = await userForToken(session.token);
  return ok({ token: session.token, expiresAt: session.expiresAt.toISOString(), user });
}
