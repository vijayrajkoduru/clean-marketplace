import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { ShoppingBag, Tag } from "lucide-react";
import { site } from "@/config/site";
import { db } from "@/lib/db";
import { COUPON_COOKIE, getCartLines } from "@/lib/cart";
import { computeTotals } from "@/lib/pricing";
import { formatDuration, rupees } from "@/lib/format";
import { AddToCart } from "@/components/add-to-cart";
import { ServiceImage } from "@/components/service-card";
import { BillSummary } from "@/components/bill-summary";
import { CouponForm } from "./coupon-form";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

async function CartView() {
  const lines = await getCartLines();
  if (!lines.length) {
    return (
      <div className="card mx-auto mt-6 max-w-lg p-10 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-brand-50 text-brand-700">
          <ShoppingBag className="size-7" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-xl font-bold">Your cart is empty</h2>
        <p className="mt-2 text-sm text-muted">Add a service to book a professional at a time that suits you.</p>
        <Link href="/services" className="btn-primary mt-6">Browse services</Link>
      </div>
    );
  }

  const couponCode = (await cookies()).get(COUPON_COOKIE)?.value ?? null;
  const totals = await computeTotals(lines, couponCode);
  const now = new Date();
  const offers = await db.coupon.findMany({
    where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: { minOrder: "asc" },
    take: 4,
  });
  const totalMins = lines.reduce((n, l) => n + l.durationMins * l.quantity, 0);

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
      <section aria-label="Items" className="min-w-0">
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {lines.map((l) => (
            <li key={l.variantId} className="flex gap-4 p-4 sm:p-5">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-surface sm:size-24">
                <ServiceImage src={l.image} alt={l.serviceName} sizes="96px" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/s/${l.serviceSlug}`} className="font-semibold leading-snug hover:text-brand-700">{l.serviceName}</Link>
                <p className="text-sm text-muted">{l.variantName} · {formatDuration(l.durationMins)}</p>
                <p className="text-sm">
                  <span className="font-semibold">{rupees(l.unitPrice)}</span>
                  {l.mrp && l.mrp > l.unitPrice ? <span className="ml-1.5 text-xs text-muted line-through">{rupees(l.mrp)}</span> : null}
                </p>
              </div>
              <div className="flex flex-col items-end justify-between gap-3">
                <AddToCart variantId={l.variantId} quantity={l.quantity} />
                <p className="font-bold">{rupees(l.lineTotal)}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">Estimated time at your home: about {formatDuration(totalMins)}.</p>
        <Link href="/services" className="btn-ghost mt-4 px-0 text-brand-700">Add more services</Link>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Tag className="size-4 text-brand-700" aria-hidden="true" /> Coupons and offers</h2>
          <CouponForm applied={totals.coupon} invalid={couponCode && !totals.coupon ? totals.couponError : null} />
          {!totals.coupon && offers.length ? (
            <ul className="mt-4 space-y-2">
              {offers.map((o) => (
                <li key={o.code} className="rounded-xl border border-dashed border-brand-300 bg-brand-50/60 px-3 py-2 text-sm">
                  <span className="font-mono font-bold text-brand-800">{o.code}</span>
                  <span className="text-muted"> · {o.description}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="card p-5">
          <h2 className="font-semibold">Payment summary</h2>
          <BillSummary totals={totals} />
          {totals.subtotal < site.minOrder ? (
            <>
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-danger" role="alert">
                The minimum order is {rupees(site.minOrder)}. Add {rupees(site.minOrder - totals.subtotal)} more to book.
              </p>
              <Link href="/services" className="btn-outline mt-5 w-full">Add more services</Link>
            </>
          ) : (
            <>
              {totals.fee > 0 ? (
                <p className="mt-3 rounded-xl bg-saffron-50 px-3 py-2 text-xs text-amber-900">
                  Add {rupees(site.freeFeeAbove - totals.subtotal)} more to skip the visiting fee.
                </p>
              ) : null}
              <Link href="/checkout" className="btn-primary mt-5 w-full">Choose time and address</Link>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

export default function CartPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <h1 className="text-2xl font-bold sm:text-3xl">Your cart</h1>
      <Suspense fallback={<div className="mt-6 h-72 animate-pulse rounded-2xl bg-surface" />}>
        <CartView />
      </Suspense>
    </div>
  );
}
