import { bearerToken, ok, preflight } from "@/lib/api";
import { endSessionToken } from "@/lib/auth";

export const OPTIONS = preflight;

/** Ends the app's session. */
export async function POST(request: Request) {
  const token = bearerToken(request);
  if (token) await endSessionToken(token);
  return ok({ ok: true });
}
