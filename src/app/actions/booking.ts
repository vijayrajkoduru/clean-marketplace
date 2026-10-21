"use server";

import { refresh } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import * as bookings from "@/lib/customer-bookings";
import type { PaymentProof, Result } from "@/lib/customer-bookings";

const signedOut: Result = { ok: false, error: "Booking not found." };

export async function cancelBooking(code: string, reason: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return signedOut;
  const r = await bookings.cancelBooking(user, code, reason);
  if (r.ok) refresh();
  return r;
}

export async function rescheduleBooking(code: string, iso: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return signedOut;
  const r = await bookings.rescheduleBooking(user, code, iso);
  if (r.ok) refresh();
  return r;
}

export async function rateBooking(code: string, rating: number, comment: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return signedOut;
  const r = await bookings.rateBooking(user, code, rating, comment);
  if (r.ok) refresh();
  return r;
}

export async function confirmOnlinePayment(code: string, payment: PaymentProof): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return signedOut;
  const r = await bookings.confirmOnlinePayment(user, code, payment);
  refresh();
  return r;
}
