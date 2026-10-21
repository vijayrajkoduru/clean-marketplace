import { fail, ok, preflight } from "@/lib/api";
import { getWork, getWorkItem } from "@/lib/portfolio";

export const OPTIONS = preflight;

/** One photo from "Our work", with up to 6 more from the same category. */
export async function GET(_: Request, ctx: RouteContext<"/api/v1/portfolio/[id]">) {
  const { id } = await ctx.params;
  const item = await getWorkItem(id);
  if (!item) return fail("We could not find that photo.", 404);
  const more = (await getWork({ category: item.category?.slug, limit: 7 })).filter((x) => x.id !== item.id).slice(0, 6);
  return ok({ item, more });
}
