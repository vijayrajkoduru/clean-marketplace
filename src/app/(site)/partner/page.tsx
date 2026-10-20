import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { MapPin, Phone, StickyNote } from "lucide-react";
import { site } from "@/config/site";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatAddress, partnerEarning, type AddressSnapshot } from "@/lib/booking";
import { formatDateTime, formatDuration, parseList, rupees } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { AcceptJob, JobActions } from "./job-actions";

export const metadata: Metadata = { title: "Partner dashboard", robots: { index: false } };

const IST_OFFSET_MS = 330 * 60 * 1000;

function monthStartIst(now: Date): Date {
  const t = new Date(now.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1) - IST_OFFSET_MS);
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

type JobItem = { serviceName: string; variantName: string; quantity: number; durationMins: number };

function JobItems({ items }: { items: JobItem[] }) {
  return (
    <ul className="mt-2 space-y-0.5 text-sm">
      {items.map((i, n) => (
        <li key={n}>
          {i.serviceName} <span className="text-muted">· {i.variantName}{i.quantity > 1 ? ` x${i.quantity}` : ""} · {formatDuration(i.durationMins * i.quantity)}</span>
        </li>
      ))}
    </ul>
  );
}

async function Dashboard() {
  const user = await requireUser("/partner");
  const partner = await db.partner.findUnique({ where: { userId: user.id }, include: { city: true } });
  if (!partner) redirect("/partner/join");

  if (partner.status !== "APPROVED") {
    return (
      <div className="card mt-6 max-w-xl p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Application status</h2>
          <StatusBadge status={partner.status} />
        </div>
        <p className="mt-2 text-sm text-muted">
          {partner.status === "PENDING"
            ? "Our team will call you to verify your ID and skills. You can take jobs once you are approved."
            : `Your partner account is not active. Contact ${site.supportEmail} for help.`}
        </p>
        <Link href="/partner/join" className="btn-outline mt-4">View application</Link>
      </div>
    );
  }

  const now = new Date();
  const skills = parseList(partner.skills);
  const [openRaw, mine, completedThisMonth, recent, ratingAgg] = await Promise.all([
    db.booking.findMany({
      where: { cityId: partner.cityId, status: "CONFIRMED", partnerId: null, scheduledAt: { gt: now } },
      orderBy: { scheduledAt: "asc" },
      take: 50,
      include: { items: { include: { service: { select: { categoryId: true } } } } },
    }),
    db.booking.findMany({
      where: { partnerId: partner.id, status: { in: ["ASSIGNED", "ON_THE_WAY", "IN_PROGRESS"] } },
      orderBy: { scheduledAt: "asc" },
      include: { items: true },
    }),
    db.booking.findMany({
      where: { partnerId: partner.id, status: "COMPLETED", scheduledAt: { gte: monthStartIst(now) } },
      select: { subtotal: true },
    }),
    db.booking.findMany({
      where: { partnerId: partner.id, status: "COMPLETED" },
      orderBy: { scheduledAt: "desc" },
      take: 10,
      include: { items: true, review: { select: { rating: true } } },
    }),
    db.review.aggregate({ where: { partnerId: partner.id }, _avg: { rating: true }, _count: { _all: true } }),
  ]);

  const open = openRaw.filter((b) => b.items.every((i) => skills.includes(i.service.categoryId)));
  const earned = completedThisMonth.reduce((n, b) => n + partnerEarning(b.subtotal), 0);
  const rating = ratingAgg._avg.rating;

  return (
    <div className="mt-6 space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Earned this month" value={rupees(earned)} />
        <Stat label="Jobs this month" value={String(completedThisMonth.length)} />
        <Stat label="Upcoming jobs" value={String(mine.length)} />
        <Stat label="Your rating" value={rating ? `${rating.toFixed(1)} (${ratingAgg._count._all})` : "No ratings"} />
      </div>

      <section>
        <h2 className="text-lg font-bold">My jobs</h2>
        {mine.length ? (
          <ul className="mt-3 space-y-3">
            {mine.map((b) => {
              const a = JSON.parse(b.address) as AddressSnapshot;
              return (
                <li key={b.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{formatDateTime(b.scheduledAt)}</p>
                      <p className="text-xs text-muted">#{b.code}</p>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <JobItems items={b.items} />
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <p className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden="true" /><span><span className="font-medium">{a.name}</span><span className="block text-muted">{formatAddress(a)}</span></span></p>
                    <p className="flex items-center gap-2"><Phone className="size-4 shrink-0 text-brand-700" aria-hidden="true" /><a href={`tel:+91${a.phone}`} className="font-medium text-brand-700">+91 {a.phone}</a></p>
                  </div>
                  {b.notes ? <p className="mt-3 flex gap-2 rounded-xl bg-surface p-3 text-sm text-muted"><StickyNote className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{b.notes}</p> : null}
                  <p className="mt-3 text-sm">
                    {b.paymentMethod === "PAY_AFTER_SERVICE" && b.paymentStatus !== "PAID" ? (
                      <>Collect <span className="font-bold">{rupees(b.total)}</span> after the job.</>
                    ) : (
                      <span className="text-emerald-700">Customer has paid online. Do not collect money.</span>
                    )}
                    <span className="text-muted"> Your earning: {rupees(partnerEarning(b.subtotal))}</span>
                  </p>
                  <JobActions code={b.code} status={b.status} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No jobs right now. Accept an open job below.</p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-bold">Open jobs in {partner.city.name}</h2>
        {open.length ? (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {open.map((b) => {
              const a = JSON.parse(b.address) as AddressSnapshot;
              return (
                <li key={b.id} className="card flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{formatDateTime(b.scheduledAt)}</p>
                    <p className="font-bold text-brand-700">{rupees(partnerEarning(b.subtotal))}</p>
                  </div>
                  <JobItems items={b.items} />
                  <p className="mt-2 text-sm text-muted">{[a.line2, a.city, a.pincode].filter(Boolean).join(", ")}</p>
                  <div className="mt-4"><AcceptJob code={b.code} /></div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">No open jobs that match your skills right now. New jobs appear here as customers book.</p>
        )}
      </section>

      {recent.length ? (
        <section>
          <h2 className="text-lg font-bold">Recently completed</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
                <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Job</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3 text-right">Earning</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recent.map((b) => (
                  <tr key={b.id}>
                    <td className="whitespace-nowrap px-4 py-3">{formatDateTime(b.scheduledAt)}</td>
                    <td className="px-4 py-3">{b.items.map((i) => i.serviceName).join(", ")}</td>
                    <td className="px-4 py-3">{b.review ? `${b.review.rating} / 5` : "-"}</td>
                    <td className="px-4 py-3 text-right font-medium">{rupees(partnerEarning(b.subtotal))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function PartnerPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <h1 className="text-2xl font-bold sm:text-3xl">Partner dashboard</h1>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-surface" />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}
