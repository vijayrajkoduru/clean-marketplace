import { ok, preflight, withUser } from "@/lib/api";
import { partnerDashboard } from "@/lib/app-views";

export const OPTIONS = preflight;

/** The professional's dashboard. status is null before applying, then PENDING, APPROVED, REJECTED or SUSPENDED. */
export async function GET(request: Request) {
  return withUser(request, async (user) => ok(await partnerDashboard(user)));
}
