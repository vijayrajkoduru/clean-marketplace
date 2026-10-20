import Image from "next/image";
import Link from "next/link";
import { Clock, Star } from "lucide-react";
import type { ServiceCardData } from "@/lib/catalog";
import { formatDuration, percentOff, rupees } from "@/lib/format";

export function Rating({ rating, count, size = "sm" }: { rating: number | null; count: number; size?: "sm" | "md" }) {
  if (!rating) return <span className="chip">New</span>;
  return (
    <span className={`inline-flex items-center gap-1 font-semibold text-ink ${size === "md" ? "text-sm" : "text-xs"}`}>
      <Star className="size-3.5 fill-saffron text-saffron" aria-hidden="true" />
      {rating.toFixed(1)}
      <span className="font-normal text-muted">({count.toLocaleString("en-IN")})</span>
    </span>
  );
}

export function ServiceImage({ src, alt, sizes, priority = false }: { src: string | null; alt: string; sizes: string; priority?: boolean }) {
  if (!src) return <div className="absolute inset-0 bg-gradient-to-br from-brand-100 to-brand-300" aria-hidden="true" />;
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />;
}

export function ServiceCard({ s }: { s: ServiceCardData }) {
  const off = percentOff(s.fromPrice, s.fromMrp);
  return (
    <Link href={`/s/${s.slug}`} className="group card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-900/5">
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        <ServiceImage src={s.image} alt={s.name} sizes="(min-width: 1024px) 280px, (min-width: 640px) 45vw, 90vw" />
        {off ? <span className="absolute left-3 top-3 rounded-full bg-saffron px-2.5 py-1 text-xs font-bold text-ink">{off}% off</span> : null}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">{s.categoryName}</p>
        <h3 className="font-semibold leading-snug text-ink group-hover:text-brand-700">{s.name}</h3>
        <p className="line-clamp-2 text-sm text-muted">{s.summary}</p>
        <div className="mt-auto flex items-center justify-between pt-2">
          <div>
            <span className="text-xs text-muted">From </span>
            <span className="font-bold text-ink">{rupees(s.fromPrice)}</span>
            {s.fromMrp && s.fromMrp > s.fromPrice ? <span className="ml-1.5 text-xs text-muted line-through">{rupees(s.fromMrp)}</span> : null}
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <Clock className="size-3.5" aria-hidden="true" />
            {formatDuration(s.durationMins)}
          </span>
        </div>
        {s.rating ? <Rating rating={s.rating} count={s.ratingCount} /> : null}
      </div>
    </Link>
  );
}
