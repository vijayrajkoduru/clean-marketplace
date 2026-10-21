import Image from "next/image";
import Link from "next/link";
import { ArrowLeftRight } from "lucide-react";
import type { WorkItem } from "@/lib/portfolio";
import { stagger } from "@/components/service-card";
import { strings } from "@/strings";

/**
 * A photo from "Our work". By default it keeps the photo's own shape, for the masonry gallery
 * (put it in a CSS columns container); `fixed` crops it to 4:3 for even rows.
 */
export function WorkCard({ w, index = 0, fixed = false, sizes }: { w: WorkItem; index?: number; fixed?: boolean; sizes?: string }) {
  const t = strings.work;
  const imgSizes = sizes ?? "(min-width: 1024px) 380px, (min-width: 640px) 45vw, 100vw";
  return (
    <Link
      href={`/our-work/${w.id}`}
      data-reveal suppressHydrationWarning
      style={stagger(index, 80)}
      className={`group relative block overflow-hidden rounded-3xl bg-surface shadow-sm ring-1 ring-line transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-900/15 ${fixed ? "aspect-[4/3]" : "mb-5 break-inside-avoid"}`}
    >
      {fixed ? (
        <Image src={w.image} alt={w.title} fill sizes={imgSizes} className="object-cover transition duration-700 ease-out group-hover:scale-105" />
      ) : (
        <Image src={w.image} alt={w.title} width={w.width} height={w.height} sizes={imgSizes} className="h-auto w-full transition duration-700 ease-out group-hover:scale-105" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-85 transition duration-300 group-hover:opacity-100" aria-hidden="true" />
      {w.beforeImage ? (
        <span className="glass absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-ink">
          <ArrowLeftRight className="size-3.5 text-brand-700" aria-hidden="true" />
          {t.beforeAfter}
        </span>
      ) : null}
      <div className="absolute inset-x-0 bottom-0 translate-y-1 p-4 text-white transition duration-300 group-hover:translate-y-0">
        {w.category ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-saffron">
            {w.category.name}
            {w.city ? ` · ${w.city}` : ""}
          </p>
        ) : null}
        <h3 className="mt-1 font-bold leading-snug">{w.title}</h3>
      </div>
    </Link>
  );
}
