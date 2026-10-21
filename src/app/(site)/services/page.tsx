import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getAllServices, getCategories } from "@/lib/catalog";
import { ServiceCard } from "@/components/service-card";
import { CategoryIcon } from "@/components/icons";
import { strings, fmt } from "@/strings";

export async function generateMetadata(): Promise<Metadata> {
  const d = strings;
  return { title: d.catalog.allTitle, description: d.catalog.allDescription };
}

async function Results({ searchParams }: { searchParams: PageProps<"/services">["searchParams"] }) {
  const sp = await searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim().toLowerCase() ?? "";
  const [services, categories] = await Promise.all([getAllServices(), getCategories()]);
  const d = strings;
  const t = d.catalog;
  const words = q.split(/\s+/).filter(Boolean);
  const matches = words.length
    ? services.filter((s) => {
        const hay = `${s.name} ${s.summary} ${s.categoryName} ${s.slug.replace(/-/g, " ")} ${s.categorySlug.replace(/-/g, " ")}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
    : services;

  if (q) {
    return (
      <section>
        <h1 className="section-title">{fmt(matches.length ? t.resultsFor : t.noResults, { q })}</h1>
        {matches.length ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {matches.map((s) => (
              <ServiceCard key={s.id} s={s} />
            ))}
          </div>
        ) : (
          <p className="mt-3 text-muted">{t.tryAgain}</p>
        )}
      </section>
    );
  }

  return (
    <>
      <h1 className="section-title">{t.allTitle}</h1>
      {categories.map((c) => {
        const list = services.filter((s) => s.categorySlug === c.slug);
        if (!list.length) return null;
        return (
          <section key={c.id} className="mt-12" aria-labelledby={`cat-${c.slug}`}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 id={`cat-${c.slug}`} className="flex items-center gap-3 text-xl font-bold">
                <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-700"><CategoryIcon name={c.icon} className="size-5" /></span>
                {c.name}
              </h2>
              <Link href={`/c/${c.slug}`} className="shrink-0 text-sm font-semibold text-brand-700">{t.viewCategory}</Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {list.map((s) => (
                <ServiceCard key={s.id} s={s} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

export default function ServicesPage({ searchParams }: PageProps<"/services">) {
  return (
    <div className="container-page py-10">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-surface" />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
