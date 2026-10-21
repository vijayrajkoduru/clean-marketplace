import type { CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Clock, Star } from "lucide-react";
import type { ServiceCardData } from "@/lib/catalog";
import { formatDuration, percentOff, rupees } from "@/lib/format";
import { strings, fmt } from "@/strings";

export function Rating({ rating, count, size = "sm", newLabel = "New" }: { rating: number | null; count: number; size?: "sm" | "md"; newLabel?: string }) {
  if (!rating) return <span className="chip">{newLabel}</span>;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold text-ink ${size === "md" ? "text-sm" : "text-xs"}`}>
      <Star className="size-3.5 fill-saffron text-saffron" aria-hidden="true" />
      {rating.toFixed(1)}
      <span className="font-normal text-muted">({count.toLocaleString("en-IN")})</span>
    </span>
  );
}

export function ServiceImage({
  src,
  alt,
  sizes,
  priority = false,
  className = "",
}: {
  src: string | null;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  if (!src) return <div className="absolute inset-0 bg-gradient-to-br from-brand-100 to-brand-300" aria-hidden="true" />;
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={`object-cover ${className}`} />;
}

/** Stagger for cards in a grid: each card reveals a little after the one before it. */
export const stagger = (i: number, step = 70): CSSProperties => ({ "--reveal-delay": `${(i % 4) * step}ms` }) as CSSProperties;

export async function ServiceCard({ s, index = 0 }: { s: ServiceCardData; index?: number }) {
  const d = strings;
  const off = percentOff(s.fromPrice, s.fromMrp);
  return (
    <Link
      href={`/s/${s.slug}`}
      data-reveal suppressHydrationWarning
      style={stagger(index)}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-line bg-white transition duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-2xl hover:shadow-brand-900/15"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        <ServiceImage
          src={s.image}
          alt={s.name}
          sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw"
          className="transition duration-700 ease-out group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-black/0 opacity-80 transition duration-300 group-hover:opacity-100" aria-hidden="true" />
        {off ? <span className="absolute left-3 top-3 rounded-full bg-saffron px-2.5 py-1 text-xs font-bold text-ink shadow-sm">{fmt(d.card.off, { n: off })}</span> : null}
        <span className="glass absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-ink">
          <Clock className="size-3.5 text-brand-700" aria-hidden="true" />
          {formatDuration(s.durationMins)}
        </span>
        <span
          className="absolute bottom-3 right-3 grid size-9 translate-y-2 place-items-center rounded-full bg-white text-brand-700 opacity-0 shadow-lg transition duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          aria-hidden="true"
        >
          <ArrowUpRight className="size-4" />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{s.categoryName}</p>
        <h3 className="font-bold leading-snug text-ink transition group-hover:text-brand-700">{s.name}</h3>
        <p className="line-clamp-2 text-sm text-muted">{s.summary}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <span className="text-xs text-muted">{d.card.from} </span>
            <span className="text-lg font-extrabold text-ink">{rupees(s.fromPrice)}</span>
            {s.priceUnit === "plate" ? <span className="text-xs text-muted"> {d.menu.perPlate}</span> : null}
            {s.fromMrp && s.fromMrp > s.fromPrice ? <span className="ml-1.5 text-xs text-muted line-through">{rupees(s.fromMrp)}</span> : null}
          </div>
          {s.rating ? <Rating rating={s.rating} count={s.ratingCount} /> : null}
        </div>
      </div>
    </Link>
  );
}
