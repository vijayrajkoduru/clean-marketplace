import "server-only";
import { z } from "zod";
import { fmt } from "@/strings";
import { db } from "./db";
import type { SessionUser } from "./auth";
import { addEvent, STATUS } from "./booking";
import { parseList } from "./format";
import { notifyAdmins, notifyUser } from "./notify";
import { removeUpload, saveUpload } from "./uploads";
import { rewardReferrer } from "./wallet";

/**
 * What professionals do: apply, then accept and work through jobs. Shared by the website and the
 * mobile app API.
 */

export type Result = { ok: true } | { ok: false; error: string };

export const applicationSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(60),
  cityId: z.string().min(1, "Choose your city."),
  skills: z.array(z.string()).min(1, "Choose at least one service you are trained in."),
  experienceYears: z.coerce.number().int().min(0).max(50),
  idProofType: z.enum(["AADHAAR", "PAN", "DRIVING_LICENCE", "VOTER_ID"]),
  idProofLast4: z.string().regex(/^[A-Za-z0-9]{4}$/, "Enter the last 4 characters of your ID."),
  bio: z.string().trim().max(400).optional(),
});

export type Application = z.input<typeof applicationSchema> & { idDoc: File | null; photo: File | null };

export async function applyAsPartner(user: SessionUser, input: Application): Promise<Result> {
  const parsed = applicationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details." };
  const d = parsed.data;
  const existing = await db.partner.findUnique({ where: { userId: user.id } });
  if (existing && existing.status !== "REJECTED") return { ok: false, error: "You have already applied. We will call you soon." };

  const { idDoc, photo } = input;
  if (!idDoc && !existing?.idDocFile) return { ok: false, error: "Upload a photo or PDF of your ID proof." };
  let idDocFile = existing?.idDocFile ?? null;
  let photoFile = existing?.photoFile ?? null;
  if (idDoc) {
    const saved = await saveUpload(idDoc, `${user.id}-id`);
    if (!saved.ok) return { ok: false, error: fmt("ID proof: {error}", { error: saved.error }) };
    await removeUpload(existing?.idDocFile);
    idDocFile = saved.name;
  }
  if (photo) {
    const saved = await saveUpload(photo, `${user.id}-photo`);
    if (!saved.ok) return { ok: false, error: fmt("Photo: {error}", { error: saved.error }) };
    await removeUpload(existing?.photoFile);
    photoFile = saved.name;
  }
  const data = {
    idDocFile,
    photoFile,
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
    existing ? db.partner.update({ where: { id: existing.id }, data }) : db.partner.create({ data: { ...data, userId: user.id } }),
  ]);
  await notifyAdmins({ title: "New professional application", body: `${d.name} applied in their city. Review the ID and skills.`, link: "/admin/partners?status=PENDING" });
  return { ok: true };
}

async function approvedPartner(user: SessionUser) {
  const partner = await db.partner.findUnique({ where: { userId: user.id } });
  return partner?.status === "APPROVED" ? partner : null;
}

/** Accepts an open job. Only one professional can win it. */
export async function acceptJob(user: SessionUser, code: string): Promise<Result> {
  const partner = await approvedPartner(user);
  if (!partner) return { ok: false, error: "Your partner account is not active." };
  const booking = await db.booking.findUnique({ where: { code }, include: { items: { include: { service: { select: { categoryId: true } } } } } });
  if (!booking || booking.cityId !== partner.cityId) return { ok: false, error: "Job not found." };
  // A professional never serves their own booking (they would earn the professional's share on it).
  if (booking.customerId === partner.userId) return { ok: false, error: "You cannot take a job that you booked yourself." };
  const skills = parseList(partner.skills);
  if (!booking.items.every((i) => skills.includes(i.service.categoryId))) return { ok: false, error: "This job needs skills you have not listed." };
  const won = await db.booking.updateMany({
    where: { id: booking.id, status: STATUS.CONFIRMED, partnerId: null },
    data: { status: STATUS.ASSIGNED, partnerId: partner.id },
  });
  if (won.count === 0) return { ok: false, error: "Another professional has taken this job." };
  await db.bookingEvent.create({ data: { bookingId: booking.id, status: STATUS.ASSIGNED, actor: "PARTNER" } });
  const me = await db.user.findUnique({ where: { id: partner.userId }, select: { name: true } });
  await notifyUser(booking.customerId, (t, when) => ({
    title: t.proAssigned,
    body: fmt(t.proAssignedBody, { name: me?.name ?? t.verifiedPro, when: when(booking.scheduledAt), code }),
    link: `/bookings/${code}`,
  }));
  return { ok: true };
}

async function ownJob(user: SessionUser, code: string) {
  const partner = await approvedPartner(user);
  if (!partner) return null;
  const booking = await db.booking.findFirst({ where: { code, partnerId: partner.id } });
  return booking ? { partner, booking } : null;
}

export async function markOnTheWay(user: SessionUser, code: string): Promise<Result> {
  const own = await ownJob(user, code);
  if (!own) return { ok: false, error: "Job not found." };
  if (own.booking.status !== STATUS.ASSIGNED) return { ok: false, error: "This job is not waiting to start." };
  await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: own.booking.id }, data: { status: STATUS.ON_THE_WAY } });
    await addEvent(tx, own.booking.id, STATUS.ON_THE_WAY, "PARTNER");
  });
  await notifyUser(own.booking.customerId, (t) => ({
    title: t.onTheWay,
    body: fmt(t.onTheWayBody, { startCode: own.booking.startCode, code }),
    link: `/bookings/${code}`,
  }));
  return { ok: true };
}

export async function startJob(user: SessionUser, code: string, startCode: string): Promise<Result> {
  const own = await ownJob(user, code);
  if (!own) return { ok: false, error: "Job not found." };
  if (own.booking.status !== STATUS.ON_THE_WAY && own.booking.status !== STATUS.ASSIGNED) return { ok: false, error: "This job cannot be started now." };
  if (startCode.trim() !== own.booking.startCode) return { ok: false, error: "The start code is not right. Ask the customer for the 4-digit code in their booking." };
  await db.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: own.booking.id }, data: { status: STATUS.IN_PROGRESS } });
    await addEvent(tx, own.booking.id, STATUS.IN_PROGRESS, "PARTNER");
  });
  await notifyUser(own.booking.customerId, (t) => ({ title: t.serviceStarted, body: fmt(t.serviceStartedBody, { code }), link: `/bookings/${code}` }));
  return { ok: true };
}

export async function completeJob(user: SessionUser, code: string): Promise<Result> {
  const own = await ownJob(user, code);
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
  await rewardReferrer(own.booking.customerId);
  await notifyUser(own.booking.customerId, (t) => ({ title: t.serviceCompleted, body: fmt(t.serviceCompletedBody, { code }), link: `/bookings/${code}` }));
  return { ok: true };
}
