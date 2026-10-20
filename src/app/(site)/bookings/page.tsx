import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarDays, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { OPEN_STATUSES } from "@/lib/booking";
import { expireStalePayments } from "@/lib/maintenance";
import { formatDateTime, rupees } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";

export const metadata: Metadata = { title: "My bookings", robots: { index: false } };

type Row = { code: string; status: string; scheduledAt: Date; total: number; items: { serviceName: string; variantName: string; quantity: number }[] };

function BookingRow({ b }: { b: Row }) {
  const first = b.items[0];
  const more = b.items.length - 1;
  return (
    <li>
      <Link href={`/bookings/${b.code}`} className="flex items-center gap-4 p-4 transition hover:bg-surface sm:p-5">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <CalendarDays className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {first?.serviceName}
            {more > 0 ? <span className="font-normal text-muted"> + {more} more</span> : null}
          </p>
          <p className="mt-0.5 text-sm text-muted">{formatDateTime(b.scheduledAt)} · {rupees(b.total)} · #{b.code}</p>
        </div>
        <div className="hidden sm:block"><StatusBadge status={b.status} /></div>
        <ChevronRight className="size-5 text-muted" aria-hidden="true" />
      </Link>
      <div className="px-4 pb-4 sm:hidden"><StatusBadge status={b.status} /></div>
    </li>
  );
}

async function BookingsList() {
  const user = await requireUser("/bookings");
  await expireStalePayments();
  const bookings = await db.booking.findMany({
    where: { customerId: user.id },
    orderBy: { scheduledAt: "desc" },
    take: 100,
    select: { code: true, status: true, scheduledAt: true, total: true, items: { select: { serviceName: true, variantName: true, quantity: true } } },
  });
  if (!bookings.length) {
    return (
      <div className="card mt-6 p-10 text-center">
        <h2 className="text-lg font-bold">No bookings yet</h2>
        <p className="mt-2 text-sm text-muted">When you book a service, you can track it here.</p>
        <Link href="/services" className="btn-primary mt-6">Book a service</Link>
      </div>
    );
  }
  const open = new Set<string>(OPEN_STATUSES);
  const upcoming = bookings.filter((b) => open.has(b.status)).reverse();
  const past = bookings.filter((b) => !open.has(b.status));
  return (
    <div className="mt-6 space-y-8">
      {upcoming.length ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Upcoming</h2>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {upcoming.map((b) => <BookingRow key={b.code} b={b} />)}
          </ul>
        </section>
      ) : null}
      {past.length ? (
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Past</h2>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {past.map((b) => <BookingRow key={b.code} b={b} />)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export default function BookingsPage() {
  return (
    <div className="container-page max-w-4xl py-8 sm:py-10">
      <h1 className="text-2xl font-bold sm:text-3xl">My bookings</h1>
      <Suspense fallback={<div className="mt-6 h-64 animate-pulse rounded-2xl bg-surface" />}>
        <BookingsList />
      </Suspense>
    </div>
  );
}
