"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export type FormState = { ok?: boolean; error?: string; message?: string };

const profile = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(60),
  email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address.")]),
});

export async function saveProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in again." };
  const parsed = profile.safeParse({ name: form.get("name"), email: form.get("email") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name, email: parsed.data.email || null } });
  refresh();
  return { ok: true, message: "Profile saved." };
}

const address = z.object({
  label: z.string().trim().min(1).max(30),
  line1: z.string().trim().min(5, "Enter your house or flat number and street.").max(160),
  line2: z.string().trim().max(160).optional(),
  landmark: z.string().trim().max(100).optional(),
  cityId: z.string().min(1, "Choose your city."),
  pincode: z.string().regex(/^\d{6}$/, "Enter a 6-digit PIN code."),
});

export async function addAddress(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in again." };
  const parsed = address.safeParse({
    label: form.get("label") || "Home",
    line1: form.get("line1"),
    line2: form.get("line2") || undefined,
    landmark: form.get("landmark") || undefined,
    cityId: form.get("cityId"),
    pincode: form.get("pincode"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const city = await db.city.findFirst({ where: { id: parsed.data.cityId, active: true } });
  if (!city) return { error: "We do not serve that city yet." };
  await db.address.create({ data: { ...parsed.data, userId: user.id } });
  refresh();
  return { ok: true, message: "Address saved." };
}

export async function deleteAddress(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await db.address.deleteMany({ where: { id, userId: user.id } });
  refresh();
}
