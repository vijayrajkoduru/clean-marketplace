import { fail, preflight, result, withUser } from "@/lib/api";
import { acceptJob, completeJob, markOnTheWay, startJob } from "@/lib/partner-work";

export const OPTIONS = preflight;

/** Job steps for professionals: POST /partner/jobs/[code]/accept, /on-the-way, /start (with { startCode }) or /complete. */
export async function POST(request: Request, ctx: RouteContext<"/api/v1/partner/jobs/[code]/[action]">) {
  return withUser(request, async (user) => {
    const { code, action } = await ctx.params;
    switch (action) {
      case "accept":
        return result(await acceptJob(user, code));
      case "on-the-way":
        return result(await markOnTheWay(user, code));
      case "start": {
        const body = (await request.json().catch(() => ({}))) as { startCode?: unknown };
        return result(await startJob(user, code, String(body.startCode ?? "")));
      }
      case "complete":
        return result(await completeJob(user, code));
      default:
        return fail("Unknown action.", 404);
    }
  });
}
