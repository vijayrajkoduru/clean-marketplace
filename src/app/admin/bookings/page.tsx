import { Suspense } from "react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { STATUS, STATUS_LABEL } from "@/lib/booking";
import { expireStalePayments } from "@/lib/maintenance";
import { formatDateTime, rupees } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { PageTitle, AdminLoading } from "../ui";

export const metadata = { title: "Bookings" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function AdminBookingsContent({ searchParams }: PageProps<"/admin/bookings">) {
  await requireRole("ADMIN", "/admin/bookings");
  await expireStalePayments();
  const sp = await searchParams;
  const status = one(sp.status);
  const cityId = one(sp.city);
  const payment = one(sp.payment);
  const q = one(sp.q).trim();
  const when = one(sp.when) || "upcoming";

  const where: Prisma.BookingWhereInput = {};
  if (status) where.status = status;
  if (cityId) where.cityId = cityId;
  if (payment) where.paymentStatus = payment;
  const now = new Date();
  if (when === "upcoming") where.scheduledAt = { gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) };
  if (when === "past") where.scheduledAt = { lt: now };
  if (q) {
    const digits = q.replace(/\D/g, "");
    where.OR = [{ code: q.toUpperCase() }, ...(digits.length >= 4 ? [{ customer: { phone: { contains: digits } } }] : [])];
  }

  const [bookings, cities] = await Promise.all([
    db.booking.findMany({
      where,
      orderBy: { scheduledAt: when === "past" ? "desc" : "asc" },
      take: 200,
      include: {
        city: true,
        customer: { select: { name: true, phone: true } },
        partner: { include: { user: { select: { name: true } } } },
        items: { select: { serviceName: true } },
      },
    }),
    db.city.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageTitle title="Bookings" />
      <form className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-6">
        <input name="q" defaultValue={q} placeholder="Booking code or phone" className="input xl:col-span-2" aria-label="Search" />
        <select name="when" defaultValue={when} className="input" aria-label="When">
          <option value="upcoming">Upcoming</option>
          <option value="past">Past</option>
          <option value="all">All dates</option>
        </select>
        <select name="status" defaultValue={status} className="input" aria-label="Status">
          <option value="">All statuses</option>
          {Object.values(STATUS).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
        <select name="city" defaultValue={cityId} className="input" aria-label="City">
          <option value="">All cities</option>
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-2">
          <select name="payment" defaultValue={payment} className="input" aria-label="Payment">
            <option value="">Any payment</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PAID">Paid</option>
            <option value="REFUND_DUE">Refund due</option>
            <option value="REFUNDED">Refunded</option>
          </select>
          <button className="btn-dark shrink-0">Filter</button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Visit</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Services</th>
              <th className="px-4 py-3">Professional</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {bookings.map((b) => (
              <tr key={b.id} className="align-top hover:bg-surface">
                <td className="px-4 py-3"><Link href={`/admin/bookings/${b.code}`} className="font-mono font-semibold text-brand-700">{b.code}</Link></td>
                <td className="whitespace-nowrap px-4 py-3">{formatDateTime(b.scheduledAt)}<span className="block text-xs text-muted">{b.city.name}</span></td>
                <td className="px-4 py-3">{b.customer.name ?? "-"}<span className="block text-xs text-muted">{b.customer.phone}</span></td>
                <td className="max-w-64 px-4 py-3">{b.items.map((i) => i.serviceName).join(", ")}</td>
                <td className="px-4 py-3">{b.partner?.user.name ?? <span className="text-muted">Not assigned</span>}</td>
                <td className="px-4 py-3"><StatusBadge status={b.status} />{b.paymentStatus === "REFUND_DUE" ? <span className="mt-1 block text-xs font-semibold text-danger">Refund due</span> : null}</td>
                <td className="px-4 py-3 text-right font-medium">{rupees(b.total)}<span className="block text-xs text-muted">{b.paymentMethod === "ONLINE" ? "Online" : "After service"} · {b.paymentStatus.toLowerCase().replace("_", " ")}</span></td>
              </tr>
            ))}
            {!bookings.length ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No bookings match these filters.</td></tr> : null}
          </tbody>
        </table>
      </div>
      {bookings.length === 200 ? <p className="mt-2 text-xs text-muted">Showing the first 200. Narrow the filters to see more.</p> : null}
    </div>
  );
}

/** Own Suspense boundary, so moving between admin pages shows a placeholder instead of blocking. */
export default function AdminBookings(props: PageProps<"/admin/bookings">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminBookingsContent {...props} />
    </Suspense>
  );
}
