import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronLeft, KeyRound, MapPin, Phone, Star, StickyNote, UserRound } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { customerCanChange, formatAddress, PROGRESS, STATUS_LABEL, type AddressSnapshot } from "@/lib/booking";
import { expireStalePayments } from "@/lib/maintenance";
import { getSlotDays } from "@/lib/slots";
import { razorpayEnabled, razorpayKeyId } from "@/lib/razorpay";
import { formatDateTime, formatDuration, formatTime, rupees } from "@/lib/format";
import { BillSummary } from "@/components/bill-summary";
import { StatusBadge } from "@/components/status-badge";
import { BookingActions, PayNow, RateBooking } from "./booking-client";

export const metadata: Metadata = { title: "Booking details", robots: { index: false } };

function ProgressTracker({ status }: { status: string }) {
  const current = PROGRESS.indexOf(status as (typeof PROGRESS)[number]);
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Booking progress">
      {PROGRESS.map((s, i) => {
        const done = i <= current;
        return (
          <li key={s} className="flex flex-col gap-2">
            <span className={`h-1.5 rounded-full ${done ? "bg-brand-600" : "bg-line"}`} />
            <span className={`text-[11px] leading-tight sm:text-xs ${i === current ? "font-semibold text-ink" : done ? "text-brand-700" : "text-muted"}`}>
              {STATUS_LABEL[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

async function BookingDetail({ params, searchParams }: { params: PageProps<"/bookings/[code]">["params"]; searchParams: PageProps<"/bookings/[code]">["searchParams"] }) {
  const { code } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/bookings/${code}`);
  await expireStalePayments();

  const b = await db.booking.findFirst({
    where: { code, customerId: user.id },
    include: {
      items: true,
      events: { orderBy: { createdAt: "desc" } },
      review: true,
      partner: { include: { user: { select: { name: true, phone: true } } } },
    },
  });
  if (!b) notFound();

  const address = JSON.parse(b.address) as AddressSnapshot;
  const now = new Date();
  const canChange = customerCanChange(b, now);
  const slotDays = canChange ? await getSlotDays(b.cityId, now) : [];
  const showStartCode = ["CONFIRMED", "ASSIGNED", "ON_THE_WAY"].includes(b.status);
  const showPartner = b.partner && ["ASSIGNED", "ON_THE_WAY", "IN_PROGRESS", "COMPLETED"].includes(b.status);
  const payBy = new Date(b.createdAt.getTime() + 30 * 60 * 1000);
  const totalMins = b.items.reduce((n, i) => n + i.durationMins * i.quantity, 0);

  return (
    <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-5">
        {sp.placed === "1" && b.status !== "PENDING_PAYMENT" && b.status !== "CANCELLED" ? (
          <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-900">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Booking confirmed</p>
              <p className="text-sm">We will assign a verified professional and let you know before the visit.</p>
            </div>
          </div>
        ) : null}

        <section className="card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Booking #{b.code}</p>
              <h1 className="mt-1 text-2xl font-bold">{formatDateTime(b.scheduledAt)}</h1>
              <p className="mt-1 text-sm text-muted">About {formatDuration(totalMins)} at your home</p>
            </div>
            <StatusBadge status={b.status} />
          </div>
          {b.status !== "CANCELLED" && b.status !== "PENDING_PAYMENT" ? (
            <div className="mt-6"><ProgressTracker status={b.status} /></div>
          ) : null}
          {b.status === "CANCELLED" && b.cancelReason ? <p className="mt-4 text-sm text-muted">Reason: {b.cancelReason}</p> : null}
          {b.paymentStatus === "REFUND_DUE" ? <p className="mt-2 text-sm font-medium text-amber-800">Your refund of {rupees(b.total)} is being processed and reaches you in 5 to 7 working days.</p> : null}
          {b.paymentStatus === "REFUNDED" ? <p className="mt-2 text-sm font-medium text-emerald-700">Refund of {rupees(b.total)} sent to your original payment method.</p> : null}
        </section>

        {b.status === "PENDING_PAYMENT" && b.razorpayOrderId && razorpayEnabled() ? (
          <section className="card border-saffron bg-saffron-50/50 p-5 sm:p-6">
            <h2 className="font-bold">Complete your payment</h2>
            <p className="mt-1 text-sm text-muted">Your slot is held until {formatTime(payBy)}. Unpaid bookings are released after that.</p>
            <PayNow code={b.code} orderId={b.razorpayOrderId} keyId={razorpayKeyId()} amount={b.total} name={address.name} phone={user.phone} />
          </section>
        ) : null}

        {showStartCode ? (
          <section className="card flex items-center gap-4 p-5 sm:p-6">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><KeyRound className="size-5" aria-hidden="true" /></div>
            <div className="flex-1">
              <p className="text-sm text-muted">Start code. Share it only when the professional arrives.</p>
              <p className="mt-0.5 font-mono text-2xl font-bold tracking-[0.3em]">{b.startCode}</p>
            </div>
          </section>
        ) : null}

        {showPartner && b.partner ? (
          <section className="card flex items-center gap-4 p-5 sm:p-6">
            <div className="grid size-12 shrink-0 place-items-center rounded-full bg-surface text-muted"><UserRound className="size-6" aria-hidden="true" /></div>
            <div className="flex-1">
              <p className="text-sm text-muted">Your professional</p>
              <p className="font-semibold">{b.partner.user.name ?? "Professional"}</p>
              <p className="text-xs text-muted">{b.partner.experienceYears} years of experience · ID verified</p>
            </div>
            {b.status !== "COMPLETED" ? (
              <a href={`tel:+91${b.partner.user.phone}`} className="btn-outline"><Phone className="size-4" aria-hidden="true" /> Call</a>
            ) : null}
          </section>
        ) : null}

        {b.status === "COMPLETED" ? (
          <section className="card p-5 sm:p-6">
            {b.review ? (
              <div>
                <h2 className="font-bold">Your rating</h2>
                <p className="mt-2 flex gap-0.5" aria-label={`${b.review.rating} out of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => <Star key={n} className={`size-5 ${n <= b.review!.rating ? "fill-saffron text-saffron" : "text-line"}`} aria-hidden="true" />)}
                </p>
                {b.review.comment ? <p className="mt-1 text-sm text-muted">{b.review.comment}</p> : null}
              </div>
            ) : (
              <RateBooking code={b.code} />
            )}
          </section>
        ) : null}

        <section className="card p-5 sm:p-6">
          <h2 className="font-bold">Services</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {b.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-3 py-2.5">
                <span>
                  <span className="font-medium">{i.serviceName}</span>
                  <span className="block text-xs text-muted">{i.variantName} · {formatDuration(i.durationMins)}{i.quantity > 1 ? ` · x${i.quantity}` : ""}</span>
                </span>
                <span className="font-medium">{rupees(i.unitPrice * i.quantity)}</span>
              </li>
            ))}
          </ul>
        </section>

        {canChange ? <BookingActions code={b.code} slotDays={slotDays} paid={b.paymentStatus === "PAID"} /> : null}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <h2 className="flex items-center gap-2 font-semibold"><MapPin className="size-4 text-brand-700" aria-hidden="true" /> Visit address</h2>
          <p className="mt-2 text-sm font-medium">{address.name}</p>
          <p className="text-sm text-muted">{formatAddress(address)}</p>
          {b.notes ? (
            <p className="mt-3 flex gap-2 rounded-xl bg-surface p-3 text-sm text-muted"><StickyNote className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{b.notes}</p>
          ) : null}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Payment</h2>
          <p className="mt-1 text-sm text-muted">
            {b.paymentMethod === "ONLINE" ? "Online" : "Pay after service"}
            {" · "}
            {b.paymentStatus === "PAID" ? <span className="font-semibold text-emerald-700">Paid</span> : b.paymentStatus === "UNPAID" ? "Not paid yet" : b.paymentStatus === "REFUND_DUE" ? "Refund in progress" : "Refunded"}
          </p>
          <BillSummary totals={b} paid={b.paymentStatus === "PAID"} />
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Activity</h2>
          <ol className="mt-3 space-y-3">
            {b.events.map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                <span>
                  <span className="font-medium">{STATUS_LABEL[e.status] ?? e.status}</span>
                  {e.note ? <span className="text-muted"> · {e.note}</span> : null}
                  <span className="block text-xs text-muted">{formatDateTime(e.createdAt)}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-muted">Need help with this booking? <Link href="/help" className="font-semibold text-brand-700">Visit the help centre</Link>.</p>
      </aside>
    </div>
  );
}

export default function BookingPage({ params, searchParams }: PageProps<"/bookings/[code]">) {
  return (
    <div className="container-page py-6 sm:py-8">
      <Link href="/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden="true" /> All bookings
      </Link>
      <Suspense fallback={<div className="mt-4 h-96 animate-pulse rounded-2xl bg-surface" />}>
        <BookingDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
