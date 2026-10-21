import { readWorkPhoto } from "@/lib/work-photos";

/** Serves a photo from the "Our work" gallery. Names are random and never reused, so they cache forever. */
export async function GET(_: Request, ctx: RouteContext<"/media/work/[name]">) {
  const { name } = await ctx.params;
  const data = await readWorkPhoto(name);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
