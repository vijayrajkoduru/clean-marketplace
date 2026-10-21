"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/auth";
import { uploadedFile } from "@/lib/uploads";
import { removeWorkPhoto, saveWorkPhoto } from "@/lib/work-photos";
import type { AdminState } from "./admin";

const fields = z.object({
  title: z.string().trim().min(3, "Give the work a short title.").max(80, "Keep the title under 80 characters."),
  description: z.string().trim().max(600, "Keep the description under 600 characters."),
  categoryId: z.string().optional(),
  serviceId: z.string().optional(),
  cityId: z.string().optional(),
  doneOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  featured: z.boolean(),
});

/** Reads and checks the text fields of the work form. Links to a category, service or city must exist. */
async function readFields(form: FormData) {
  const parsed = fields.safeParse({
    title: String(form.get("title") ?? ""),
    description: String(form.get("description") ?? ""),
    categoryId: String(form.get("categoryId") ?? "") || undefined,
    serviceId: String(form.get("serviceId") ?? "") || undefined,
    cityId: String(form.get("cityId") ?? "") || undefined,
    doneOn: String(form.get("doneOn") ?? "") || undefined,
    featured: form.get("featured") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details." } as const;
  const d = parsed.data;
  const [category, service, city] = await Promise.all([
    d.categoryId ? db.category.findUnique({ where: { id: d.categoryId }, select: { id: true } }) : null,
    d.serviceId ? db.service.findUnique({ where: { id: d.serviceId }, select: { id: true, categoryId: true } }) : null,
    d.cityId ? db.city.findUnique({ where: { id: d.cityId }, select: { id: true } }) : null,
  ]);
  if (d.categoryId && !category) return { error: "Choose a category from the list." } as const;
  if (d.serviceId && !service) return { error: "Choose a service from the list." } as const;
  if (d.cityId && !city) return { error: "Choose a city from the list." } as const;
  if (service && d.categoryId && service.categoryId !== d.categoryId) return { error: "The service is not in the chosen category." } as const;
  // The date is the day the job was done, in India; it cannot be in the future.
  const doneOn = d.doneOn ? new Date(`${d.doneOn}T12:00:00+05:30`) : null;
  if (doneOn && (Number.isNaN(doneOn.getTime()) || doneOn.getTime() > Date.now() + 24 * 60 * 60 * 1000)) return { error: "The date cannot be in the future." } as const;
  return {
    data: {
      title: d.title,
      description: d.description,
      // A service implies its category.
      categoryId: service?.categoryId ?? category?.id ?? null,
      serviceId: service?.id ?? null,
      cityId: city?.id ?? null,
      doneOn,
      featured: d.featured,
    },
  } as const;
}

function changed() {
  updateTag("portfolio");
  refresh();
}

export async function addWork(_: AdminState, form: FormData): Promise<AdminState> {
  if (!(await getAdminUser())) return { error: "Admins only." };
  const f = await readFields(form);
  if ("error" in f) return { error: f.error };
  const photo = uploadedFile(form.get("photo"));
  if (!photo) return { error: "Add the photo of the finished work." };
  const before = uploadedFile(form.get("before"));
  const saved = await saveWorkPhoto(photo);
  if (!saved.ok) return { error: saved.error };
  const savedBefore = before ? await saveWorkPhoto(before) : null;
  if (savedBefore && !savedBefore.ok) {
    await removeWorkPhoto(saved.photo.name);
    return { error: `Before photo: ${savedBefore.error}` };
  }
  try {
    await db.portfolioItem.create({
      data: {
        ...f.data,
        image: saved.photo.name,
        width: saved.photo.width,
        height: saved.photo.height,
        beforeImage: savedBefore?.ok ? savedBefore.photo.name : null,
      },
    });
  } catch (e) {
    await removeWorkPhoto(saved.photo.name);
    if (savedBefore?.ok) await removeWorkPhoto(savedBefore.photo.name);
    throw e;
  }
  changed();
  return { ok: true, message: `"${f.data.title}" added to Our work.` };
}

export async function updateWork(id: string, _: AdminState, form: FormData): Promise<AdminState> {
  if (!(await getAdminUser())) return { error: "Admins only." };
  const f = await readFields(form);
  if ("error" in f) return { error: f.error };
  const r = await db.portfolioItem.updateMany({ where: { id }, data: f.data });
  if (!r.count) return { error: "That item no longer exists." };
  changed();
  return { ok: true, message: "Saved." };
}

export async function toggleWork(id: string): Promise<void> {
  if (!(await getAdminUser())) return;
  const w = await db.portfolioItem.findUnique({ where: { id }, select: { active: true } });
  if (w) await db.portfolioItem.update({ where: { id }, data: { active: !w.active } });
  changed();
}

export async function featureWork(id: string): Promise<void> {
  if (!(await getAdminUser())) return;
  const w = await db.portfolioItem.findUnique({ where: { id }, select: { featured: true } });
  if (w) await db.portfolioItem.update({ where: { id }, data: { featured: !w.featured } });
  changed();
}

export async function deleteWork(id: string): Promise<void> {
  if (!(await getAdminUser())) return;
  const w = await db.portfolioItem.findUnique({ where: { id }, select: { image: true, beforeImage: true } });
  if (!w) return;
  await db.portfolioItem.delete({ where: { id } });
  await removeWorkPhoto(w.image);
  await removeWorkPhoto(w.beforeImage);
  changed();
}
