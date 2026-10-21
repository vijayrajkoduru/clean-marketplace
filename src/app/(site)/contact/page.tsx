import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { site } from "@/config/site";
import { strings } from "@/strings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: strings.contact.metaTitle };
}

export default async function ContactPage() {
  const d = strings;
  const t = d.contact;
  const items = [
    { icon: Mail, label: t.email, value: site.supportEmail, href: `mailto:${site.supportEmail}` },
    ...(site.supportPhone ? [{ icon: Phone, label: t.phone, value: site.supportPhone, href: `tel:${site.supportPhone.replace(/\s/g, "")}` }] : []),
    { icon: Clock, label: t.hours, value: site.supportHours },
    { icon: MapPin, label: t.office, value: site.officeAddress },
  ];
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        {t.introBefore} <Link href="/bookings" className="font-semibold text-brand-700">{t.myBookings}</Link> {t.introAfter}
      </p>
      <ul className="mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.label} className="card flex gap-4 p-5">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><i.icon className="size-5" aria-hidden="true" /></span>
            <span>
              <span className="block text-sm text-muted">{i.label}</span>
              {"href" in i && i.href ? <a href={i.href} className="font-semibold text-ink hover:text-brand-700">{i.value}</a> : <span className="font-semibold">{i.value}</span>}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-8 text-sm text-muted">
        {t.quickBefore} <Link href="/help" className="font-semibold text-brand-700">{t.helpCentre}</Link>.
      </p>
    </div>
  );
}
