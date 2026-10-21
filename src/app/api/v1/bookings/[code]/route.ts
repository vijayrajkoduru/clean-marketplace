import { fail, ok, preflight, withUser } from "@/lib/api";
import { bookingDetail } from "@/lib/app-views";

export const OPTIONS = preflight;

/** One of the signed-in customer's bookings, with progress, professional, bill and activity. */
export async function GET(request: Request, ctx: RouteContext<"/api/v1/bookings/[code]">) {
  return withUser(request, async (user) => {
    const { code } = await ctx.params;
    const booking = await bookingDetail(user, code);
    return booking ? ok(booking) : fail("Booking not found.", 404);
  });
}
