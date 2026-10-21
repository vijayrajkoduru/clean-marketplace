import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { site } from "@/config/site";
import { db } from "@/lib/db";
import { getAdminUser, getCurrentUser } from "@/lib/auth";
import { formatAddress, type AddressSnapshot } from "@/lib/booking";
import { formatDate } from "@/lib/format";
import { ensureInvoiceNumber, rupees2, taxBreakup } from "@/lib/invoice";
import { PrintButton } from "./print-button";
import { MenuSummary } from "@/components/menu-summary";
import { parseMenu } from "@/lib/menu-rules";

export const metadata: Metadata = { title: "Invoice", robots: { index: false } };

async function Invoice({ params }: { params: PageProps<"/bookings/[code]/invoice">["params"] }) {
  const { code } = await params;
  // Customers see their own invoices; an admin signed in to the admin panel can open any invoice.
  const [user, admin] = await Promise.all([getCurrentUser(), getAdminUser()]);
  if (!user && !admin) redirect(`/login?next=${encodeURIComponent(`/bookings/${code}/invoice`)}`);
  const b = await db.booking.findFirst({
    where: { code },
    include: { items: true, city: true, events: { orderBy: { createdAt: "asc" } } },
  });
  const own = !!b && b.customerId === user?.id;
  if (!b || (!own && !admin)) notFound();

  const back = own ? `/bookings/${code}` : `/admin/bookings/${code}`;
  if (b.paymentStatus !== "PAID") {
    return (
      <div className="card mx-auto mt-6 max-w-xl p-8 text-center">
        <h1 className="text-xl font-bold">Invoice not ready yet</h1>
        <p className="mt-2 text-sm text-muted">The invoice is available once the booking is paid.</p>
        <Link href={back} className="btn-outline mt-5">Back to booking</Link>
      </div>
    );
  }

  const paidEvent = [...b.events].reverse().find((e) => e.note === "Payment received online" || (e.status === "COMPLETED" && b.paymentMethod === "PAY_AFTER_SERVICE"));
  const issuedAt = paidEvent?.createdAt ?? b.updatedAt;
  const invoiceNo = await ensureInvoiceNumber(b.id, issuedAt);
  const a = JSON.parse(b.address) as AddressSnapshot;
  const tax = taxBreakup(b.total, b.city.state);

  return (
    <>
      <div className="mx-auto mt-4 flex max-w-3xl items-center justify-between print:hidden">
        <Link href={back} className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
          <ChevronLeft className="size-4" aria-hidden="true" /> Back to booking
        </Link>
        <PrintButton />
      </div>
      <article className="mx-auto mt-4 max-w-3xl rounded-2xl border border-line bg-white p-6 text-sm sm:p-10 print:mt-0 print:max-w-none print:rounded-none print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-6">
          <div>
            <p className="text-xl font-extrabold">{site.legalName}</p>
            <p className="mt-1 text-muted">{site.officeAddress}</p>
            {site.gstin ? <p className="mt-1">GSTIN: <span className="font-mono font-semibold">{site.gstin}</span></p> : null}
            <p className="mt-1 text-muted">{site.supportEmail}{site.supportPhone ? ` · ${site.supportPhone}` : ""}</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold uppercase tracking-wide text-brand-700">{site.gstin ? "Tax invoice" : "Invoice"}</p>
            <p className="mt-1">No. <span className="font-mono font-semibold">{invoiceNo}</span></p>
            <p className="text-muted">Date {formatDate(issuedAt)}</p>
            <p className="text-muted">Booking {b.code}</p>
          </div>
        </header>

        <section className="grid gap-4 border-b border-line py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Billed to</p>
            <p className="mt-1 font-semibold">{a.name}</p>
            <p>+91 {a.phone}</p>
            <p className="text-muted">{formatAddress(a)}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Service date</p>
            <p className="mt-1">{formatDate(b.scheduledAt)}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted">Place of supply</p>
            <p className="mt-1">{b.city.state}</p>
          </div>
        </section>

        <table className="mt-6 w-full text-left">
          <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="py-2 pr-3 font-semibold">Service</th>
              <th className="py-2 pr-3 text-right font-semibold">Qty</th>
              <th className="py-2 pr-3 text-right font-semibold">Rate</th>
              <th className="py-2 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {b.items.map((i) => (
              <tr key={i.id}>
                <td className="py-2.5 pr-3">
                  {i.serviceName}
                  <span className="block text-xs text-muted">{i.variantName}{i.guests ? " (plates)" : ""}</span>
                  {i.menu ? <MenuSummary lines={parseMenu(i.menu)} className="mt-1 text-xs" /> : null}
                </td>
                <td className="py-2.5 pr-3 text-right">{i.guests ?? i.quantity}</td>
                <td className="py-2.5 pr-3 text-right">{rupees2(i.platePrice ?? i.unitPrice)}</td>
                <td className="py-2.5 text-right">{rupees2(i.unitPrice * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto max-w-xs space-y-1.5">
          <div className="flex justify-between"><span className="text-muted">Item total</span><span>{rupees2(b.subtotal)}</span></div>
          {b.discount > 0 ? <div className="flex justify-between"><span className="text-muted">Coupon{b.couponCode ? ` (${b.couponCode})` : ""}</span><span>-{rupees2(b.discount)}</span></div> : null}
          {b.plusDiscount > 0 ? <div className="flex justify-between"><span className="text-muted">Plus member discount</span><span>-{rupees2(b.plusDiscount)}</span></div> : null}
          {b.walletUsed > 0 ? <div className="flex justify-between"><span className="text-muted">Referral credit</span><span>-{rupees2(b.walletUsed)}</span></div> : null}
          {b.plusFee > 0 ? <div className="flex justify-between"><span className="text-muted">Plus membership</span><span>{rupees2(b.plusFee)}</span></div> : null}
          {b.fee > 0 ? <div className="flex justify-between"><span className="text-muted">Visiting fee</span><span>{rupees2(b.fee)}</span></div> : null}
          <div className="flex justify-between border-t border-line pt-2 text-base font-bold"><span>Total paid</span><span>{rupees2(b.total)}</span></div>
          {tax ? (
            <div className="mt-3 space-y-1 rounded-xl bg-surface p-3 text-xs print:bg-transparent print:p-0">
              <div className="flex justify-between"><span className="text-muted">Taxable value</span><span>{rupees2(tax.taxable)}</span></div>
              {tax.intraState ? (
                <>
                  <div className="flex justify-between"><span className="text-muted">CGST {tax.rate / 2}%</span><span>{rupees2(tax.cgst)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">SGST {tax.rate / 2}%</span><span>{rupees2(tax.sgst)}</span></div>
                </>
              ) : (
                <div className="flex justify-between"><span className="text-muted">IGST {tax.rate}%</span><span>{rupees2(tax.igst)}</span></div>
              )}
              <p className="pt-1 text-muted">All amounts include GST.</p>
            </div>
          ) : null}
        </div>

        <footer className="mt-8 border-t border-line pt-4 text-xs text-muted">
          <p>
            Paid {b.paymentMethod === "ONLINE" ? `online${b.razorpayPaymentId ? ` (payment ID ${b.razorpayPaymentId})` : ""}` : "after the service, by UPI or cash to the professional"}.
          </p>
          <p className="mt-1">This is a computer-generated invoice and needs no signature.</p>
        </footer>
      </article>
    </>
  );
}

export default function InvoicePage({ params }: PageProps<"/bookings/[code]/invoice">) {
  return (
    <div className="container-page py-6 print:p-0">
      <Suspense fallback={<div className="mx-auto mt-4 h-96 max-w-3xl animate-pulse rounded-2xl bg-surface" />}>
        <Invoice params={params} />
      </Suspense>
    </div>
  );
}
