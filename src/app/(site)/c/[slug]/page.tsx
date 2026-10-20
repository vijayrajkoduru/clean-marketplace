import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getCategory, getCategorySlugs } from "@/lib/catalog";
import { ServiceCard } from "@/components/service-card";
import { CategoryIcon } from "@/components/icons";
import { rupees } from "@/lib/format";

export async function generateStaticParams() {
  const slugs = await getCategorySlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/c/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategory(slug);
  if (!c) return {};
  return { title: `${c.name} at home`, description: c.description };
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
  const c = await getCategory(slug);
  if (!c) notFound();
  const from = c.services.length ? Math.min(...c.services.map((s) => s.fromPrice)) : null;

  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white">
        {c.image ? <Image src={c.image} alt="" fill priority sizes="100vw" className="object-cover opacity-35" /> : null}
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/80 to-ink/30" aria-hidden="true" />
        <div className="container-page relative py-14 sm:py-20">
          <nav className="mb-5 flex items-center gap-1 text-sm text-white/70" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white">Home</Link>
            <ChevronRight className="size-4" aria-hidden="true" />
            <span className="text-white">{c.name}</span>
          </nav>
          <span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-saffron">
            <CategoryIcon name={c.icon} className="size-6" />
          </span>
          <h1 className="mt-4 max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">{c.name}</h1>
          <p className="mt-3 max-w-xl text-lg text-white/80">{c.description}</p>
          {from !== null ? <p className="mt-5 text-sm text-white/70">{c.services.length} services, starting at <span className="font-bold text-white">{rupees(from)}</span></p> : null}
        </div>
      </section>
      <section className="container-page py-10">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {c.services.map((s) => (
            <ServiceCard key={s.id} s={s} />
          ))}
        </div>
      </section>
    </>
  );
}
