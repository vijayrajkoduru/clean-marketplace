import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { site } from "@/config/site";
import { getCategory, getCategorySlugs, getCities, getCity } from "@/lib/catalog";
import { rupees } from "@/lib/format";
import { ServiceCard } from "@/components/service-card";
import { fmt, strings } from "@/strings";

export async function generateStaticParams() {
  const [cities, categories] = await Promise.all([getCities(), getCategorySlugs()]);
  return cities.flatMap((c) => categories.map((category) => ({ city: c.slug, category })));
}

export async function generateMetadata({ params }: PageProps<"/in/[city]/[category]">): Promise<Metadata> {
  const { city, category } = await params;
  const [c, cat] = await Promise.all([getCity(city), getCategory(category)]);
  const d = strings;
  if (!c || !cat) return {};
  const name = c.name;
  const from = cat.services.length ? Math.min(...cat.services.map((s) => s.fromPrice)) : null;
  return {
    title: fmt(d.city.catTitle, { category: cat.name, city: name }),
    description: fmt(d.city.catMetaDescription, {
      category: cat.name,
      city: name,
      from: from ? fmt(d.city.catFrom, { price: rupees(from) }) : "",
      n: site.warrantyDays,
    }),
  };
}

async function CityCategoryView({ params }: { params: PageProps<"/in/[city]/[category]">["params"] }) {
  const { city, category } = await params;
  const [c, cat] = await Promise.all([getCity(city), getCategory(category)]);
  const d = strings;
  if (!c || !cat) notFound();
  const t = d.city;
  const name = c.name;
  const from = cat.services.length ? Math.min(...cat.services.map((s) => s.fromPrice)) : null;
  const vars = {
    category: cat.name,
    city: name,
    price: from ? rupees(from) : "",
    lead: site.slots.leadMinutes / 60,
    first: site.slots.firstHour,
    last: site.slots.lastHour - 12,
    n: site.warrantyDays,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: fmt(t.catTitle, { category: cat.name, city: name }),
    serviceType: cat.name,
    areaServed: { "@type": "City", name: c.name, containedInPlace: { "@type": "State", name: c.state } },
    provider: { "@type": "Organization", name: site.legalName },
    ...(from ? { offers: { "@type": "AggregateOffer", priceCurrency: "INR", lowPrice: from, offerCount: cat.services.length } } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <section className="relative overflow-hidden bg-ink text-white">
        {cat.image ? <Image src={cat.image} alt="" fill priority sizes="100vw" className="object-cover opacity-35" /> : null}
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/30" aria-hidden="true" />
        <div className="container-page relative py-14 sm:py-20">
          <nav className="mb-5 flex flex-wrap items-center gap-1 text-sm text-white/70" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">{d.catalog.home}</Link>
            <ChevronRight className="size-4" aria-hidden="true" />
            <Link href={`/in/${c.slug}`} className="hover:text-white">{name}</Link>
            <ChevronRight className="size-4" aria-hidden="true" />
            <span className="text-white">{cat.name}</span>
          </nav>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">{fmt(t.catTitle, { category: cat.name, city: name })}</h1>
          <p className="mt-3 max-w-xl text-lg text-white/80">{cat.description}</p>
          {from !== null ? <p className="mt-5 text-sm text-white/70">{fmt(t.catCount, { n: cat.services.length, city: name, price: rupees(from) })}</p> : null}
        </div>
      </section>
      <section className="container-page py-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cat.services.map((s) => <ServiceCard key={s.id} s={s} />)}
        </div>
      </section>
      <section className="container-page pb-14">
        <h2 className="section-title">{fmt(t.catQuestions, { category: cat.name, city: name })}</h2>
        <div className="mt-5 max-w-3xl divide-y divide-line rounded-2xl border border-line bg-white">
          {t.catFaqs.map((f) => (
            <details key={f.q} className="px-5 py-4">
              <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">{fmt(f.q, vars)}</summary>
              <p className="mt-2 text-sm text-muted">{fmt(f.a, vars)}</p>
            </details>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted">
          {fmt(t.alsoIn, { city: name })} <Link href={`/in/${c.slug}`} className="font-semibold text-brand-700">{t.allServices}</Link>.
        </p>
      </section>
    </>
  );
}

export default function CityCategoryPage({ params }: PageProps<"/in/[city]/[category]">) {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse bg-ink/90" />}>
      <CityCategoryView params={params} />
    </Suspense>
  );
}
