import { z } from "zod";
import { fail, preflight, readBody, result, withUser } from "@/lib/api";
import { cancelBooking, confirmOnlinePayment, rateBooking, rescheduleBooking } from "@/lib/customer-bookings";

export const OPTIONS = preflight;

const schemas = {
  cancel: z.object({ reason: z.string().max(200).default("") }),
  reschedule: z.object({ slot: z.string().min(1, "Pick a new time.") }),
  rate: z.object({ rating: z.number().int().min(1, "Choose 1 to 5 stars.").max(5, "Choose 1 to 5 stars."), comment: z.string().max(500).default("") }),
  payment: z.object({ orderId: z.string(), paymentId: z.string(), signature: z.string() }),
};

/**
 * Changes to a booking: POST /bookings/[code]/cancel, /reschedule, /rate, or /payment (the
 * Razorpay result from the app's checkout).
 */
export async function POST(request: Request, ctx: RouteContext<"/api/v1/bookings/[code]/[action]">) {
  return withUser(request, async (user) => {
    const { code, action } = await ctx.params;
    switch (action) {
      case "cancel": {
        const body = await readBody(request, schemas.cancel);
        return "response" in body ? body.response : result(await cancelBooking(user, code, body.data.reason));
      }
      case "reschedule": {
        const body = await readBody(request, schemas.reschedule);
        return "response" in body ? body.response : result(await rescheduleBooking(user, code, body.data.slot));
      }
      case "rate": {
        const body = await readBody(request, schemas.rate);
        return "response" in body ? body.response : result(await rateBooking(user, code, body.data.rating, body.data.comment));
      }
      case "payment": {
        const body = await readBody(request, schemas.payment);
        return "response" in body ? body.response : result(await confirmOnlinePayment(user, code, body.data));
      }
      default:
        return fail("Unknown action.", 404);
    }
  });
}
