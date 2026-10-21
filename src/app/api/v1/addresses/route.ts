import { db } from "@/lib/db";
import { fail, ok, preflight, readBody, withUser } from "@/lib/api";
import { addressSchema } from "@/lib/orders";
import { addAddress } from "@/lib/profile";

export const OPTIONS = preflight;

/** Saved addresses. */
export async function GET(request: Request) {
  return withUser(request, async (user) => {
    const rows = await db.address.findMany({ where: { userId: user.id }, include: { city: { select: { name: true, state: true, active: true } } }, orderBy: { createdAt: "desc" } });
    return ok({
      addresses: rows.map((a) => ({
        id: a.id,
        label: a.label,
        line1: a.line1,
        line2: a.line2,
        landmark: a.landmark,
        pincode: a.pincode,
        cityId: a.cityId,
        cityName: a.city.name,
        state: a.city.state,
        cityActive: a.city.active,
      })),
    });
  });
}

/** Saves a new address. */
export async function POST(request: Request) {
  return withUser(request, async (user) => {
    const body = await readBody(request, addressSchema);
    if ("response" in body) return body.response;
    const r = await addAddress(user, body.data);
    return r.ok ? ok({ ok: true, id: r.id }, 201) : fail(r.error);
  });
}
