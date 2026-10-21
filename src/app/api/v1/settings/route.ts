import { ok, preflight } from "@/lib/api";
import { appSettings } from "@/lib/app-views";
import { getCities } from "@/lib/catalog";

export const OPTIONS = preflight;

/** Business settings and the cities served, for the app's first screen. */
export async function GET() {
  return ok({ ...appSettings(), cities: await getCities() });
}
