import "server-only";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import type { SessionUser } from "./auth";
import { addressSchema, type NewAddress } from "./orders";
import { removeUpload } from "./uploads";

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

const OPEN_BOOKING = ["PENDING_PAYMENT", "CONFIRMED", "ASSIGNED", "ON_THE_WAY", "IN_PROGRESS"];
const ACTIVE_JOB = ["ASSIGNED", "ON_THE_WAY", "IN_PROGRESS"];

/**
 * Deletes an account at the customer's request (app stores require this in the app). The name,
 * email, phone number, addresses, credit, notifications and a professional's ID photos are
 * removed and every login ends. Finished bookings and their invoices stay, as tax law requires,
 * linked to the emptied account, with the phone number taken out of them. Signing up again with
 * the same number makes a new account.
 */
export async function deleteAccount(user: SessionUser): Promise<Result> {
  if (user.role === "ADMIN") return { ok: false, error: "Admin accounts cannot be deleted here." };
  const open = await db.booking.count({ where: { customerId: user.id, status: { in: OPEN_BOOKING } } });
  if (open) return { ok: false, error: "You have upcoming bookings. Cancel them or wait until they are done, then delete your account." };
  const partner = await db.partner.findUnique({ where: { userId: user.id }, select: { id: true, idDocFile: true, photoFile: true } });
  if (partner) {
    const jobs = await db.booking.count({ where: { partnerId: partner.id, status: { in: ACTIVE_JOB } } });
    if (jobs) return { ok: false, error: "You have accepted jobs that are not finished. Complete them first, then delete your account." };
    const unpaid = await db.booking.count({ where: { partnerId: partner.id, status: "COMPLETED", payoutId: null } });
    if (unpaid) return { ok: false, error: "We still owe you for finished jobs. Contact support so we can pay you, then delete your account." };
  }
  // Finished bookings keep the name and address their invoice was issued to, but not the phone number.
  const past = await db.booking.findMany({ where: { customerId: user.id }, select: { id: true, address: true } });
  const withoutPhone = past.flatMap((b) => {
    try {
      const snapshot = JSON.parse(b.address) as Record<string, unknown>;
      if (!("phone" in snapshot)) return [];
      delete snapshot.phone;
      return [db.booking.update({ where: { id: b.id }, data: { address: JSON.stringify(snapshot) } })];
    } catch {
      return [];
    }
  });
  const steps: Prisma.PrismaPromise<unknown>[] = [
    ...withoutPhone,
    db.session.deleteMany({ where: { userId: user.id } }),
    db.otpCode.deleteMany({ where: { phone: user.phone } }),
    db.address.deleteMany({ where: { userId: user.id } }),
    db.notification.deleteMany({ where: { userId: user.id } }),
    db.walletEntry.deleteMany({ where: { userId: user.id } }),
    db.membership.deleteMany({ where: { userId: user.id } }),
    db.user.update({
      where: { id: user.id },
      data: { phone: `deleted-${user.id}`, name: null, email: null, referralCode: null, referredById: null },
    }),
  ];
  if (partner) {
    steps.push(
      db.partner.update({
        where: { id: partner.id },
        data: { status: "SUSPENDED", bio: null, idProofType: null, idProofLast4: null, idDocFile: null, photoFile: null },
      }),
    );
  }
  await db.$transaction(steps);
  if (partner) await Promise.all([removeUpload(partner.idDocFile), removeUpload(partner.photoFile)]);
  return { ok: true };
}
