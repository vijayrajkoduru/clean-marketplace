import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { site } from "@/config/site";
import { getCategories, getCities, getCity, getFeaturedServices } from "@/lib/catalog";
import { rupees } from "@/lib/format";
import { CategoryIcon } from "@/components/icons";
import { ServiceCard } from "@/components/service-card";
import { fmt, strings } from "@/strings";

export async function generateStaticParams() {
  const cities = await getCities();
  return cities.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/in/[city]">): Promise<Metadata> {
  const { city } = await params;
  const c = await getCity(city);
  const d = strings;
  if (!c) return {};
  const name = c.name;
  return {
    title: fmt(d.city.metaTitle, { city: name }),
    description: fmt(d.city.metaDescription, { city: name, n: site.warrantyDays }),
  };
}

async function CityView({ params }: { params: PageProps<"/in/[city]">["params"] }) {
  const { city } = await params;
  const [c, categories, featured] = await Promise.all([getCity(city), getCategories(), getFeaturedServices()]);
  const d = strings;
  if (!c) notFound();
  const t = d.city;
  const name = c.name;
  const state = c.state;
  const vars = { city: name, lead: site.slots.leadMinutes / 60, first: site.slots.firstHour, last: site.slots.lastHour - 12, days: site.slots.days };

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="container-page py-12 sm:py-16">
          <nav className="mb-4 flex items-center gap-1 text-sm text-muted" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-ink">{d.catalog.home}</Link>
            <ChevronRight className="size-4" aria-hidden="true" />
            <span className="text-ink">{name}</span>
          </nav>
          <h1 className="max-w-3xl text-3xl font-extrabold tracking-tight sm:text-5xl">{fmt(t.title, { city: name })}</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">{fmt(t.lead, { city: name, state, n: site.warrantyDays })}</p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((cat) => (
              <Link key={cat.id} href={`/in/${c.slug}/${cat.slug}`} className="card flex flex-col gap-2 p-4 transition hover:border-brand-300 hover:shadow-sm">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><CategoryIcon name={cat.icon} className="size-5" /></span>
                <span className="font-semibold leading-snug">{cat.name}</span>
                {cat.fromPrice ? <span className="text-xs text-muted">{fmt(t.from, { price: rupees(cat.fromPrice) })}</span> : null}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        <h2 className="section-title">{fmt(t.mostBooked, { city: name })}</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.slice(0, 8).map((s) => <ServiceCard key={s.id} s={s} />)}
        </div>
      </section>

      <section className="container-page pb-14">
        <h2 className="section-title">{fmt(t.questions, { city: name })}</h2>
        <div className="mt-5 max-w-3xl divide-y divide-line rounded-2xl border border-line bg-white">
          {t.faqs.map((f) => (
            <details key={f.q} className="px-5 py-4">
              <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">{fmt(f.q, vars)}</summary>
              <p className="mt-2 text-sm text-muted">{fmt(f.a, vars)}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}

export default function CityPage({ params }: PageProps<"/in/[city]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse bg-brand-50" />}>
      <CityView params={params} />
    </Suspense>
  );
}
