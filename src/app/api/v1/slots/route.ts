import { fail, ok, preflight } from "@/lib/api";
import { getSlotDays } from "@/lib/slots";

export const OPTIONS = preflight;

/** Open visit slots for the next few days in a city: /api/v1/slots?cityId=... */
export async function GET(request: Request) {
  const cityId = new URL(request.url).searchParams.get("cityId");
  if (!cityId) return fail("Choose your city.");
  return ok({ days: await getSlotDays(cityId) });
}
