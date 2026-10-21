import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { site } from "@/config/site";
import { rupees } from "@/lib/format";
import { strings, fmt } from "@/strings";

export async function generateMetadata(): Promise<Metadata> {
  const t = strings.help;
  return { title: t.metaTitle, description: t.metaDescription };
}

const VALUES = {
  lead: site.slots.leadMinutes / 60,
  first: site.slots.firstHour,
  last: site.slots.lastHour - 12,
  days: site.slots.days,
  cutoff: site.changeCutoffMinutes / 60,
  min: rupees(site.minOrder),
  fee: rupees(site.convenienceFee),
  freeAbove: rupees(site.freeFeeAbove),
  email: site.supportEmail,
  warranty: site.warrantyDays,
};

export default async function HelpPage() {
  const t = strings.help;
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.title}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        {t.intro} <Link href="/contact" className="font-semibold text-brand-700">{t.contact}</Link>.
      </p>
      <div className="mt-8 max-w-3xl space-y-10">
        {t.sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-bold">{s.title}</h2>
            <div className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
              {s.faqs.map(({ q, a }) => (
                <details key={q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                    {q}
                    <ChevronDown className="size-5 shrink-0 text-muted transition group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{fmt(a, VALUES)}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
