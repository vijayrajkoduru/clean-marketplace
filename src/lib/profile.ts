import "server-only";
import { z } from "zod";
import { db } from "./db";
import type { SessionUser } from "./auth";
import { addressSchema, type NewAddress } from "./orders";

/**
 * A customer's name, email and saved addresses. Shared by the website and the mobile app API.
 */

export type Result = { ok: true } | { ok: false; error: string };

const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(60),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address.")]),
});

export async function saveProfile(user: SessionUser, input: { name: string; email: string }): Promise<Result> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details." };
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name, email: parsed.data.email || null } });
  return { ok: true };
}

export async function addAddress(user: SessionUser, input: NewAddress): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details." };
  const city = await db.city.findFirst({ where: { id: parsed.data.cityId, active: true } });
  if (!city) return { ok: false, error: "We do not serve that city yet." };
  const created = await db.address.create({ data: { ...parsed.data, userId: user.id } });
  return { ok: true, id: created.id };
}

export async function deleteAddress(user: SessionUser, id: string): Promise<void> {
  await db.address.deleteMany({ where: { id, userId: user.id } });
}
