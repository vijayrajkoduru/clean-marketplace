import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getService } from "@/lib/catalog";
import { readCart } from "@/lib/cart";
import { MenuBuilder } from "@/components/menu-builder";
import { strings } from "@/strings";

export const metadata: Metadata = { title: strings.menu.metaTitle, robots: { index: false } };

async function MenuView({ params, searchParams }: PageProps<"/s/[slug]/menu">) {
  const { slug } = await params;
  const sp = await searchParams;
  const s = await getService(slug);
  if (!s || !s.menu) notFound();
  const packages = s.variants.filter((v) => v.unit === "plate");
  if (!packages.length) notFound();
  const d = strings;
  const m = d.menu;
  const cart = await readCart();
  const inCart = cart.find((e) => packages.some((p) => p.id === e.v));
  const wanted = typeof sp.v === "string" ? sp.v : undefined;
  const initialVariant = packages.find((p) => p.id === wanted)?.id ?? inCart?.v ?? packages[0].id;
  const initial = inCart && inCart.v === initialVariant ? { guests: inCart.g, dishes: inCart.m } : null;

  return (
    <>
      <section className="relative isolate overflow-hidden bg-ink text-white">
        {s.image ? <Image src={s.image} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-45 animate-settle" /> : null}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/80 to-ink/30" aria-hidden="true" />
        <div className="container-page py-10 sm:py-14">
          <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm text-white/70" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">{d.catalog.home}</Link>
            <ChevronRight className="size-4" aria-hidden="true" />
            <Link href={`/s/${s.slug}`} className="hover:text-white">{s.name}</Link>
            <ChevronRight className="size-4" aria-hidden="true" />
            <span className="text-white">{m.title}</span>
          </nav>
          <h1 className="text-3xl font-extrabold tracking-tight animate-rise sm:text-5xl">{m.title}</h1>
          <p className="mt-3 max-w-2xl text-white/80 animate-rise [animation-delay:100ms]">{m.lead}</p>
        </div>
      </section>
      <div className="container-page space-y-8 py-8 pb-16">
        <p className="text-xs text-muted">{m.photoNote}</p>
        <MenuBuilder packages={packages} menu={s.menu} initialVariant={initialVariant} initial={initial} inCart={Boolean(inCart)} labels={m} />
      </div>
    </>
  );
}

/** Awaits params inside Suspense, so menus changed after the build still render. */
export default function MenuPage(props: PageProps<"/s/[slug]/menu">) {
  return (
    <Suspense fallback={<div className="container-page py-10"><div className="skeleton h-[520px] rounded-3xl" /></div>}>
      <MenuView {...props} />
    </Suspense>
  );
}
