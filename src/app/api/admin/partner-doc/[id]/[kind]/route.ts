import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/auth";
import { readUpload } from "@/lib/uploads";

/** Shows a professional's uploaded ID proof or photo. Admins only. */
export async function GET(_: Request, ctx: RouteContext<"/api/admin/partner-doc/[id]/[kind]">) {
  if (!(await getAdminUser())) return new Response("Admins only", { status: 403 });
  const { id, kind } = await ctx.params;
  const partner = await db.partner.findUnique({ where: { id }, select: { idDocFile: true, photoFile: true } });
  const name = kind === "id" ? partner?.idDocFile : kind === "photo" ? partner?.photoFile : null;
  const file = name ? await readUpload(name) : null;
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.data), {
    headers: {
      "content-type": file.type,
      "content-disposition": "inline",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
    },
  });
}
