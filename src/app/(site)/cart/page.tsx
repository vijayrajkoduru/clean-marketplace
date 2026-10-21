import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { Crown, ShoppingBag, Tag } from "lucide-react";
import { site } from "@/config/site";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { COUPON_COOKIE, PLUS_COOKIE, getCartLines } from "@/lib/cart";
import { cartExtras } from "@/lib/cart-extras";
import { computeTotals, couponErrorText, plusSaving } from "@/lib/pricing";
import { formatDate, formatDuration, rupees } from "@/lib/format";
import { CreditToggle, PlusToggle } from "./extras-controls";
import { AddToCart } from "@/components/add-to-cart";
import { ServiceImage } from "@/components/service-card";
import { BillSummary } from "@/components/bill-summary";
import { CouponForm } from "./coupon-form";
import { RemoveLine } from "./remove-line";
import { MenuSummary } from "@/components/menu-summary";
import { strings, fmt } from "@/strings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: strings.cart.metaTitle, robots: { index: false } };
}

async function CartView() {
  const d = strings;
  const t = d.cart;
  const lines = await getCartLines();
  if (!lines.length) {
    return (
      <div className="card mx-auto mt-6 max-w-lg p-10 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-brand-50 text-brand-700">
          <ShoppingBag className="size-7" aria-hidden="true" />
        </div>
        <h2 className="mt-5 text-xl font-bold">{t.empty}</h2>
        <p className="mt-2 text-sm text-muted">{t.emptyText}</p>
        {(await cookies()).get(PLUS_COOKIE)?.value === "1" ? (
          <p className="mt-3 rounded-xl bg-saffron-50 px-3 py-2 text-sm text-amber-900">{fmt(t.plusAddedEmpty, { name: site.name })}</p>
        ) : null}
        <Link href="/services" className="btn-primary mt-6">{t.browse}</Link>
      </div>
    );
  }

  const couponCode = (await cookies()).get(COUPON_COOKIE)?.value ?? null;
  const user = await getCurrentUser();
  const extras = await cartExtras(user?.id ?? null);
  const totals = await computeTotals(lines, couponCode, extras);
  const subtotalNow = lines.reduce((n, l) => n + l.lineTotal, 0);
  const plusWouldSave = plusSaving(subtotalNow) + (subtotalNow < site.freeFeeAbove ? site.convenienceFee : 0);
  const now = new Date();
  const offers = await db.coupon.findMany({
    where: { active: true, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    orderBy: { minOrder: "asc" },
    take: 4,
  });
  const totalMins = lines.reduce((n, l) => n + l.durationMins * l.quantity, 0);

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
      <section aria-label={t.items} className="min-w-0">
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {lines.map((l) => (
            <li key={l.variantId} className="flex gap-4 p-4 sm:p-5">
              <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-surface sm:size-24">
                <ServiceImage src={l.image} alt={l.serviceName} sizes="96px" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/s/${l.serviceSlug}`} className="font-semibold leading-snug hover:text-brand-700">{l.serviceName}</Link>
                {l.guests ? (
                  <>
                    <p className="text-sm text-muted">
                      {l.variantName} · {fmt(d.menu.lineGuests, { n: l.guests, price: rupees(l.platePrice ?? 0) })} · {formatDuration(l.durationMins)}
                    </p>
                    {l.menu?.length ? (
                      <details className="mt-1 text-sm">
                        <summary className="cursor-pointer font-semibold text-brand-700">{d.menu.showMenu}</summary>
                        <MenuSummary lines={l.menu} className="mt-2" />
                      </details>
                    ) : null}
                    {l.problem ? <p className="text-sm font-medium text-danger" role="alert">{fmt(d.menu.problem, { problem: l.problem })}</p> : null}
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted">{l.variantName} · {formatDuration(l.durationMins)}</p>
                    <p className="text-sm">
                      <span className="font-semibold">{rupees(l.unitPrice)}</span>
                      {l.mrp && l.mrp > l.unitPrice ? <span className="ml-1.5 text-xs text-muted line-through">{rupees(l.mrp)}</span> : null}
                    </p>
                  </>
                )}
              </div>
              <div className="flex flex-col items-end justify-between gap-3">
                {l.guests ? (
                  <div className="flex flex-col items-end gap-2">
                    <Link href={`/s/${l.serviceSlug}/menu?v=${l.variantId}`} className="btn-outline px-4 py-2">{d.menu.edit}</Link>
                    <RemoveLine variantId={l.variantId} label={t.remove} />
                  </div>
                ) : (
                  <AddToCart variantId={l.variantId} quantity={l.quantity} />
                )}
                <p className="font-bold">{rupees(l.lineTotal)}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-muted">{fmt(t.estimate, { time: formatDuration(totalMins) })}</p>
        <Link href="/services" className="btn-ghost mt-4 px-0 text-brand-700">{t.addMore}</Link>
      </section>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <h2 className="flex items-center gap-2 font-semibold"><Tag className="size-4 text-brand-700" aria-hidden="true" /> {t.offers}</h2>
          <CouponForm applied={totals.coupon} invalid={couponCode && !totals.coupon && totals.couponError ? couponErrorText(totals.couponError, d.coupon) : null} />
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
        <div className="card border-saffron/60 bg-saffron-50/40 p-5">
          <div className="flex items-start justify-between gap-3">
            <h2 className="flex items-center gap-2 font-semibold"><Crown className="size-4 text-amber-600" aria-hidden="true" /> {site.name} Plus</h2>
            {!extras.plusActive ? <PlusToggle on={Boolean(extras.buyPlus)} /> : null}
          </div>
          {extras.plusActive ? (
            <p className="mt-2 text-sm">{fmt(t.plusMember, { date: formatDate(extras.plusUntil!), percent: site.plus.discountPercent })}</p>
          ) : extras.buyPlus ? (
            <p className="mt-2 text-sm">{fmt(t.plusAdded, { price: rupees(site.plus.price), saving: rupees(totals.plusDiscount + (subtotalNow < site.freeFeeAbove ? site.convenienceFee : 0)) })}</p>
          ) : (
            <p className="mt-2 text-sm text-muted">
              {fmt(t.plusPitch, { price: rupees(site.plus.price), percent: site.plus.discountPercent })}{" "}
              {plusWouldSave > 0 ? <span className="font-semibold text-ink">{fmt(t.plusSaves, { saving: rupees(plusWouldSave) })}</span> : null}{" "}
              <Link href="/plus" className="font-semibold text-brand-700">{t.learnMore}</Link>
            </p>
          )}
        </div>
        {extras.credit > 0 ? (
          <div className="card p-5">
            <CreditToggle
              on={!extras.creditOff}
              label={fmt(t.useCredit, { amount: rupees(extras.credit), percent: site.referral.maxUsePercent })}
            />
          </div>
        ) : null}
        <div className="card p-5">
          <h2 className="font-semibold">{t.summary}</h2>
          <BillSummary totals={totals} />
          {lines.some((l) => l.problem) ? (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-danger" role="alert">
              {fmt(d.menu.problem, { problem: lines.find((l) => l.problem)?.problem ?? "" })}
            </p>
          ) : totals.subtotal < site.minOrder ? (
            <>
              <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-danger" role="alert">
                {fmt(t.minOrder, { min: rupees(site.minOrder), short: rupees(site.minOrder - totals.subtotal) })}
              </p>
              <Link href="/services" className="btn-outline mt-5 w-full">{t.addMore}</Link>
            </>
          ) : (
            <>
              {totals.fee > 0 ? (
                <p className="mt-3 rounded-xl bg-saffron-50 px-3 py-2 text-xs text-amber-900">
                  {fmt(t.skipFee, { amount: rupees(site.freeFeeAbove - totals.subtotal) })}
                </p>
              ) : null}
              <Link href="/checkout" className="btn-primary mt-5 w-full">{t.toCheckout}</Link>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

export default async function CartPage() {
  const d = strings;
  return (
    <div className="container-page py-8 sm:py-10">
      <h1 className="text-2xl font-bold sm:text-3xl">{d.cart.title}</h1>
      <Suspense fallback={<div className="mt-6 h-72 animate-pulse rounded-2xl bg-surface" />}>
        <CartView />
      </Suspense>
    </div>
  );
}
