import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BadgeCheck, Check, ChevronRight, Clock, ShieldCheck, X } from "lucide-react";
import { getService, getServiceSlugs } from "@/lib/catalog";
import { readCart, cartCount } from "@/lib/cart";
import { formatDuration, percentOff, rupees } from "@/lib/format";
import { AddToCart } from "@/components/add-to-cart";
import { Rating, ServiceCard, ServiceImage, stagger } from "@/components/service-card";
import { site } from "@/config/site";
import { ServiceReviews } from "@/components/service-reviews";
import { fmt, plural, strings } from "@/strings";

export async function generateStaticParams() {
  const slugs = await getServiceSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/s/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await getService(slug);
  if (!s) return {};
  return { title: s.name, description: s.summary, openGraph: { images: s.image ? [s.image] : [] } };
}

/** Reads the cart cookie, so it streams in after the cached page. Per-plate packages open the menu builder. */
async function VariantButton({ variantId, slug, plate }: { variantId: string; slug: string; plate: boolean }) {
  const cart = await readCart();
  const entry = cart.find((e) => e.v === variantId);
  if (plate) {
    const m = strings.menu;
    return (
      <Link href={`/s/${slug}/menu?v=${variantId}`} className={`${entry ? "btn-outline" : "btn-primary"} shine relative shrink-0 overflow-hidden`}>
        {entry ? m.edit : m.choose}
      </Link>
    );
  }
  return <AddToCart variantId={variantId} quantity={entry?.q ?? 0} />;
}

async function CartBar() {
  const count = await cartCount();
  const d = strings;
  if (!count) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 p-3 backdrop-blur" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
      <div className="container-page flex items-center justify-between gap-4">
        <p className="text-sm font-semibold">{plural(count, d.service.cartItem, d.service.cartItems)}</p>
        <Link href="/cart" className="btn-primary">{d.service.viewCart}</Link>
      </div>
    </div>
  );
}

/** Awaits params inside Suspense, so services added after the build still render. */
export default function ServicePage({ params }: PageProps<"/s/[slug]">) {
  return (
    <Suspense
      fallback={
        <div className="container-page py-6">
          <div className="h-5 w-64 animate-pulse rounded bg-surface" />
          <div className="mt-6 aspect-[16/8] max-w-3xl animate-pulse rounded-3xl bg-surface" />
        </div>
      }
    >
      <ServiceView params={params} />
    </Suspense>
  );
}

