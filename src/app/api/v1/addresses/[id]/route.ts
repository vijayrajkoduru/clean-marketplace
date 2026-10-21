import { ok, preflight, withUser } from "@/lib/api";
import { deleteAddress } from "@/lib/profile";

export const OPTIONS = preflight;

/** Removes a saved address. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/v1/addresses/[id]">) {
  return withUser(request, async (user) => {
    const { id } = await ctx.params;
    await deleteAddress(user, id);
    return ok({ ok: true });
  });
}
