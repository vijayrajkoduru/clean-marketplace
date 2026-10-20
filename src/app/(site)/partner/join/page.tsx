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

export const metadata: Metadata = {
  title: "Join as a professional",
  description: `Earn more with steady work near you. Join ${site.name} as a cleaning, repair, beauty or home-improvement professional.`,
};

const PERKS = [
  { icon: BadgeIndianRupee, title: `Keep ${site.partnerSharePercent}% of every job`, text: "Clear earnings on each job before you accept it. No hidden cuts." },
  { icon: CalendarCheck, title: "Work when you want", text: "Pick the jobs and time slots that suit you, in your own city." },
  { icon: GraduationCap, title: "Training and support", text: "Learn our service standards and get help from our team on every job." },
  { icon: ShieldCheck, title: "Respect and safety", text: "Verified customers, start codes on every visit and a support line for you." },
];

async function JoinGate() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="card p-6 text-center">
        <h2 className="text-lg font-bold">Apply in 5 minutes</h2>
        <p className="mt-2 text-sm text-muted">Log in with your mobile number to start your application.</p>
        <Link href="/login?next=/partner/join" className="btn-primary mt-5 w-full">Log in to apply</Link>
      </div>
    );
  }
  const partner = await db.partner.findUnique({ where: { userId: user.id } });
  if (partner && partner.status !== "REJECTED") {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Your application</h2>
          <StatusBadge status={partner.status} />
        </div>
        {partner.status === "APPROVED" ? (
          <>
            <p className="mt-2 text-sm text-muted">You are an approved professional. Open your dashboard to pick up jobs.</p>
            <Link href="/partner" className="btn-primary mt-5 w-full">Go to dashboard</Link>
          </>
        ) : partner.status === "PENDING" ? (
          <p className="mt-2 text-sm text-muted">Thank you for applying. Our team will call you within 2 working days to verify your ID and skills.</p>
        ) : (
          <p className="mt-2 text-sm text-muted">Your partner account is on hold. Please contact {site.supportEmail}.</p>
        )}
      </div>
    );
  }
  const [categories, cities] = await Promise.all([getCategories(), getCities()]);
  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold">Partner application</h2>
      {partner?.status === "REJECTED" ? <p className="mt-1 text-sm text-muted">Your earlier application was not approved. You can update your details and apply again.</p> : null}
      <ApplyForm
        name={user.name ?? ""}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        cities={cities.map((c) => ({ id: c.id, name: c.name, state: c.state }))}
      />
    </div>
  );
}

export default function PartnerJoinPage() {
  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_440px] lg:py-14">
      <div>
        <p className="chip">For professionals</p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">Grow your earnings with steady work near you</h1>
        <p className="mt-4 max-w-xl text-lg text-muted">
          Join {site.name} as a cleaner, electrician, plumber, carpenter, AC technician, beautician, barber, painter or pest-control expert.
        </p>
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-3xl bg-surface">
          <Image src="/img/partner.jpg" alt="A home-services professional at work" fill sizes="(min-width: 1024px) 640px, 100vw" className="object-cover" />
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {PERKS.map((p) => (
            <li key={p.title} className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><p.icon className="size-5" aria-hidden="true" /></span>
              <span>
                <span className="font-semibold">{p.title}</span>
                <span className="mt-0.5 block text-sm text-muted">{p.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-10 rounded-2xl bg-surface p-5">
          <h2 className="font-bold">How joining works</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted">
            <li>Fill in the application with your skills and city.</li>
            <li>Our team calls you to check your ID and work experience.</li>
            <li>Once approved, open your dashboard and accept jobs near you.</li>
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
