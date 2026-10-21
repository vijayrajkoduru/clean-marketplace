"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAdminUser } from "@/lib/auth";
import { addEvent, STATUS } from "@/lib/booking";
import { parseList, rupees } from "@/lib/format";
import { notifyUser } from "@/lib/notify";
import { announceNewJob } from "@/lib/jobs";
import { unsettledBalance } from "@/lib/payouts";
import { restoreBookingExtras, rewardReferrer } from "@/lib/wallet";
import { fmt, plural } from "@/strings";

export type AdminState = { ok?: boolean; error?: string; message?: string };
type Result = { ok: true } | { ok: false; error: string };

async function admin() {
  return getAdminUser();
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/* ---------------- Bookings ---------------- */

export async function assignPartner(code: string, partnerId: string): Promise<Result> {
  if (!(await admin())) return { ok: false, error: "Admins only." };
  const booking = await db.booking.findUnique({ where: { code } });
  if (!booking) return { ok: false, error: "Booking not found." };
  if (![STATUS.CONFIRMED, STATUS.ASSIGNED].includes(booking.status as never)) return { ok: false, error: "Only confirmed bookings can be assigned." };
  const partner = await db.partner.findFirst({
    where: { id: partnerId, status: "APPROVED", cityId: booking.cityId, userId: { not: booking.customerId } },
    include: { user: { select: { name: true } } },
  });
  if (!partner) return { ok: false, error: "Choose an approved professional in the same city who is not the customer." };
  const previous = booking.partnerId && booking.partnerId !== partner.id ? await db.partner.findUnique({ where: { id: booking.partnerId }, select: { userId: true } }) : null;
  await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: booking.id }, data: { partnerId: partner.id, status: STATUS.ASSIGNED } });
    await addEvent(tx, booking.id, STATUS.ASSIGNED, "ADMIN", "Assigned by admin");
  });
  const at = booking.scheduledAt;
  await notifyUser(booking.customerId, (t, when) => ({
    title: t.proAssigned,
    body: fmt(t.proAssignedBody, { name: partner.user.name ?? t.verifiedPro, when: when(at), code }),
    link: `/bookings/${code}`,
  }));
  await notifyUser(partner.userId, (t, when) => ({ title: t.jobAssigned, body: fmt(t.jobAssignedBody, { code, when: when(at) }), link: "/partner" }));
  if (previous) await notifyUser(previous.userId, (t, when) => ({ title: t.jobReassigned, body: fmt(t.jobReassignedBody, { code, when: when(at) }), link: "/partner" }));
  refresh();
  return { ok: true };
}

export async function adminSetStatus(code: string, status: string, note: string): Promise<Result> {
  if (!(await admin())) return { ok: false, error: "Admins only." };
  if (!Object.values(STATUS).includes(status as never)) return { ok: false, error: "Unknown status." };
  const booking = await db.booking.findUnique({ where: { code } });
  if (!booking) return { ok: false, error: "Booking not found." };
  const data: { status: string; cancelReason?: string; paymentStatus?: string; partnerId?: null } = { status };
  if (status === STATUS.CANCELLED) {
    data.cancelReason = note || "Cancelled by support";
    if (booking.paymentStatus === "PAID") data.paymentStatus = "REFUND_DUE";
  }
  if (status === STATUS.CONFIRMED) data.partnerId = null;
  if (status === STATUS.COMPLETED && booking.paymentMethod === "PAY_AFTER_SERVICE") data.paymentStatus = "PAID";
  await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: booking.id }, data });
    await addEvent(tx, booking.id, status, "ADMIN", note || undefined);
    if (status === STATUS.CANCELLED) await restoreBookingExtras(tx, booking);
  });
  const link = `/bookings/${code}`;
  if (status === STATUS.CANCELLED) {
    const refund = booking.paymentStatus === "PAID";
    await notifyUser(booking.customerId, (t) => ({
      title: t.bookingCancelled,
      body: fmt(t.cancelledBySupportBody, { code }) + (note ? fmt(t.reasonPart, { note }) : "") + (refund ? t.refundPart : ""),
      link,
    }));
    if (booking.partnerId) {
      const p = await db.partner.findUnique({ where: { id: booking.partnerId }, select: { userId: true } });
      if (p) await notifyUser(p.userId, (t, when) => ({ title: t.jobCancelled, body: fmt(t.jobCancelledBody, { code, when: when(booking.scheduledAt) }), link: "/partner" }));
    }
  }
  if (status === STATUS.CONFIRMED) await announceNewJob(booking.id);
  if (status === STATUS.COMPLETED) {
    await notifyUser(booking.customerId, (t) => ({ title: t.serviceCompleted, body: fmt(t.serviceCompletedBody, { code }), link }));
    await rewardReferrer(booking.customerId);
  }
  refresh();
  return { ok: true };
}

