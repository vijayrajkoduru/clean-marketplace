import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Crown, Gift, Wallet } from "lucide-react";
import { site } from "@/config/site";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getCities } from "@/lib/catalog";
import { formatDate, rupees } from "@/lib/format";
import { activePlus } from "@/lib/membership";
import { referralCodeFor, walletBalance } from "@/lib/wallet";
import { AddAddressForm, DeleteAddressButton, ProfileForm } from "./account-forms";
import { ReferLink } from "./refer-card";
import { strings, fmt, plural, type Strings } from "@/strings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: strings.account.metaTitle, robots: { index: false } };
}

/** Rewards are saved as "Referral reward for <customer id>" so each is paid once; customers see them without the id. */
function walletReason(reason: string, t: Strings["account"]): string {
  return reason.startsWith("Referral reward") ? t.walletReward : reason;
}

async function AccountView() {
  const user = await requireUser("/account");
  const d = strings;
  const t = d.account;
  const [profile, addresses, cities, plus, credit, entries, friends, code] = await Promise.all([
    db.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, phone: true } }),
    db.address.findMany({ where: { userId: user.id }, include: { city: true }, orderBy: { createdAt: "desc" } }),
    getCities(),
    activePlus(user.id),
    walletBalance(user.id),
    db.walletEntry.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.user.count({ where: { referredById: user.id } }),
    referralCodeFor(user.id),
  ]);
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const r = site.referral;

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Crown className="size-5 text-amber-600" aria-hidden="true" /> {fmt(d.plus.name, { name: site.name })}</h2>
          {plus ? (
            <p className="mt-2 text-sm">{fmt(t.plusActive, { date: formatDate(plus.endsAt), percent: site.plus.discountPercent })}</p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted">{fmt(t.plusPitch, { percent: site.plus.discountPercent, price: rupees(site.plus.price) })}</p>
              <Link href="/plus" className="btn-outline mt-4">{t.seePlus}</Link>
            </>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Wallet className="size-5 text-brand-700" aria-hidden="true" /> {t.credit}</h2>
          <p className="mt-2 text-3xl font-extrabold">{rupees(credit)}</p>
          <p className="text-xs text-muted">{fmt(t.creditNote, { percent: r.maxUsePercent })}</p>
          {entries.length ? (
            <ul className="mt-3 space-y-1.5 text-sm">
              {entries.map((e) => (
                <li key={e.id} className="flex justify-between gap-3">
                  <span className="text-muted">{walletReason(e.reason, t)}<span className="block text-xs">{formatDate(e.createdAt)}</span></span>
                  <span className={`shrink-0 font-semibold ${e.amount > 0 ? "text-emerald-700" : ""}`}>{e.amount > 0 ? "+" : "-"}{rupees(Math.abs(e.amount))}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Gift className="size-5 text-brand-700" aria-hidden="true" /> {t.refer}</h2>
          <p className="mt-2 text-sm text-muted">{fmt(t.referText, { credit: rupees(r.friendCredit), reward: rupees(r.reward) })}</p>
          <ReferLink url={`${base}/r/${code}`} text={fmt(t.shareText, { name: site.name, credit: rupees(r.friendCredit) })} />
          <p className="mt-3 text-xs text-muted">{plural(friends, t.friendsOne, t.friendsMany)}</p>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold">{t.profile}</h2>
          <ProfileForm name={profile?.name ?? ""} email={profile?.email ?? ""} phone={profile?.phone ?? user.phone} />
        </section>
        <section className="card p-5 sm:p-6">
          <h2 className="text-lg font-bold">{t.addresses}</h2>
          {addresses.length ? (
            <ul className="mt-4 space-y-2">
              {addresses.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 rounded-xl border border-line p-3.5 text-sm">
                  <span>
                    <span className="font-semibold">{a.label}</span>
                    <span className="block text-muted">{[a.line1, a.line2, a.landmark, `${a.city.name} ${a.pincode}`].filter(Boolean).join(", ")}</span>
                  </span>
                  <DeleteAddressButton id={a.id} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted">{t.noAddresses}</p>
          )}
          <AddAddressForm cities={cities.map((c) => ({ id: c.id, name: c.name, state: c.state }))} />
        </section>
      </div>
    </div>
  );
}

export default async function AccountPage() {
  const d = strings;
  return (
    <div className="container-page max-w-6xl py-8 sm:py-10">
      <h1 className="text-2xl font-bold sm:text-3xl">{d.account.title}</h1>
      <Suspense fallback={<div className="mt-6 h-72 animate-pulse rounded-2xl bg-surface" />}>
        <AccountView />
      </Suspense>
    </div>
  );
}
