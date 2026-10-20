import "server-only";
import { randomInt } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { site } from "@/config/site";

export const STATUS = {
  PENDING_PAYMENT: "PENDING_PAYMENT",
  CONFIRMED: "CONFIRMED",
  ASSIGNED: "ASSIGNED",
  ON_THE_WAY: "ON_THE_WAY",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;
export type BookingStatus = (typeof STATUS)[keyof typeof STATUS];

export const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  CONFIRMED: "Confirmed",
  ASSIGNED: "Professional assigned",
  ON_THE_WAY: "On the way",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Customer-facing progress steps, in order. */
export const PROGRESS: BookingStatus[] = ["CONFIRMED", "ASSIGNED", "ON_THE_WAY", "IN_PROGRESS", "COMPLETED"];

export const OPEN_STATUSES: BookingStatus[] = ["PENDING_PAYMENT", "CONFIRMED", "ASSIGNED", "ON_THE_WAY", "IN_PROGRESS"];

export function customerCanChange(b: { status: string; scheduledAt: Date }, now: Date = new Date()): boolean {
  const changeable = ["PENDING_PAYMENT", "CONFIRMED", "ASSIGNED"].includes(b.status);
  return changeable && b.scheduledAt.getTime() - now.getTime() > site.changeCutoffMinutes * 60 * 1000;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function newBookingCode(): string {
  let s = "CL";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  return s;
}

export function newStartCode(): string {
  return String(randomInt(0, 10000)).padStart(4, "0");
}

export function partnerEarning(subtotal: number): number {
  return Math.round((subtotal * site.partnerSharePercent) / 100);
}

export async function addEvent(
  tx: Prisma.TransactionClient,
  bookingId: string,
  status: string,
  actor: "CUSTOMER" | "PARTNER" | "ADMIN" | "SYSTEM",
  note?: string,
) {
  await tx.bookingEvent.create({ data: { bookingId, status, actor, note } });
}

export type AddressSnapshot = {
  name: string;
  phone: string;
  label: string;
  line1: string;
  line2?: string | null;
  landmark?: string | null;
  city: string;
  pincode: string;
};

export function formatAddress(a: AddressSnapshot): string {
  return [a.line1, a.line2, a.landmark, `${a.city} ${a.pincode}`].filter(Boolean).join(", ");
}
