import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, Images } from "lucide-react";
import { getWork, getWorkCategories } from "@/lib/portfolio";
import { WorkCard } from "@/components/work-card";
import { fmt, strings } from "@/strings";

export const metadata: Metadata = { title: strings.work.metaTitle, description: strings.work.metaDescription };

function Hero() {
  const t = strings.work;
  return (
    <section className="relative isolate overflow-hidden bg-ink text-white">
      <div aria-hidden="true" className="absolute -left-24 -top-32 -z-10 size-[26rem] rounded-full bg-brand-600/35 blur-3xl animate-aurora" />
      <div aria-hidden="true" className="absolute -right-16 top-0 -z-10 size-[22rem] rounded-full bg-saffron/20 blur-3xl animate-aurora [animation-delay:-7s]" />
      <div className="container-page py-14 sm:py-20">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-saffron ring-1 ring-white/15 animate-rise">
          <Images className="size-4" aria-hidden="true" />
          {t.kicker}
        </p>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight animate-rise [animation-delay:100ms] sm:text-6xl">{t.title}</h1>
        <p className="mt-4 max-w-2xl text-lg text-white/75 animate-rise [animation-delay:200ms]">{t.lead}</p>
      </div>
    </section>
  );
}

async function Gallery({ searchParams }: { searchParams: PageProps<"/our-work">["searchParams"] }) {
  const t = strings.work;
  const sp = await searchParams;
  const raw = Array.isArray(sp.c) ? sp.c[0] : sp.c;
  const [categories, all] = await Promise.all([getWorkCategories(), getWork()]);
  const active = categories.find((c) => c.slug === raw)?.slug;
  const items = active ? await getWork({ category: active }) : all;

  if (!all.length) {
    return (
      <div className="card mx-auto max-w-xl p-10 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-50 text-brand-700">
          <Images className="size-6" aria-hidden="true" />
        </span>
        <p className="mt-4 text-muted">{t.empty}</p>
        <Link href="/services" className="btn-primary mt-6">{t.browse} <ArrowRight className="size-4" aria-hidden="true" /></Link>
      </div>
    );
  }

  return (
    <>
      {categories.length > 1 ? (
        <nav aria-label="Filter by category" className="mb-8 flex flex-wrap gap-2">
          {[{ slug: "", name: t.all, count: all.length }, ...categories].map((c) => {
            const on = (c.slug || undefined) === active;
            return (
              <Link
                key={c.slug || "all"}
                href={c.slug ? `/our-work?c=${c.slug}` : "/our-work"}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition hover:-translate-y-0.5 ${on ? "border-brand-700 bg-brand-700 text-white shadow-md shadow-brand-900/20" : "border-line bg-white text-ink hover:border-brand-300"}`}
              >
                {c.name}
                <span className={`rounded-full px-1.5 text-xs ${on ? "bg-white/20" : "bg-surface text-muted"}`}>{c.count}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
      <p className="mb-5 text-sm text-muted">{items.length === 1 ? t.countOne : fmt(t.count, { n: items.length })}</p>
      <div className="columns-1 gap-5 sm:columns-2 lg:columns-3">
        {items.map((w, i) => (
          <WorkCard key={w.id} w={w} index={i} />
        ))}
      </div>
    </>
  );
}

export default function OurWorkPage({ searchParams }: PageProps<"/our-work">) {
  return (
    <>
      <Hero />
      <section className="container-page py-10 sm:py-14">
        <Suspense fallback={<div className="columns-1 gap-5 sm:columns-2 lg:columns-3">{[320, 240, 280, 260, 300, 220].map((h, i) => <div key={i} className="skeleton mb-5" style={{ height: h }} />)}</div>}>
          <Gallery searchParams={searchParams} />
        </Suspense>
      </section>
    </>
  );
}
