"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/auth";
import type { AdminState } from "./admin";

/* Admin editing of catering menus: courses, dishes and the per-package rules. */

function changed() {
  updateTag("catalog");
  refresh();
}

const courseSchema = z.object({
  name: z.string().trim().min(2, "Enter the course name.").max(60),
  fixed: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(999),
});

export async function saveCourse(serviceId: string, courseId: string | null, _: AdminState, form: FormData): Promise<AdminState> {
  if (!(await getAdminUser())) return { error: "Admins only." };
  const parsed = courseSchema.safeParse({ name: form.get("name"), fixed: form.get("fixed") === "on", sortOrder: form.get("sortOrder") || 0 });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (courseId) {
    const r = await db.menuCourse.updateMany({ where: { id: courseId, serviceId }, data: parsed.data });
    if (!r.count) return { error: "That course no longer exists." };
  } else {
    if (!(await db.service.findUnique({ where: { id: serviceId }, select: { id: true } }))) return { error: "Service not found." };
    await db.menuCourse.create({ data: { ...parsed.data, serviceId } });
  }
  changed();
  return { ok: true, message: "Course saved." };
}

export async function deleteCourse(courseId: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await getAdminUser())) return { ok: false, error: "Admins only." };
  await db.menuCourse.deleteMany({ where: { id: courseId } });
  changed();
  return { ok: true };
}

const dishSchema = z.object({
  name: z.string().trim().min(2, "Enter the dish name.").max(60),
  veg: z.boolean(),
  extraPrice: z.coerce.number().int().min(0).max(5000),
  active: z.boolean(),
});

export async function saveDish(courseId: string, dishId: string | null, _: AdminState, form: FormData): Promise<AdminState> {
  if (!(await getAdminUser())) return { error: "Admins only." };
  const parsed = dishSchema.safeParse({
    name: form.get("name"),
    veg: form.get("veg") === "on",
    extraPrice: form.get("extraPrice") || 0,
    active: dishId ? form.get("active") === "on" : true,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (dishId) {
    const r = await db.menuDish.updateMany({ where: { id: dishId, courseId }, data: parsed.data });
    if (!r.count) return { error: "That dish no longer exists." };
  } else {
    const course = await db.menuCourse.findUnique({ where: { id: courseId }, select: { id: true, _count: { select: { dishes: true } } } });
    if (!course) return { error: "That course no longer exists." };
    await db.menuDish.create({ data: { ...parsed.data, courseId, sortOrder: course._count.dishes } });
  }
  changed();
  return { ok: true, message: dishId ? "Saved." : `${parsed.data.name} added.` };
}

export async function deleteDish(dishId: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await getAdminUser())) return { ok: false, error: "Admins only." };
  // Bookings keep the dish names they were placed with, so removing a dish does not change them.
  await db.menuDish.deleteMany({ where: { id: dishId } });
  changed();
  return { ok: true };
}

const num = (v: FormDataEntryValue | null) => (v === null || String(v).trim() === "" ? null : Number(v));

/**
 * Saves a package's rules for every course at once. A course left blank is not part of the package.
 * Fields per course: inc_<id> (dishes in the price), min_<id>, max_<id>, extra_<id> (per plate per extra dish).
 */
export async function savePackageRules(variantId: string, _: AdminState, form: FormData): Promise<AdminState> {
  if (!(await getAdminUser())) return { error: "Admins only." };
  const variant = await db.serviceVariant.findUnique({ where: { id: variantId }, select: { id: true, serviceId: true, unit: true } });
  if (!variant || variant.unit !== "plate") return { error: "That package no longer exists." };
  const courses = await db.menuCourse.findMany({ where: { serviceId: variant.serviceId, fixed: false }, select: { id: true, name: true } });
  const keep: { courseId: string; included: number; minPick: number; maxPick: number; extraPrice: number }[] = [];
  for (const c of courses) {
    const [included, minPick, maxPick, extraPrice] = ["inc", "min", "max", "extra"].map((k) => num(form.get(`${k}_${c.id}`)));
    if (included === null && minPick === null && maxPick === null) continue;
    const inc = included ?? 0;
    const min = minPick ?? inc;
    const max = maxPick ?? Math.max(inc, min);
    const extra = extraPrice ?? 0;
    if ([inc, min, max, extra].some((n) => !Number.isInteger(n) || n < 0)) return { error: `${c.name}: use whole numbers of 0 or more.` };
    if (max < 1) return { error: `${c.name}: the most dishes to pick must be at least 1, or leave the course blank.` };
    if (min > max) return { error: `${c.name}: the fewest dishes cannot be more than the most.` };
    if (inc > max) return { error: `${c.name}: included dishes cannot be more than the most.` };
    keep.push({ courseId: c.id, included: inc, minPick: min, maxPick: max, extraPrice: extra });
  }
  if (!keep.length) return { error: "Add at least one course to this package." };
  await db.$transaction([
    db.menuRule.deleteMany({ where: { variantId } }),
    ...keep.map((r) => db.menuRule.create({ data: { ...r, variantId } })),
  ]);
  changed();
  return { ok: true, message: "Package menu saved." };
}
