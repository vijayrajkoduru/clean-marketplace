"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import * as profile from "@/lib/profile";

export type FormState = { ok?: boolean; error?: string; message?: string };

export async function saveProfile(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in again." };
  const r = await profile.saveProfile(user, { name: String(form.get("name") ?? ""), email: String(form.get("email") ?? "") });
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: true, message: "Profile saved." };
}

export async function addAddress(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in again." };
  const r = await profile.addAddress(user, {
    label: String(form.get("label") || "Home"),
    line1: String(form.get("line1") ?? ""),
    line2: String(form.get("line2") ?? "") || undefined,
    landmark: String(form.get("landmark") ?? "") || undefined,
    cityId: String(form.get("cityId") ?? ""),
    pincode: String(form.get("pincode") ?? ""),
  });
  if (!r.ok) return { error: r.error };
  refresh();
  return { ok: true, message: "Address saved." };
}

export async function deleteAddress(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await profile.deleteAddress(user, id);
  refresh();
}
