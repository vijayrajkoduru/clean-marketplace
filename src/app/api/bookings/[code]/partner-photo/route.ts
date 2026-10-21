import { db } from "@/lib/db";
import { getAdminUser, getCurrentUser } from "@/lib/auth";
import { readUpload } from "@/lib/uploads";

/** The assigned professional's photo, for the customer of this booking (and admins). */
export async function GET(_: Request, ctx: RouteContext<"/api/bookings/[code]/partner-photo">) {
  const [user, admin] = await Promise.all([getCurrentUser(), getAdminUser()]);
  if (!user && !admin) return new Response("Log in first", { status: 401 });
  const { code } = await ctx.params;
  const b = await db.booking.findUnique({ where: { code }, select: { customerId: true, partner: { select: { photoFile: true } } } });
  if (!b || (b.customerId !== user?.id && !admin)) return new Response("Not found", { status: 404 });
  const file = b.partner?.photoFile ? await readUpload(b.partner.photoFile) : null;
  if (!file || !file.type.startsWith("image/")) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: { "content-type": file.type, "cache-control": "private, max-age=3600", "x-content-type-options": "nosniff" },
  });
}
