import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { site } from "@/config/site";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { COUPON_COOKIE, getCartLines } from "@/lib/cart";
import { computeTotals } from "@/lib/pricing";
import { cartExtras } from "@/lib/cart-extras";
import { getCities } from "@/lib/catalog";
import { getSlotDays } from "@/lib/slots";
import { razorpayEnabled } from "@/lib/razorpay";
import { expireStalePayments } from "@/lib/maintenance";
import { formatDuration, rupees } from "@/lib/format";
import { BillSummary } from "@/components/bill-summary";
import { CheckoutForm } from "./checkout-form";
import { fmt, strings } from "@/strings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: strings.checkout.metaTitle, robots: { index: false } };
}

async function CheckoutView() {
  const user = await requireUser("/checkout");
  const d = strings;
  const lines = await getCartLines();
  if (!lines.length) redirect("/cart");

  const couponCode = (await cookies()).get(COUPON_COOKIE)?.value ?? null;
  const extras = await cartExtras(user.id);
  const [totals, addresses, cities, profile] = await Promise.all([
    computeTotals(lines, couponCode, extras),
    db.address.findMany({ where: { userId: user.id, city: { active: true } }, include: { city: true }, orderBy: { createdAt: "desc" } }),
    getCities(),
    db.user.findUnique({ where: { id: user.id }, select: { name: true } }),
  ]);
  if (totals.subtotal < site.minOrder || lines.some((l) => l.problem)) redirect("/cart");

  await expireStalePayments();
  const now = new Date();
  const slotEntries = await Promise.all(cities.map(async (c) => [c.id, await getSlotDays(c.id, now)] as const));
  const slotsByCity = Object.fromEntries(slotEntries);

  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
      <CheckoutForm
        name={profile?.name ?? ""}
        phone={user.phone}
        addresses={addresses.map((a) => ({
          id: a.id,
          label: a.label,
          cityId: a.cityId,
          text: [a.line1, a.line2, a.landmark, `${a.city.name} ${a.pincode}`].filter(Boolean).join(", "),
        }))}
        cities={cities.map((c) => ({ id: c.id, name: c.name, state: c.state }))}
        slotsByCity={slotsByCity}
        total={totals.total}
        onlineEnabled={razorpayEnabled()}
      />
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <div className="card p-5">
          <h2 className="font-semibold">{d.checkout.summary}</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {lines.map((l) => (
              <li key={l.variantId} className="flex justify-between gap-3">
                <span>
                  <span className="font-medium">{l.serviceName}</span>
                  <span className="block text-xs text-muted">
                    {l.variantName} · {l.guests ? fmt(d.menu.lineGuests, { n: l.guests, price: rupees(l.platePrice ?? 0) }) : formatDuration(l.durationMins)}
                    {l.quantity > 1 ? ` · x${l.quantity}` : ""}
                  </span>
                </span>
                <span className="shrink-0 font-medium">{rupees(l.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-line pt-1">
            <BillSummary totals={totals} />
          </div>
        </div>
      </aside>
    </div>
  );
}

export default async function CheckoutPage() {
  const d = strings;
  return (
    <div className="container-page py-8 sm:py-10">
      <h1 className="text-2xl font-bold sm:text-3xl">{d.checkout.title}</h1>
      <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-2xl bg-surface" />}>
        <CheckoutView />
      </Suspense>
    </div>
  );
}