export async function markRefunded(code: string): Promise<Result> {
  if (!(await admin())) return { ok: false, error: "Admins only." };
  const booking = await db.booking.findUnique({ where: { code } });
  if (!booking || booking.paymentStatus !== "REFUND_DUE") return { ok: false, error: "No refund is due on this booking." };
  await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: booking.id }, data: { paymentStatus: "REFUNDED" } });
    await addEvent(tx, booking.id, booking.status, "ADMIN", "Refund marked as sent");
  });
  await notifyUser(booking.customerId, (t) => ({ title: t.refundSent, body: fmt(t.refundSentBody, { amount: rupees(booking.total), code }), link: `/bookings/${code}` }));
  refresh();
  return { ok: true };
}

/* ---------------- Partners ---------------- */

export async function reviewPartner(partnerId: string, decision: "APPROVED" | "REJECTED" | "SUSPENDED"): Promise<Result> {
  if (!(await admin())) return { ok: false, error: "Admins only." };
  const partner = await db.partner.findUnique({ where: { id: partnerId }, include: { user: true } });
  if (!partner) return { ok: false, error: "Partner not found." };
  await db.$transaction([
    db.partner.update({ where: { id: partnerId }, data: { status: decision } }),
    db.user.update({
      where: { id: partner.userId },
      data: { role: partner.user.role === "ADMIN" ? "ADMIN" : decision === "APPROVED" ? "PARTNER" : "CUSTOMER" },
    }),
  ]);
  await notifyUser(partner.userId, (t) => {
    const message = {
      APPROVED: { title: t.approved, body: t.approvedBody },
      REJECTED: { title: t.rejected, body: t.rejectedBody },
      SUSPENDED: { title: t.suspended, body: t.suspendedBody },
    }[decision];
    return { ...message, link: decision === "APPROVED" ? "/partner" : "/partner/join" };
  });
  refresh();
  return { ok: true };
}

/* ---------------- Catalogue ---------------- */

const serviceSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  name: z.string().trim().min(3).max(80),
  summary: z.string().trim().min(10).max(160),
  description: z.string().trim().min(10).max(2000),
  image: z.string().trim().max(200).optional(),
  active: z.boolean(),
  featured: z.boolean(),
});

