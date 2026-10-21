import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatAddress, partnerEarning, STATUS_LABEL, type AddressSnapshot } from "@/lib/booking";
import { eligiblePartners, markRefunded } from "@/app/actions/admin";
import { formatDateTime, formatDuration, rupees } from "@/lib/format";
import { BillSummary } from "@/components/bill-summary";
import { StatusBadge } from "@/components/status-badge";
import { ActionButton, AdminLoading } from "../../ui";
import { AssignPartner, SetStatus } from "./controls";
import { MenuSummary } from "@/components/menu-summary";
import { parseMenu } from "@/lib/menu-rules";

export const metadata = { title: "Booking" };

async function AdminBookingContent({ params }: PageProps<"/admin/bookings/[code]">) {
  const { code } = await params;
  await requireAdmin(`/admin/bookings/${code}`);
  const b = await db.booking.findUnique({
    where: { code },
    include: {
      city: true,
      items: true,
      events: { orderBy: { createdAt: "desc" } },
      review: true,
      customer: { select: { id: true, name: true, phone: true, email: true } },
      partner: { include: { user: { select: { name: true, phone: true } } } },
    },
  });
  if (!b) notFound();
  const a = JSON.parse(b.address) as AddressSnapshot;
  const partners = ["CONFIRMED", "ASSIGNED"].includes(b.status) ? await eligiblePartners(code) : [];

  return (
    <div>
      <Link href="/admin/bookings" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden="true" /> Bookings
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-bold">{b.code}</h1>
        <StatusBadge status={b.status} />
      </div>
      <p className="mt-1 text-sm text-muted">Visit {formatDateTime(b.scheduledAt)} in {b.city.name} · booked {formatDateTime(b.createdAt)}</p>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-5">
          <section className="card grid gap-5 p-5 sm:grid-cols-2">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Customer</h2>
              <p className="mt-1 font-semibold">{b.customer.name ?? a.name}</p>
              <p className="text-sm"><a href={`tel:+91${b.customer.phone}`} className="text-brand-700">+91 {b.customer.phone}</a></p>
              {b.customer.email ? <p className="text-sm text-muted">{b.customer.email}</p> : null}
              <Link href={`/admin/customers?q=${b.customer.phone}`} className="mt-1 inline-block text-xs font-semibold text-brand-700">All bookings by this customer</Link>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Address</h2>
              <p className="mt-1 text-sm">{formatAddress(a)}</p>
              {b.notes ? <p className="mt-2 rounded-lg bg-surface p-2 text-sm text-muted">Note: {b.notes}</p> : null}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-bold">Services</h2>
            <ul className="mt-3 divide-y divide-line text-sm">
              {b.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-3 py-2">
                  <span>
                    {i.serviceName}{" "}
                    <span className="text-muted">
                      · {i.variantName} · {i.guests ? `${i.guests} guests · ${rupees(i.platePrice ?? 0)} per plate` : formatDuration(i.durationMins)}
                      {i.quantity > 1 ? ` · x${i.quantity}` : ""}
                    </span>
                    {i.menu ? <MenuSummary lines={parseMenu(i.menu)} className="mt-2" /> : null}
                  </span>
                  <span className="font-medium">{rupees(i.unitPrice * i.quantity)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="font-bold">Professional</h2>
            {b.partner ? (
              <p className="mt-2 text-sm">
                <span className="font-semibold">{b.partner.user.name ?? "Professional"}</span> · <a href={`tel:+91${b.partner.user.phone}`} className="text-brand-700">+91 {b.partner.user.phone}</a>
                <span className="block text-muted">Earning on this job: {rupees(partnerEarning(b.subtotal))}</span>
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">Not assigned yet.</p>
            )}
            {["CONFIRMED", "ASSIGNED"].includes(b.status) ? <AssignPartner code={b.code} partners={partners} current={b.partnerId} /> : null}
          </section>

          <section className="card p-5">
            <h2 className="font-bold">Change status</h2>
            <p className="mt-1 text-sm text-muted">Use this for support cases. Professionals normally move jobs forward from their dashboard.</p>
            <SetStatus code={b.code} current={b.status} />
          </section>

          {b.review ? (
            <section className="card p-5">
              <h2 className="font-bold">Customer rating</h2>
              <p className="mt-1 text-sm"><span className="font-semibold">{b.review.rating} / 5</span>{b.review.comment ? ` · ${b.review.comment}` : ""}</p>
            </section>
          ) : null}
        </div>

        <aside className="space-y-5">
          <section className="card p-5">
            <h2 className="font-bold">Payment</h2>
            <p className="mt-1 text-sm text-muted">
              {b.paymentMethod === "ONLINE" ? "Online (Razorpay)" : "Pay after service"} · {b.paymentStatus.replace("_", " ").toLowerCase()}
            </p>
            {b.razorpayPaymentId ? <p className="mt-1 font-mono text-xs text-muted">Payment ID {b.razorpayPaymentId}</p> : null}
            <BillSummary totals={b} paid={b.paymentStatus === "PAID"} />
            {b.paymentStatus === "PAID" ? (
              <Link href={`/bookings/${b.code}/invoice`} className="btn-outline mt-4 w-full">View invoice{b.invoiceNo ? ` ${b.invoiceNo}` : ""}</Link>
            ) : null}
            {b.paymentStatus === "REFUND_DUE" ? (
              <div className="mt-4 rounded-xl bg-red-50 p-3">
                <p className="text-sm text-danger">Refund {rupees(b.total)} from the Razorpay dashboard, then mark it here.</p>
                <div className="mt-2">
                  <ActionButton action={markRefunded.bind(null, b.code)} label="Mark refund sent" className="btn-dark" confirmText="Confirm the refund has been sent from Razorpay?" />
                </div>
              </div>
            ) : null}
          </section>
          <section className="card p-5">
            <h2 className="font-bold">Activity</h2>
            <ol className="mt-3 space-y-3 text-sm">
              {b.events.map((e) => (
                <li key={e.id}>
                  <span className="font-medium">{STATUS_LABEL[e.status] ?? e.status}</span>
                  <span className="text-muted"> by {e.actor.toLowerCase()}{e.note ? ` · ${e.note}` : ""}</span>
                  <span className="block text-xs text-muted">{formatDateTime(e.createdAt)}</span>
                </li>
              ))}
            </ol>
          </section>
          {b.cancelReason ? <p className="text-sm text-muted">Cancel reason: {b.cancelReason}</p> : null}
        </aside>
      </div>
    </div>
  );
}

/** Own Suspense boundary, so moving between admin pages shows a placeholder instead of blocking. */
export default function AdminBooking(props: PageProps<"/admin/bookings/[code]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminBookingContent {...props} />
    </Suspense>
  );
}
