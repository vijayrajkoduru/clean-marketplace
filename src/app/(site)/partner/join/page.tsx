import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BadgeIndianRupee, CalendarCheck, GraduationCap, ShieldCheck } from "lucide-react";
import { site } from "@/config/site";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCategories, getCities } from "@/lib/catalog";
import { StatusBadge } from "@/components/status-badge";
import { ApplyForm } from "./apply-form";
import { strings, fmt } from "@/strings";

export async function generateMetadata(): Promise<Metadata> {
  const t = strings.join;
  return { title: t.metaTitle, description: fmt(t.metaDescription, { name: site.name }) };
}

const PERK_ICONS = [BadgeIndianRupee, CalendarCheck, GraduationCap, ShieldCheck];

async function JoinGate() {
  const user = await getCurrentUser();
  const d = strings;
  const t = d.join;
  if (!user) {
    return (
      <div className="card p-6 text-center">
        <h2 className="text-lg font-bold">{t.applyTitle}</h2>
        <p className="mt-2 text-sm text-muted">{t.applyText}</p>
        <Link href="/login?next=/partner/join" className="btn-primary mt-5 w-full">{t.loginToApply}</Link>
      </div>
    );
  }
  const partner = await db.partner.findUnique({ where: { userId: user.id } });
  if (partner && partner.status !== "REJECTED") {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{t.yourApplication}</h2>
          <StatusBadge status={partner.status} />
        </div>
        {partner.status === "APPROVED" ? (
          <>
            <p className="mt-2 text-sm text-muted">{t.approved}</p>
            <Link href="/partner" className="btn-primary mt-5 w-full">{t.toDashboard}</Link>
          </>
        ) : partner.status === "PENDING" ? (
          <p className="mt-2 text-sm text-muted">{t.pending}</p>
        ) : (
          <p className="mt-2 text-sm text-muted">{fmt(t.onHold, { email: site.supportEmail })}</p>
        )}
      </div>
    );
  }
  const [categories, cities] = await Promise.all([getCategories(), getCities()]);
  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold">{t.formTitle}</h2>
      {partner?.status === "REJECTED" ? <p className="mt-1 text-sm text-muted">{t.rejected}</p> : null}
      <ApplyForm
        name={user.name ?? ""}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        cities={cities.map((c) => ({ id: c.id, name: c.name, state: c.state }))}
      />
    </div>
  );
}

export default async function PartnerJoinPage() {
  const t = strings.join;
  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_440px] lg:py-14">
      <div>
        <p className="chip">{t.forPros}</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">{t.heading}</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">{fmt(t.intro, { name: site.name })}</p>
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-3xl bg-surface">
          <Image src="/img/partner.jpg" alt={t.photoAlt} fill sizes="(min-width: 1024px) 640px, 100vw" className="object-cover" />
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {t.perks.map((p, i) => {
            const Icon = PERK_ICONS[i] ?? ShieldCheck;
            return (
              <li key={p.title} className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon className="size-5" aria-hidden="true" /></span>
                <span>
                  <span className="font-semibold">{fmt(p.title, { share: site.partnerSharePercent })}</span>
                  <span className="mt-0.5 block text-sm text-muted">{p.text}</span>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-10 rounded-2xl bg-surface p-5">
          <h2 className="font-bold">{t.howTitle}</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted">
            {t.steps.map((s) => <li key={s}>{s}</li>)}
          </ol>
        </div>
      </div>
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Suspense fallback={<div className="card h-96 animate-pulse bg-surface" />}>
          <JoinGate />
        </Suspense>
      </div>
    </div>
  );
}