export async function saveService(_: AdminState, form: FormData): Promise<AdminState> {
  if (!(await admin())) return { error: "Admins only." };
  const parsed = serviceSchema.safeParse({
    id: form.get("id") || undefined,
    categoryId: form.get("categoryId"),
    name: form.get("name"),
    summary: form.get("summary"),
    description: form.get("description"),
    image: form.get("image") || undefined,
    active: form.get("active") === "on",
    featured: form.get("featured") === "on",
  });
  if (!parsed.success) return { error: `${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}` };
  const d = parsed.data;
  const data = {
    categoryId: d.categoryId,
    name: d.name,
    summary: d.summary,
    description: d.description,
    image: d.image || null,
    active: d.active,
    featured: d.featured,
    includes: JSON.stringify(lines(form.get("includes"))),
    excludes: JSON.stringify(lines(form.get("excludes"))),
  };
  if (d.id) {
    await db.service.update({ where: { id: d.id }, data });
  } else {
    let slug = slugify(d.name);
    if (await db.service.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
    const created = await db.service.create({ data: { ...data, slug, faqs: "[]", sortOrder: 99 } });
    updateTag("catalog");
    redirect(`/admin/services/${created.id}?created=1`);
  }
  updateTag("catalog");
  refresh();
  return { ok: true, message: "Service saved." };
}

const variantSchema = z.object({
  id: z.string().optional(),
  serviceId: z.string().min(1),
  name: z.string().trim().min(1).max(60),
  price: z.coerce.number().int().min(1).max(500000),
  mrp: z.union([z.literal(""), z.coerce.number().int().min(1).max(500000)]),
  durationMins: z.coerce.number().int().min(10).max(2880),
  active: z.boolean(),
  unit: z.enum(["job", "plate"]),
  minGuests: z.coerce.number().int().min(0).max(5000),
  maxGuests: z.coerce.number().int().min(0).max(5000),
});

export async function saveVariant(_: AdminState, form: FormData): Promise<AdminState> {
  if (!(await admin())) return { error: "Admins only." };
  const parsed = variantSchema.safeParse({
    id: form.get("id") || undefined,
    serviceId: form.get("serviceId"),
    name: form.get("name"),
    price: form.get("price"),
    mrp: form.get("mrp") ?? "",
    durationMins: form.get("durationMins"),
    active: form.get("active") === "on",
    unit: form.get("unit") || "job",
    minGuests: form.get("minGuests") || 0,
    maxGuests: form.get("maxGuests") || 0,
  });
  if (!parsed.success) return { error: `${parsed.error.issues[0]?.path.join(".")}: ${parsed.error.issues[0]?.message}` };
  const d = parsed.data;
  const mrp = d.mrp === "" ? null : d.mrp;
  if (mrp !== null && mrp < d.price) return { error: "The original price must be at least the selling price." };
  if (d.unit === "plate" && d.minGuests < 1) return { error: "Per-plate options need a minimum number of guests." };
  if (d.unit === "plate" && d.maxGuests && d.maxGuests < d.minGuests) return { error: "The maximum guests must be at least the minimum." };
  const data = {
    name: d.name,
    price: d.price,
    mrp,
    durationMins: d.durationMins,
    active: d.active,
    unit: d.unit,
    minGuests: d.unit === "plate" ? d.minGuests : 0,
    maxGuests: d.unit === "plate" ? d.maxGuests : 0,
  };
  if (d.id) await db.serviceVariant.update({ where: { id: d.id }, data });
  else await db.serviceVariant.create({ data: { ...data, serviceId: d.serviceId, sortOrder: 99 } });
  updateTag("catalog");
  refresh();
  return { ok: true, message: "Price option saved." };
}

export async function saveCategory(_: AdminState, form: FormData): Promise<AdminState> {
  if (!(await admin())) return { error: "Admins only." };
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim();
  const tagline = String(form.get("tagline") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  if (!id || name.length < 3 || tagline.length < 3) return { error: "Name and tagline are required." };
  await db.category.update({
    where: { id },
    data: { name, tagline, description, active: form.get("active") === "on", image: String(form.get("image") ?? "").trim() || null },
  });
  updateTag("catalog");
  refresh();
  return { ok: true, message: "Category saved." };
}

/* ---------------- Coupons ---------------- */

const couponSchema = z.object({
  code: z.string().trim().regex(/^[A-Z0-9]{3,20}$/, "Use 3 to 20 capital letters or digits."),
  description: z.string().trim().min(5).max(120),
  type: z.enum(["PERCENT", "FLAT"]),
  value: z.coerce.number().int().min(1).max(100000),
  minOrder: z.coerce.number().int().min(0).max(1000000),
  maxDiscount: z.union([z.literal(""), z.coerce.number().int().min(1)]),
  usageLimit: z.union([z.literal(""), z.coerce.number().int().min(1)]),
  expiresAt: z.string().optional(),
});

export async function saveCoupon(_: AdminState, form: FormData): Promise<AdminState> {
  if (!(await admin())) return { error: "Admins only." };
  const parsed = couponSchema.safeParse({
    code: String(form.get("code") ?? "").toUpperCase(),
    description: form.get("description"),
    type: form.get("type"),
    value: form.get("value"),
    minOrder: form.get("minOrder") || 0,
    maxDiscount: form.get("maxDiscount") ?? "",
    usageLimit: form.get("usageLimit") ?? "",
    expiresAt: String(form.get("expiresAt") ?? "") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  if (d.type === "PERCENT" && d.value > 90) return { error: "Percentage coupons can be at most 90%." };
  const data = {
    description: d.description,
    type: d.type,
    value: d.value,
    minOrder: d.minOrder,
    maxDiscount: d.maxDiscount === "" ? null : d.maxDiscount,
    usageLimit: d.usageLimit === "" ? null : d.usageLimit,
    expiresAt: d.expiresAt ? new Date(`${d.expiresAt}T23:59:59+05:30`) : null,
  };
  await db.coupon.upsert({ where: { code: d.code }, update: data, create: { ...data, code: d.code } });
  refresh();
  return { ok: true, message: `${d.code} saved.` };
}

export async function toggleCoupon(code: string): Promise<void> {
  if (!(await admin())) return;
  const c = await db.coupon.findUnique({ where: { code } });
  if (c) await db.coupon.update({ where: { code }, data: { active: !c.active } });
  refresh();
}

/* ---------------- Cities ---------------- */

export async function saveCity(_: AdminState, form: FormData): Promise<AdminState> {
  if (!(await admin())) return { error: "Admins only." };
  const name = String(form.get("name") ?? "").trim();
  const state = String(form.get("state") ?? "").trim();
  const capacity = Number(form.get("slotCapacity") ?? 4);
  if (name.length < 2 || state.length < 2) return { error: "Enter the city and state." };
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 200) return { error: "Bookings per slot must be between 1 and 200." };
  const slug = slugify(name);
  await db.city.upsert({ where: { slug }, update: { state, slotCapacity: capacity }, create: { slug, name, state, slotCapacity: capacity } });
  updateTag("cities");
  refresh();
  return { ok: true, message: `${name} saved.` };
}

export async function toggleCity(id: string): Promise<void> {
  if (!(await admin())) return;
  const c = await db.city.findUnique({ where: { id } });
  if (c) await db.city.update({ where: { id }, data: { active: !c.active } });
  updateTag("cities");
  refresh();
}

/** Which approved partners can do every service in a booking. */
export async function eligiblePartners(code: string) {
  if (!(await admin())) return [];
  const booking = await db.booking.findUnique({ where: { code }, include: { items: { include: { service: { select: { categoryId: true } } } } } });
  if (!booking) return [];
  const partners = await db.partner.findMany({ where: { status: "APPROVED", cityId: booking.cityId, userId: { not: booking.customerId } }, include: { user: true } });
  const needed = [...new Set(booking.items.map((i) => i.service.categoryId))];
  return partners
    .filter((p) => needed.every((c) => parseList(p.skills).includes(c)))
    .map((p) => ({ id: p.id, name: p.user.name ?? p.user.phone, phone: p.user.phone }));
}

/* ---------------- Payouts ---------------- */

/** Settles all of a professional's unsettled completed jobs in one payout record. */
export async function settlePartner(partnerId: string, _: AdminState, form: FormData): Promise<AdminState> {
  if (!(await admin())) return { error: "Admins only." };
  const reference = String(form.get("reference") ?? "").trim().slice(0, 80);
  const note = String(form.get("note") ?? "").trim().slice(0, 200);
  const partner = await db.partner.findUnique({ where: { id: partnerId }, select: { userId: true } });
  if (!partner) return { error: "Professional not found." };
  const payout = await db.$transaction(async (tx) => {
    const bal = await unsettledBalance(partnerId, tx);
    if (!bal.jobs) return null;
    const p = await tx.payout.create({
      data: { partnerId, earnings: bal.earnings, collected: bal.collected, amount: bal.balance, reference: reference || null, note: note || null },
    });
    await tx.booking.updateMany({ where: { id: { in: bal.bookingIds } }, data: { payoutId: p.id } });
    return { ...p, jobs: bal.jobs };
  });
  if (!payout) return { error: "Nothing to settle for this professional." };
  await notifyUser(partner.userId, (t) => {
    const jobs = plural(payout.jobs, t.jobOne, t.jobMany);
    const amount = rupees(Math.abs(payout.amount));
    const what = fmt(payout.amount > 0 ? t.payoutPaid : payout.amount < 0 ? t.payoutCollected : t.payoutEven, { amount, jobs });
    return { title: t.payoutSettled, body: what + (reference ? fmt(t.referencePart, { ref: reference }) : ""), link: "/partner" };
  });
  refresh();
  return { ok: true, message: "Settled." };
}
