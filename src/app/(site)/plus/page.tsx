import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BadgePercent, CalendarCheck, Crown, Truck } from "lucide-react";
import { site } from "@/config/site";
import { getCurrentUser } from "@/lib/auth";
import { activePlus } from "@/lib/membership";
import { formatDate, rupees } from "@/lib/format";
import { AddPlusButton } from "./add-plus";
import { strings, fmt } from "@/strings";

const p = site.plus;

export async function generateMetadata(): Promise<Metadata> {
  const t = strings.plus;
  return {
    title: fmt(t.name, { name: site.name }),
    description: fmt(t.metaDescription, { percent: p.discountPercent, price: rupees(p.price) }),
  };
}

async function PlusStatus() {
  const user = await getCurrentUser();
  const m = user ? await activePlus(user.id) : null;
  if (m) {
    const d = strings;
    return (
      <div className="rounded-2xl bg-white/10 p-5">
        <p className="font-semibold">{fmt(d.plus.memberUntil, { date: formatDate(m.endsAt) })}</p>
        <p className="mt-1 text-sm text-white/80">{d.plus.memberText}</p>
        <Link href="/services" className="btn mt-4 bg-saffron text-ink hover:bg-amber-400">{d.plus.book}</Link>
      </div>
    );
  }
  return <AddPlusButton />;
}

export default async function PlusPage() {
  const t = strings.plus;
  const examples = [999, 1999, 3299];
  const benefits = [
    { icon: BadgePercent, title: fmt(t.discountTitle, { percent: p.discountPercent }), text: fmt(t.discountText, { max: rupees(p.maxDiscount) }) },
    { icon: Truck, title: t.feeTitle, text: fmt(t.feeText, { fee: rupees(site.convenienceFee) }) },
    { icon: CalendarCheck, title: fmt(t.monthsTitle, { months: p.months }), text: t.monthsText },
  ];
  return (
    <>
      <section className="bg-ink text-white">
        <div className="container-page grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-saffron">
              <Crown className="size-4" aria-hidden="true" /> {fmt(t.name, { name: site.name })}
            </p>
            <h1 className="mt-5 text-4xl font-extrabold tracking-tight sm:text-5xl">{t.heading}</h1>
            <p className="mt-4 max-w-xl text-lg text-white/80">
              {fmt(t.intro, { percent: p.discountPercent, max: rupees(p.maxDiscount), months: p.months, price: rupees(p.price) })}
            </p>
          </div>
          <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
            <p className="text-sm text-white/70">{t.membership}</p>
            <p className="mt-1 text-4xl font-extrabold">{rupees(p.price)}<span className="text-base font-medium text-white/70">{t.perYear}</span></p>
            <p className="mt-2 text-sm text-white/70">{t.chargedNote}</p>
            <div className="mt-5">
              <Suspense fallback={<div className="h-12 animate-pulse rounded-xl bg-white/10" />}>
                <PlusStatus />
              </Suspense>
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="grid gap-5 sm:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.title} className="card p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-saffron-50 text-amber-700"><b.icon className="size-5" aria-hidden="true" /></span>
              <h2 className="mt-4 font-bold">{b.title}</h2>
              <p className="mt-1 text-sm text-muted">{b.text}</p>
            </div>
          ))}
        </div>

        <h2 className="section-title mt-12">{t.saveTitle}</h2>
        <div className="mt-4 max-w-xl overflow-hidden rounded-2xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-3">{t.colBooking}</th><th className="px-4 py-3 text-right">{t.colSave}</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {examples.map((amount) => {
                const saving = Math.min(p.maxDiscount, Math.floor((amount * p.discountPercent) / 100)) + (amount < site.freeFeeAbove ? site.convenienceFee : 0);
                return (
                  <tr key={amount}>
                    <td className="px-4 py-3">{rupees(amount)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{rupees(saving)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 max-w-xl text-xs text-muted">{t.cancelNote}</p>
      </section>
    </>
  );
}
