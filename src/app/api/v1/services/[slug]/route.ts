import { fail, ok, preflight } from "@/lib/api";
import { getService, getServiceReviews } from "@/lib/catalog";

export const OPTIONS = preflight;

/** One service with its price options, what is included, FAQs and reviews; catering adds its menu. */
export async function GET(_: Request, ctx: RouteContext<"/api/v1/services/[slug]">) {
  const { slug } = await ctx.params;
  const service = await getService(slug);
  if (!service) return fail("We could not find that service.", 404);
  return ok({ ...service, reviews: await getServiceReviews(service.id) });
}
