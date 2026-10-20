"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { addEvent, STATUS } from "@/lib/booking";
import { parseList } from "@/lib/format";
import { notifyBooking } from "@/lib/notify";

export type ApplyState = { ok?: boolean; error?: string };

const application = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(60),
  cityId: z.string().min(1, "Choose your city."),
  skills: z.array(z.string()).min(1, "Choose at least one service you are trained in."),
  experienceYears: z.coerce.number().int().min(0).max(50),
  idProofType: z.enum(["AADHAAR", "PAN", "DRIVING_LICENCE", "VOTER_ID"]),
  idProofLast4: z.string().regex(/^[A-Za-z0-9]{4}$/, "Enter the last 4 characters of your ID."),
  bio: z.string().trim().max(400).optional(),
});

export async function applyAsPartner(_: ApplyState, form: FormData): Promise<ApplyState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in with your mobile number first." };
  const parsed = application.safeParse({
    name: form.get("name"),
    cityId: form.get("cityId"),
    skills: form.getAll("skills").map(String),
    experienceYears: form.get("experienceYears"),
    idProofType: form.get("idProofType"),
    idProofLast4: form.get("idProofLast4"),
    bio: form.get("bio") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const d = parsed.data;
  const existing = await db.partner.findUnique({ where: { userId: user.id } });
  if (existing && existing.status !== "REJECTED") return { error: "You have already applied. We will call you soon." };
  const data = {
    cityId: d.cityId,
    skills: JSON.stringify(d.skills),
    experienceYears: d.experienceYears,
    idProofType: d.idProofType,
    idProofLast4: d.idProofLast4.toUpperCase(),
    bio: d.bio ?? null,
    status: "PENDING",
  };
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { name: d.name } }),
    existing
      ? db.partner.update({ where: { id: existing.id }, data })
      : db.partner.create({ data: { ...data, userId: user.id } }),
  ]);
  refresh();
  return { ok: true };
}

type Result = { ok: true } | { ok: false; error: string };

async function approvedPartner() {
  const user = await getCurrentUser();
  if (!user) return null;
  const partner = await db.partner.findUnique({ where: { userId: user.id } });
  return partner?.status === "APPROVED" ? partner : null;
}

/** Accepts an open job. Only one professional can win it. */
export async function acceptJob(code: string): Promise<Result> {
  const partner = await approvedPartner();
  if (!partner) return { ok: false, error: "Your partner account is not active." };
  const booking = await db.booking.findUnique({ where: { code }, include: { items: { include: { service: { select: { categoryId: true } } } } } });
  if (!booking || booking.cityId !== partner.cityId) return { ok: false, error: "Job not found." };
  const skills = parseList(partner.skills);
  if (!booking.items.every((i) => skills.includes(i.service.categoryId))) return { ok: false, error: "This job needs skills you have not listed." };
  const won = await db.booking.updateMany({
    where: { id: booking.id, status: STATUS.CONFIRMED, partnerId: null },
    data: { status: STATUS.ASSIGNED, partnerId: partner.id },
  });
  if (won.count === 0) return { ok: false, error: "Another professional has taken this job." };
  await db.bookingEvent.create({ data: { bookingId: booking.id, status: STATUS.ASSIGNED, actor: "PARTNER" } });
  const customer = await db.user.findUnique({ where: { id: booking.customerId } });
  if (customer) await notifyBooking(customer.phone, `A professional has been assigned to booking ${code}.`);
  refresh();
  return { ok: true };
}

async function ownJob(code: string) {
  const partner = await approvedPartner();
  if (!partner) return null;
  const booking = await db.booking.findFirst({ where: { code, partnerId: partner.id } });
  return booking ? { partner, booking } : null;
}

export async function markOnTheWay(code: string): Promise<Result> {
  const own = await ownJob(code);
  if (!own) return { ok: false, error: "Job not found." };
  if (own.booking.status !== STATUS.ASSIGNED) return { ok: false, error: "This job is not waiting to start." };
  await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: own.booking.id }, data: { status: STATUS.ON_THE_WAY } });
    await addEvent(tx, own.booking.id, STATUS.ON_THE_WAY, "PARTNER");
  });
  refresh();
  return { ok: true };
}

export async function startJob(code: string, startCode: string): Promise<Result> {
  const own = await ownJob(code);
  if (!own) return { ok: false, error: "Job not found." };
  if (own.booking.status !== STATUS.ON_THE_WAY && own.booking.status !== STATUS.ASSIGNED) return { ok: false, error: "This job cannot be started now." };
  if (startCode.trim() !== own.booking.startCode) return { ok: false, error: "The start code is not right. Ask the customer for the 4-digit code in their booking." };
  await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: own.booking.id }, data: { status: STATUS.IN_PROGRESS } });
    await addEvent(tx, own.booking.id, STATUS.IN_PROGRESS, "PARTNER");
  });
  refresh();
  return { ok: true };
}

export async function completeJob(code: string): Promise<Result> {
  const own = await ownJob(code);
  if (!own) return { ok: false, error: "Job not found." };
  if (own.booking.status !== STATUS.IN_PROGRESS) return { ok: false, error: "Start the job before completing it." };
  const collected = own.booking.paymentMethod === "PAY_AFTER_SERVICE";
  await db.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: own.booking.id },
      data: { status: STATUS.COMPLETED, paymentStatus: collected ? "PAID" : own.booking.paymentStatus },
    });
    await addEvent(tx, own.booking.id, STATUS.COMPLETED, "PARTNER", collected ? "Payment collected after service" : undefined);
  });
  const customer = await db.user.findUnique({ where: { id: own.booking.customerId } });
  if (customer) await notifyBooking(customer.phone, `Booking ${code} is complete. Please rate your professional.`);
  refresh();
  return { ok: true };
}
