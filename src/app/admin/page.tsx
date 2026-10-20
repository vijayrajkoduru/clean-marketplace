import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { expireStalePayments } from "@/lib/maintenance";
import { formatDateTime, rupees } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { PageTitle, AdminLoading } from "./ui";

const IST_OFFSET_MS = 330 * 60 * 1000;

function istDayStart(now: Date, addDays = 0): Date {
  const t = new Date(now.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + addDays) - IST_OFFSET_MS);
}

function istMonthStart(now: Date): Date {
  const t = new Date(now.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1) - IST_OFFSET_MS);
}

function Kpi({ label, value, href, tone = "" }: { label: string; value: string; href?: string; tone?: string }) {
  const body = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </>
  );
  return href ? <Link href={href} className="card p-4 transition hover:border-brand-300">{body}</Link> : <div className="card p-4">{body}</div>;
}

async function AdminHomeContent() {
  await requireRole("ADMIN", "/admin");
  await expireStalePayments();
  const now = new Date();
  const today = istDayStart(now);
  const tomorrow = istDayStart(now, 1);
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const [todayCount, unassigned, monthRevenue, monthCompleted, pendingPartners, refundsDue, customers, recent] = await Promise.all([
    db.booking.count({ where: { scheduledAt: { gte: today, lt: tomorrow }, status: { not: "CANCELLED" } } }),
    db.booking.findMany({
      where: { status: "CONFIRMED", partnerId: null, scheduledAt: { gte: now, lte: in48h } },
      orderBy: { scheduledAt: "asc" },
      include: { city: true, items: { select: { serviceName: true } } },
      take: 20,
    }),
    db.booking.aggregate({ where: { paymentStatus: "PAID", scheduledAt: { gte: istMonthStart(now) } }, _sum: { total: true } }),
    db.booking.count({ where: { status: "COMPLETED", scheduledAt: { gte: istMonthStart(now) } } }),
    db.partner.count({ where: { status: "PENDING" } }),
    db.booking.count({ where: { paymentStatus: "REFUND_DUE" } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.booking.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { city: true, customer: { select: { name: true, phone: true } } } }),
  ]);

  return (
    <div>
      <PageTitle title="Overview" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Visits today" value={String(todayCount)} href="/admin/bookings" />
        <Kpi label="Need a professional (48 h)" value={String(unassigned.length)} tone={unassigned.length ? "text-amber-700" : ""} href="/admin/bookings?status=CONFIRMED" />
        <Kpi label="Collected this month" value={rupees(monthRevenue._sum.total ?? 0)} />
        <Kpi label="Completed this month" value={String(monthCompleted)} />
        <Kpi label="Partner applications" value={String(pendingPartners)} tone={pendingPartners ? "text-amber-700" : ""} href="/admin/partners?status=PENDING" />
        <Kpi label="Refunds due" value={String(refundsDue)} tone={refundsDue ? "text-danger" : ""} href="/admin/bookings?payment=REFUND_DUE" />
        <Kpi label="Customers" value={String(customers)} href="/admin/customers" />
      </div>

      <section className="mt-8">
        <h2 className="font-bold">Needs a professional soon</h2>
        {unassigned.length ? (
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {unassigned.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/bookings/${b.code}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-surface">
                  <span><span className="font-semibold">{formatDateTime(b.scheduledAt)}</span> · {b.city.name} · {b.items.map((i) => i.serviceName).join(", ")}</span>
                  <span className="font-mono text-xs text-muted">#{b.code}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Every booking in the next 48 hours has a professional.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-bold">Latest bookings</h2>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-3">Booking</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Visit</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Total</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recent.map((b) => (
                <tr key={b.id} className="hover:bg-surface">
                  <td className="px-4 py-3"><Link href={`/admin/bookings/${b.code}`} className="font-mono font-semibold text-brand-700">{b.code}</Link></td>
                  <td className="px-4 py-3">{b.customer.name ?? b.customer.phone}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatDateTime(b.scheduledAt)} · {b.city.name}</td>
                  <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-4 py-3 text-right font-medium">{rupees(b.total)}</td>
                </tr>
              ))}
              {!recent.length ? <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">No bookings yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/** Own Suspense boundary, so moving between admin pages shows a placeholder instead of blocking. */
export default function AdminHome() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminHomeContent />
    </Suspense>
  );
}
