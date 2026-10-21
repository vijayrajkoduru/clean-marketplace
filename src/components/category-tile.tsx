import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CategorySummary, ServiceCardData } from "@/lib/catalog";
import { rupees } from "@/lib/format";
import { CategoryIcon } from "@/components/icons";
import { stagger } from "@/components/service-card";
import { fmt, strings } from "@/strings";

/** A category as a photo tile: the photo zooms and an arrow slides in on hover. */
export function CategoryTile({ c, index = 0, wide = false }: { c: CategorySummary; index?: number; wide?: boolean }) {
  const t = strings.catalog;
  return (
    <Link
      href={`/c/${c.slug}`}
      data-reveal suppressHydrationWarning
      style={stagger(index)}
      className={`group relative isolate flex min-h-56 flex-col justify-end overflow-hidden rounded-3xl bg-brand-900 p-5 text-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-900/25 ${wide ? "sm:col-span-2" : ""}`}
    >
      {c.image ? (
        <Image
          src={c.image}
          alt=""
          fill
          sizes={wide ? "(min-width: 1024px) 560px, 100vw" : "(min-width: 1024px) 280px, (min-width: 640px) 45vw, 100vw"}
          className="-z-10 object-cover transition duration-700 ease-out group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-600 to-brand-900" aria-hidden="true" />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-black/5" aria-hidden="true" />
      <span className="glass-dark absolute left-4 top-4 grid size-11 place-items-center rounded-2xl text-white transition duration-300 group-hover:scale-110 group-hover:bg-white/25">
        <CategoryIcon name={c.icon} className="size-5" />
      </span>
      <span
        className="absolute right-4 top-4 grid size-9 -translate-x-2 place-items-center rounded-full bg-white text-ink opacity-0 shadow-lg transition duration-300 group-hover:translate-x-0 group-hover:opacity-100"
        aria-hidden="true"
      >
        <ArrowUpRight className="size-4" />
      </span>
      <h3 className={`font-bold leading-tight ${wide ? "text-2xl" : "text-lg"}`}>{c.name}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-white/80">{c.tagline}</p>
      {c.fromPrice !== null ? (
        <p className="mt-3 text-xs font-semibold text-saffron">{fmt(t.countFrom, { n: c.serviceCount, price: rupees(c.fromPrice) })}</p>
      ) : null}
    </Link>
  );
}

/** A service on a dark background, as a photo card with the name over the photo. */
export function PhotoServiceCard({ s, index = 0 }: { s: ServiceCardData; index?: number }) {
  const d = strings;
  return (
    <Link
      href={`/s/${s.slug}`}
      data-reveal suppressHydrationWarning
      style={stagger(index, 90)}
      className="group relative isolate flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 transition duration-300 hover:-translate-y-1 hover:ring-saffron/60"
    >
      {s.image ? (
        <Image src={s.image} alt="" fill sizes="(min-width: 1024px) 380px, (min-width: 640px) 45vw, 100vw" className="-z-10 object-cover transition duration-700 ease-out group-hover:scale-110" />
      ) : null}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent" aria-hidden="true" />
      <h3 className="text-lg font-bold text-white">{s.name}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-white/75">{s.summary}</p>
      <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur transition group-hover:bg-saffron group-hover:text-ink">
        {d.card.from} {rupees(s.fromPrice)}
        {s.priceUnit === "plate" ? ` ${d.menu.perPlate}` : ""}
        <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </p>
    </Link>
  );
}
