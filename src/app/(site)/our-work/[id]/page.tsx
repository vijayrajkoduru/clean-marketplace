import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, CalendarDays, ChevronRight, MapPin, ShieldCheck } from "lucide-react";
import { getWork, getWorkItem } from "@/lib/portfolio";
import { formatDate } from "@/lib/format";
import { BeforeAfter } from "@/components/before-after";
import { WorkCard } from "@/components/work-card";
import { site } from "@/config/site";
import { fmt, strings } from "@/strings";

export async function generateMetadata({ params }: PageProps<"/our-work/[id]">): Promise<Metadata> {
  const { id } = await params;
  const w = await getWorkItem(id);
  if (!w) return {};
  return { title: w.title, description: w.description || strings.work.metaDescription, openGraph: { images: [{ url: w.image, width: w.width, height: w.height }] } };
}

async function WorkView({ params }: { params: PageProps<"/our-work/[id]">["params"] }) {
  const { id } = await params;
  const w = await getWorkItem(id);
  if (!w) notFound();
  const d = strings;
  const t = d.work;
  const more = (await getWork({ category: w.category?.slug, limit: 7 })).filter((x) => x.id !== w.id).slice(0, 6);
  const book = w.service
    ? { href: `/s/${w.service.slug}`, label: fmt(t.book, { name: w.service.name }) }
    : w.category
      ? { href: `/c/${w.category.slug}`, label: fmt(t.bookCategory, { name: w.category.name }) }
      : { href: "/services", label: t.browse };

  return (
    <>
      <div className="container-page py-6">
        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-ink">{d.catalog.home}</Link>
          <ChevronRight className="size-4" aria-hidden="true" />
          <Link href="/our-work" className="hover:text-ink">{t.nav}</Link>
          <ChevronRight className="size-4" aria-hidden="true" />
          <span className="text-ink">{w.title}</span>
        </nav>
      </div>

      <div className="container-page grid gap-10 pb-16 lg:grid-cols-[1.45fr_1fr]">
        <div className="animate-rise">
          {w.beforeImage ? (
            <BeforeAfter before={w.beforeImage} after={w.image} alt={w.title} width={w.width} height={w.height} labels={{ before: t.before, after: t.after, compare: t.compare }} />
          ) : (
            <div
              className="relative mx-auto overflow-hidden rounded-[2rem] bg-surface shadow-xl shadow-brand-900/10"
              style={{ aspectRatio: `${w.width} / ${w.height}`, width: `min(100%, calc(78vh * ${w.width} / ${w.height}))` }}
            >
              <Image src={w.image} alt={w.title} fill priority sizes="(min-width: 1024px) 720px, 100vw" className="object-cover animate-settle" />
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          {w.category ? (
            <Link href={`/c/${w.category.slug}`} className="chip animate-rise">{w.category.name}</Link>
          ) : null}
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight animate-rise [animation-delay:80ms] sm:text-4xl">{w.title}</h1>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted animate-rise [animation-delay:140ms]">
            {w.city ? (
              <li className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-brand-700" aria-hidden="true" />{w.city}</li>
            ) : null}
            {w.doneOn ? (
              <li className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 text-brand-700" aria-hidden="true" />{fmt(t.doneOn, { date: formatDate(w.doneOn) })}</li>
            ) : null}
          </ul>
          {w.description ? <p className="mt-5 whitespace-pre-line text-ink/85 animate-rise [animation-delay:200ms]">{w.description}</p> : null}
          <Link href={book.href} className="btn-primary shine relative mt-7 w-full overflow-hidden py-3 animate-rise [animation-delay:260ms] sm:w-auto">
            {book.label} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
          <ul className="mt-7 space-y-2.5 rounded-3xl bg-brand-50 p-5 text-sm text-ink/80 animate-rise [animation-delay:320ms]">
            <li className="flex gap-2.5"><BadgeCheck className="size-5 shrink-0 text-brand-700" aria-hidden="true" />{d.service.why1}</li>
            <li className="flex gap-2.5"><ShieldCheck className="size-5 shrink-0 text-brand-700" aria-hidden="true" />{fmt(d.service.warranty, { n: site.warrantyDays })}</li>
          </ul>
        </div>
      </div>

      {more.length ? (
        <section className="bg-surface py-14">
          <div className="container-page">
            <div className="mb-6 flex items-end justify-between gap-4" data-reveal suppressHydrationWarning>
              <h2 className="section-title">{t.more}</h2>
              <Link href="/our-work" className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700">
                {t.seeAll} <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((x, i) => (
                <WorkCard key={x.id} w={x} index={i} fixed />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}

/** Awaits params inside Suspense, so items added after the build still render. */
export default function WorkPage({ params }: PageProps<"/our-work/[id]">) {
  return (
    <Suspense fallback={<div className="container-page py-10"><div className="skeleton h-[480px] rounded-[2rem]" /></div>}>
      <WorkView params={params} />
    </Suspense>
  );
}
