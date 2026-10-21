import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getCategory, getCategorySlugs } from "@/lib/catalog";
import { getWork } from "@/lib/portfolio";
import { WorkCard } from "@/components/work-card";
import { ServiceCard } from "@/components/service-card";
import { CategoryIcon } from "@/components/icons";
import { rupees } from "@/lib/format";
import { fmt, strings } from "@/strings";

export async function generateStaticParams() {
  const slugs = await getCategorySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/c/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategory(slug);
  const d = strings;
  if (!c) return {};
  return { title: fmt(d.catalog.atHome, { name: c.name }), description: c.description };
}

/** Awaits params inside Suspense, so categories added after the build still render. */
export default function CategoryPage({ params }: PageProps<"/c/[slug]">) {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse bg-ink/90" />}>
      <CategoryView params={params} />
    </Suspense>
  );
}

async function CategoryView({ params }: { params: PageProps<"/c/[slug]">["params"] }) {
  const { slug } = await params;
  const [c, work] = await Promise.all([getCategory(slug), getWork({ category: slug, limit: 3 })]);
  const d = strings;
  if (!c) notFound();
  const from = c.services.length ? Math.min(...c.services.map((s) => s.fromPrice)) : null;

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-white">
        {/* The photo drifts in slowly behind the title. */}
        {c.image ? <Image src={c.image} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-60 animate-settle" /> : null}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/75 to-ink/10" aria-hidden="true" />
        <div aria-hidden="true" className="absolute -bottom-32 -left-20 -z-10 size-96 rounded-full bg-brand-600/30 blur-3xl animate-aurora" />
        <div className="container-page py-16 sm:py-24">
          <nav className="mb-6 flex items-center gap-1 text-sm text-white/70 animate-rise" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">{d.catalog.home}</Link>
            <ChevronRight className="size-4" aria-hidden="true" />
            <span className="text-white">{c.name}</span>
          </nav>
          <span className="glass-dark grid size-14 place-items-center rounded-2xl text-saffron animate-rise [animation-delay:80ms]">
            <CategoryIcon name={c.icon} className="size-7" />
          </span>
          <h1 className="mt-5 max-w-2xl text-4xl font-extrabold tracking-tight animate-rise [animation-delay:160ms] sm:text-6xl">{c.name}</h1>
          <p className="mt-4 max-w-xl text-lg text-white/80 animate-rise [animation-delay:240ms]">{c.description}</p>
          {from !== null ? (
            <p className="glass-dark mt-6 inline-flex rounded-full px-4 py-2 text-sm font-semibold text-white animate-rise [animation-delay:320ms]">
              {fmt(d.catalog.countFrom, { n: c.services.length, price: rupees(from) })}
            </p>
          ) : null}
        </div>
      </section>
      <section className="container-page py-12">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {c.services.map((s, i) => (
            <ServiceCard key={s.id} s={s} index={i} />
          ))}
        </div>
      </section>
      {work.length ? (
        <section className="bg-surface py-12">
          <div className="container-page">
            <div className="mb-6 flex items-end justify-between gap-4" data-reveal suppressHydrationWarning>
              <h2 className="section-title">{fmt(d.work.categoryTitle, { name: c.name.toLowerCase() })}</h2>
              <Link href={`/our-work?c=${c.slug}`} className="shrink-0 text-sm font-semibold text-brand-700 hover:text-brand-800">{d.work.seeAll}</Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {work.map((x, i) => (
                <WorkCard key={x.id} w={x} index={i} fixed />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
