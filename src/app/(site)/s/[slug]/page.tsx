import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { BadgeCheck, Check, ChevronRight, Clock, ShieldCheck, X } from "lucide-react";
import { getService, getServiceSlugs } from "@/lib/catalog";
import { readCart, cartCount } from "@/lib/cart";
import { formatDuration, percentOff, rupees } from "@/lib/format";
import { AddToCart } from "@/components/add-to-cart";
import { Rating, ServiceCard, ServiceImage } from "@/components/service-card";

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

/** Reads the cart cookie, so it streams in after the cached page. */
async function VariantButton({ variantId }: { variantId: string }) {
  const cart = await readCart();
  const qty = cart.find((e) => e.v === variantId)?.q ?? 0;
  return <AddToCart variantId={variantId} quantity={qty} />;
}

async function CartBar() {
  const count = await cartCount();
  if (!count) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 p-3 backdrop-blur" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
      <div className="container-page flex items-center justify-between gap-4">
        <p className="text-sm font-semibold">{count} {count === 1 ? "item" : "items"} in your cart</p>
        <Link href="/cart" className="btn-primary">View cart</Link>
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
  if (!s) notFound();

  return (
    <>
      <div className="container-page py-6">
        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-ink">Home</Link>
          <ChevronRight className="size-4" aria-hidden="true" />
          <Link href={`/c/${s.category.slug}`} className="hover:text-ink">{s.category.name}</Link>
          <ChevronRight className="size-4" aria-hidden="true" />
          <span className="text-ink">{s.name}</span>
        </nav>
      </div>

      <div className="container-page grid gap-10 pb-28 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-10">
          <section>
            <div className="relative aspect-[16/8] overflow-hidden rounded-3xl bg-surface">
              <ServiceImage src={s.image} alt={s.name} sizes="(min-width: 1024px) 700px, 100vw" priority />
            </div>
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">{s.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
              <Rating rating={s.rating} count={s.ratingCount} size="md" />
              <span className="inline-flex items-center gap-1.5 text-muted"><BadgeCheck className="size-4 text-brand-700" aria-hidden="true" /> Verified professionals</span>
              <span className="inline-flex items-center gap-1.5 text-muted"><ShieldCheck className="size-4 text-brand-700" aria-hidden="true" /> 30-day warranty</span>
            </div>
            <p className="mt-4 max-w-2xl text-muted">{s.description}</p>
          </section>

          <section aria-labelledby="options">
            <h2 id="options" className="text-xl font-bold">Choose an option</h2>
            <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
              {s.variants.map((v) => {
                const off = percentOff(v.price, v.mrp);
                return (
                  <li key={v.id} className="flex items-center justify-between gap-4 p-4 sm:p-5">
                    <div>
                      <p className="font-semibold">{v.name}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm">
                        <span className="font-bold">{rupees(v.price)}</span>
                        {v.mrp && v.mrp > v.price ? <span className="text-muted line-through">{rupees(v.mrp)}</span> : null}
                        {off ? <span className="font-semibold text-brand-700">{off}% off</span> : null}
                        <span className="inline-flex items-center gap-1 text-muted"><Clock className="size-3.5" aria-hidden="true" />{formatDuration(v.durationMins)}</span>
                      </p>
                    </div>
                    <Suspense fallback={<span className="btn-outline min-w-24 opacity-60">Add</span>}>
                      <VariantButton variantId={v.id} />
                    </Suspense>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl bg-brand-50 p-6">
              <h2 className="font-bold">What is included</h2>
              <ul className="mt-4 space-y-2.5 text-sm">
                {s.includes.map((i) => (
                  <li key={i} className="flex gap-2.5"><Check className="mt-0.5 size-4 shrink-0 text-brand-700" aria-hidden="true" />{i}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-surface p-6">
              <h2 className="font-bold">Not included</h2>
              <ul className="mt-4 space-y-2.5 text-sm text-muted">
                {s.excludes.length ? (
                  s.excludes.map((i) => (
                    <li key={i} className="flex gap-2.5"><X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />{i}</li>
                  ))
                ) : (
                  <li>Nothing extra. The price covers the full service.</li>
                )}
              </ul>
            </div>
          </section>

          {s.faqs.length ? (
            <section aria-labelledby="faqs">
              <h2 id="faqs" className="text-xl font-bold">Frequently asked questions</h2>
              <div className="mt-4 space-y-3">
                {s.faqs.map((f) => (
                  <details key={f.q} className="card group p-5">
                    <summary className="cursor-pointer list-none font-semibold [&::-webkit-details-marker]:hidden">
                      <span className="flex items-center justify-between gap-4">
                        {f.q}
                        <span className="text-xl text-brand-700 transition group-open:rotate-45">+</span>
                      </span>
                    </summary>
                    <p className="mt-3 text-sm text-muted">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <h2 className="font-bold">Why book with us</h2>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              <li className="flex gap-2.5"><BadgeCheck className="size-5 shrink-0 text-brand-700" aria-hidden="true" />Background-checked, trained professionals</li>
              <li className="flex gap-2.5"><ShieldCheck className="size-5 shrink-0 text-brand-700" aria-hidden="true" />Free redo if you are not satisfied</li>
              <li className="flex gap-2.5"><Clock className="size-5 shrink-0 text-brand-700" aria-hidden="true" />Free reschedule up to 2 hours before</li>
            </ul>
          </div>
          {s.related.length ? (
            <div className="space-y-4">
              <h2 className="font-bold">More in {s.category.name}</h2>
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