async function ServiceView({ params }: { params: PageProps<"/s/[slug]">["params"] }) {
  const { slug } = await params;
  const s = await getService(slug);
  const d = strings;
  if (!s) notFound();
  const t = d.service;

  return (
    <>
      <div className="container-page py-6">
        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-ink">{d.catalog.home}</Link>
          <ChevronRight className="size-4" aria-hidden="true" />
          <Link href={`/c/${s.category.slug}`} className="hover:text-ink">{s.category.name}</Link>
          <ChevronRight className="size-4" aria-hidden="true" />
          <span className="text-ink">{s.name}</span>
        </nav>
      </div>

      <div className="container-page grid gap-10 pb-28 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-10">
          <section>
            <div className="relative aspect-[16/8] overflow-hidden rounded-[2rem] bg-surface shadow-xl shadow-brand-900/10">
              <ServiceImage src={s.image} alt={s.name} sizes="(min-width: 1024px) 700px, 100vw" priority className="animate-settle" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" aria-hidden="true" />
              <Link href={`/c/${s.category.slug}`} className="glass absolute bottom-4 left-4 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-800 transition hover:bg-white">
                {s.category.name}
              </Link>
            </div>
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight animate-rise sm:text-4xl">{s.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm animate-rise [animation-delay:100ms]">
              <Rating rating={s.rating} count={s.ratingCount} size="md" newLabel={d.card.newService} />
              <span className="inline-flex items-center gap-1.5 text-muted"><BadgeCheck className="size-4 text-brand-700" aria-hidden="true" /> {t.verified}</span>
              <span className="inline-flex items-center gap-1.5 text-muted"><ShieldCheck className="size-4 text-brand-700" aria-hidden="true" /> {fmt(t.warranty, { n: site.warrantyDays })}</span>
            </div>
            <p className="mt-4 max-w-2xl text-muted animate-rise [animation-delay:180ms]">{s.description}</p>
          </section>

          <section aria-labelledby="options">
            <h2 id="options" className="text-xl font-bold">{t.chooseOption}</h2>
            <ul className="mt-4 space-y-3">
              {s.variants.map((v, i) => {
                const off = percentOff(v.price, v.mrp);
                return (
                  <li
                    key={v.id}
                    data-reveal suppressHydrationWarning
                    style={stagger(i)}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-white p-4 transition duration-300 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-900/5 sm:p-5"
                  >
                    <div>
                      <p className="font-semibold">{v.name}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
                        <span className="font-bold">
                          {rupees(v.price)}
                          {v.unit === "plate" ? <span className="font-medium text-muted"> {d.menu.perPlate}</span> : null}
                        </span>
                        {v.mrp && v.mrp > v.price ? <span className="text-muted line-through">{rupees(v.mrp)}</span> : null}
                        {off ? <span className="font-semibold text-brand-700">{fmt(d.card.off, { n: off })}</span> : null}
                        {v.unit === "plate" && v.minGuests ? (
                          <span className="text-muted">{fmt(d.menu.minGuests, { n: v.minGuests })}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-muted"><Clock className="size-3.5" aria-hidden="true" />{formatDuration(v.durationMins)}</span>
                        )}
                      </p>
                    </div>
                    <Suspense fallback={<span className="btn-outline min-w-24 opacity-60">{v.unit === "plate" ? d.menu.choose : d.cartButton.add}</span>}>
                      <VariantButton variantId={v.id} slug={s.slug} plate={v.unit === "plate"} />
                    </Suspense>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-3xl bg-gradient-to-br from-brand-50 to-brand-100/60 p-6" data-reveal="left" suppressHydrationWarning>
              <h2 className="font-bold">{t.included}</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {s.includes.map((i) => (
                  <li key={i} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden="true" />{i}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-surface p-6" data-reveal="right" suppressHydrationWarning>
              <h2 className="font-bold">{t.notIncluded}</h2>
              <ul className="mt-4 space-y-2.5 text-sm text-muted">
                {s.excludes.length ? (
                  s.excludes.map((i) => (
                    <li key={i} className="flex gap-2.5"><X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />{i}</li>
                  ))
                ) : (
                  <li>{t.nothingExtra}</li>
                )}
              </ul>
            </div>
          </section>

          {s.faqs.length ? (
            <section aria-labelledby="faqs">
              <h2 id="faqs" className="text-xl font-bold">{t.faqs}</h2>
              <div className="mt-4 space-y-3">
                {s.faqs.map((f, i) => (
                  <details key={f.q} className="faq card group p-5 transition hover:border-brand-200" data-reveal suppressHydrationWarning style={stagger(i)}>
                    <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between gap-4">
                        {f.q}
                        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-50 text-lg text-brand-700 transition duration-300 group-open:rotate-45 group-open:bg-brand-600 group-open:text-white">+</span>
                      </span>
                    </summary>
                    <p className="mt-3 text-sm text-muted">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}

          <ServiceReviews serviceId={s.id} />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="relative overflow-hidden rounded-3xl border border-line bg-white p-6 shadow-sm animate-rise [animation-delay:150ms]">
            <div aria-hidden="true" className="absolute -right-12 -top-12 size-40 rounded-full bg-brand-50" />
            <h2 className="relative font-bold">{t.whyBook}</h2>
            <ul className="relative mt-4 space-y-3 text-sm text-muted">
              <li className="flex gap-2.5"><BadgeCheck className="size-5 shrink-0 text-brand-700" aria-hidden="true" />{t.why1}</li>
              <li className="flex gap-2.5"><ShieldCheck className="size-5 shrink-0 text-brand-700" aria-hidden="true" />{t.why2}</li>
              <li className="flex gap-2.5"><Clock className="size-5 shrink-0 text-brand-700" aria-hidden="true" />{t.why3}</li>
            </ul>
          </div>
          {s.related.length ? (
            <div className="space-y-4">
              <h2 className="font-bold">{fmt(t.moreIn, { name: s.category.name })}</h2>
              {s.related.slice(0, 2).map((r) => (
                <ServiceCard key={r.id} s={r} />
              ))}
            </div>
          ) : null}
        </aside>
      </div>

      <Suspense fallback={null}>
        <CartBar />
      </Suspense>
    </>
  );
}
