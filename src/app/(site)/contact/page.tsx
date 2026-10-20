import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Contact us" };

export default function ContactPage() {
  const items = [
    { icon: Mail, label: "Email", value: site.supportEmail, href: `mailto:${site.supportEmail}` },
    ...(site.supportPhone ? [{ icon: Phone, label: "Phone", value: site.supportPhone, href: `tel:${site.supportPhone.replace(/\s/g, "")}` }] : []),
    { icon: Clock, label: "Support hours", value: site.supportHours },
    { icon: MapPin, label: "Office", value: site.officeAddress },
  ];
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Contact us</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        For help with a booking, open it from <Link href="/bookings" className="font-semibold text-brand-700">My bookings</Link> and quote the booking code when you write to us.
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
        Looking for quick answers? See the <Link href="/help" className="font-semibold text-brand-700">help centre</Link>.
      </p>
    </div>
  );
}
