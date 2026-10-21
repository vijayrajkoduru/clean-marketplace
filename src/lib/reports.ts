import "server-only";
import { io } from "next/cache";
import { db } from "./db";
import { partnerEarning } from "./booking";

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

export const RANGES = {
  "7d": "Last 7 days",
  month: "This month",
  "last-month": "Last month",
  "90d": "Last 90 days",
  year: "This financial year",
  all: "All time",
} as const;
export type RangeKey = keyof typeof RANGES;

function istMidnight(d: Date, addDays = 0): Date {
  const t = new Date(d.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + addDays) - IST_OFFSET_MS);
}

/** Start (inclusive) and end (exclusive) of a range, by visit date, in IST. */
export async function rangeBounds(key: RangeKey): Promise<{ from: Date | null; to: Date }> {
  await io();
  const now = new Date();
  const t = new Date(now.getTime() + IST_OFFSET_MS);
  const y = t.getUTCFullYear();
  const m = t.getUTCMonth();
  const at = (yy: number, mm: number, dd = 1) => new Date(Date.UTC(yy, mm, dd) - IST_OFFSET_MS);
  const tomorrow = istMidnight(now, 1);
  switch (key) {
    case "7d": return { from: istMidnight(now, -6), to: tomorrow };
    case "month": return { from: at(y, m), to: tomorrow };
    case "last-month": return { from: at(y, m - 1), to: at(y, m) };
    case "90d": return { from: istMidnight(now, -89), to: tomorrow };
    case "year": return { from: at(m >= 3 ? y : y - 1, 3), to: tomorrow };
    default: {
      // All time also covers visits booked for later dates.
      const last = await db.booking.findFirst({ orderBy: { scheduledAt: "desc" }, select: { scheduledAt: true } });
      const end = last ? istMidnight(last.scheduledAt, 1) : tomorrow;
      return { from: null, to: end > tomorrow ? end : tomorrow };
    }
  }
}

export function istDayKey(d: Date): string {
  return new Date(d.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** Bookings with a visit date in the range, with what the reports need. */
export async function bookingsInRange(key: RangeKey) {
  const { from, to } = await rangeBounds(key);
  return db.booking.findMany({
    where: { scheduledAt: { ...(from ? { gte: from } : {}), lt: to } },
    orderBy: { scheduledAt: "asc" },
    include: {
      city: { select: { name: true } },
      customer: { select: { id: true, name: true, phone: true, createdAt: true } },
      partner: { select: { id: true, user: { select: { name: true } } } },
      items: { select: { serviceName: true, variantName: true, quantity: true, guests: true, unitPrice: true, service: { select: { category: { select: { name: true } } } } } },
      review: { select: { rating: true } },
    },
  });
}

export type ReportBooking = Awaited<ReturnType<typeof bookingsInRange>>[number];

type Row = { label: string; bookings: number; value: number };

function addTo(map: Map<string, Row>, label: string, value: number, count = 1) {
  const r = map.get(label) ?? { label, bookings: 0, value: 0 };
  r.bookings += count;
  r.value += value;
  map.set(label, r);
}

/** All the numbers on the reports page, from one list of bookings. */
export function summarize(bookings: ReportBooking[], range: { from: Date | null; to: Date }) {
  const live = bookings.filter((b) => b.status !== "CANCELLED" && b.status !== "PENDING_PAYMENT");
  const done = bookings.filter((b) => b.status === "COMPLETED");
  const cancelled = bookings.filter((b) => b.status === "CANCELLED");
  const value = done.reduce((n, b) => n + b.total, 0);
  const earnings = done.reduce((n, b) => n + partnerEarning(b.subtotal), 0);
  const customerIds = new Set(live.map((b) => b.customerId));
  const perCustomer = new Map<string, number>();
  for (const b of live) perCustomer.set(b.customerId, (perCustomer.get(b.customerId) ?? 0) + 1);
  const repeat = [...perCustomer.values()].filter((n) => n > 1).length;
  const newCustomers = new Set(live.filter((b) => !range.from || b.customer.createdAt >= range.from).map((b) => b.customerId)).size;

  const byCity = new Map<string, Row>();
  const byCategory = new Map<string, Row>();
  const byService = new Map<string, Row>();
  for (const b of done) {
    addTo(byCity, b.city.name, b.total);
    const cats = new Set<string>();
    for (const i of b.items) {
      const line = i.unitPrice * i.quantity;
      addTo(byService, i.serviceName, line, 1);
      addTo(byCategory, i.service.category.name, line, cats.has(i.service.category.name) ? 0 : 1);
      cats.add(i.service.category.name);
    }
  }

  const byDay = new Map<string, number>();
  for (const b of live) byDay.set(istDayKey(b.scheduledAt), (byDay.get(istDayKey(b.scheduledAt)) ?? 0) + 1);
  const days: { day: string; count: number }[] = [];
  const start = range.from ?? (live[0]?.scheduledAt ?? range.to);
  // Show at least two weeks so a few bookings still read as a chart.
  const spanDays = Math.min(120, Math.max(14, Math.round((range.to.getTime() - start.getTime()) / DAY)));
  for (let i = spanDays - 1; i >= 0; i--) {
    const key = istDayKey(new Date(range.to.getTime() - (i + 1) * DAY + DAY / 2));
    days.push({ day: key, count: byDay.get(key) ?? 0 });
  }

  const pros = new Map<string, { name: string; jobs: number; earnings: number; ratingSum: number; ratings: number }>();
  for (const b of done) {
    if (!b.partner) continue;
    const p = pros.get(b.partner.id) ?? { name: b.partner.user.name ?? "Professional", jobs: 0, earnings: 0, ratingSum: 0, ratings: 0 };
    p.jobs += 1;
    p.earnings += partnerEarning(b.subtotal);
    if (b.review) { p.ratingSum += b.review.rating; p.ratings += 1; }
    pros.set(b.partner.id, p);
  }

  const sortRows = (m: Map<string, Row>) => [...m.values()].sort((a, b) => b.value - a.value);
  return {
    totals: {
      bookings: live.length,
      completed: done.length,
      cancelled: cancelled.length,
      cancelRate: bookings.length ? Math.round((cancelled.length / bookings.length) * 100) : 0,
      value,
      share: value - earnings,
      average: done.length ? Math.round(value / done.length) : 0,
      customers: customerIds.size,
      newCustomers,
      repeatRate: customerIds.size ? Math.round((repeat / customerIds.size) * 100) : 0,
    },
    byCity: sortRows(byCity),
    byCategory: sortRows(byCategory),
    topServices: sortRows(byService).slice(0, 10),
    days,
    pros: [...pros.values()].sort((a, b) => b.jobs - a.jobs).slice(0, 10),
  };
}
