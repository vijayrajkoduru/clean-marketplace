import "server-only";
import { io } from "next/cache";
import { site } from "@/config/site";
import { db } from "./db";

/** India has no daylight saving, so IST is always UTC+05:30. */
const IST_OFFSET_MS = 330 * 60 * 1000;

function istParts(d: Date) {
  const t = new Date(d.getTime() + IST_OFFSET_MS);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth(), d: t.getUTCDate(), h: t.getUTCHours(), min: t.getUTCMinutes() };
}

function istToUtc(y: number, m: number, d: number, h: number, min: number): Date {
  return new Date(Date.UTC(y, m, d, h, min) - IST_OFFSET_MS);
}

export type Slot = { iso: string; label: string; available: boolean };
export type SlotDay = { key: string; weekday: string; day: string; slots: Slot[] };

const weekdayFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short" });
const dayFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true });

function slotStarts(now: Date): Date[] {
  const { firstHour, lastHour, stepMinutes, leadMinutes, days } = site.slots;
  const today = istParts(now);
  const earliest = now.getTime() + leadMinutes * 60 * 1000;
  const out: Date[] = [];
  for (let i = 0; i < days; i++) {
    for (let mins = firstHour * 60; mins <= lastHour * 60; mins += stepMinutes) {
      const t = istToUtc(today.y, today.m, today.d + i, Math.floor(mins / 60), mins % 60);
      if (t.getTime() >= earliest) out.push(t);
    }
  }
  return out;
}

/** Bookable slots for the next few days in a city, with full slots marked unavailable. */
export async function getSlotDays(cityId: string, now?: Date): Promise<SlotDay[]> {
  await io();
  now ??= new Date();
  const starts = slotStarts(now);
  if (!starts.length) return [];
  const city = await db.city.findUnique({ where: { id: cityId }, select: { slotCapacity: true } });
  const capacity = city?.slotCapacity ?? 0;
  const taken = await db.booking.groupBy({
    by: ["scheduledAt"],
    where: {
      cityId,
      status: { not: "CANCELLED" },
      scheduledAt: { gte: starts[0], lte: starts[starts.length - 1] },
    },
    _count: { _all: true },
  });
  const takenAt = new Map(taken.map((t) => [t.scheduledAt.getTime(), t._count._all]));
  const days = new Map<string, SlotDay>();
  for (const s of starts) {
    const p = istParts(s);
    const key = `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
    if (!days.has(key)) days.set(key, { key, weekday: weekdayFmt.format(s), day: dayFmt.format(s), slots: [] });
    days.get(key)!.slots.push({
      iso: s.toISOString(),
      label: timeFmt.format(s),
      available: (takenAt.get(s.getTime()) ?? 0) < capacity,
    });
  }
  return [...days.values()];
}

/** True when the time is a real slot, far enough ahead, and the city still has capacity. */
export async function isSlotBookable(cityId: string, when: Date, now?: Date, ignoreBookingId?: string): Promise<boolean> {
  await io();
  now ??= new Date();
  if (Number.isNaN(when.getTime())) return false;
  const valid = slotStarts(now).some((s) => s.getTime() === when.getTime());
  if (!valid) return false;
  const city = await db.city.findUnique({ where: { id: cityId }, select: { slotCapacity: true, active: true } });
  if (!city?.active) return false;
  const count = await db.booking.count({
    where: { cityId, scheduledAt: when, status: { not: "CANCELLED" }, ...(ignoreBookingId ? { NOT: { id: ignoreBookingId } } : {}) },
  });
  return count < city.slotCapacity;
}
