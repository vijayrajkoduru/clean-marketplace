import { Star } from "lucide-react";
import { getServiceReviews } from "@/lib/catalog";
import { formatDate } from "@/lib/format";
import { fmt, plural, strings } from "@/strings";

function Stars({ rating, size = "size-4", label }: { rating: number; size?: string; label: string }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={`${size} ${n <= Math.round(rating) ? "fill-saffron text-saffron" : "text-line"}`} aria-hidden="true" />
      ))}
    </span>
  );
}

/** Rating summary and recent comments. Renders nothing until the service has a rating. */
export async function ServiceReviews({ serviceId }: { serviceId: string }) {
  const r = await getServiceReviews(serviceId);
  if (!r) return null;
  const t = strings.reviews;
  return (
    <section aria-labelledby="reviews">
      <h2 id="reviews" className="text-xl font-bold">{t.title}</h2>
      <div className="mt-4 grid gap-6 rounded-2xl border border-line p-5 sm:grid-cols-[180px_1fr]">
        <div>
          <p className="text-4xl font-extrabold">{r.average.toFixed(1)}</p>
          <Stars rating={r.average} label={fmt(t.outOf, { n: r.average })} />
          <p className="mt-1 text-sm text-muted">{plural(r.count, t.rating, t.ratings)}</p>
        </div>
        <ul className="space-y-1.5" aria-label={t.byStars}>
          {r.stars.map((s) => (
            <li key={s.star} className="flex items-center gap-3 text-sm">
              <span className="w-12 shrink-0 text-muted">{fmt(t.star, { n: s.star })}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                <span className="block h-full rounded-full bg-saffron" style={{ width: `${Math.round((s.count / r.count) * 100)}%` }} />
              </span>
              <span className="w-8 shrink-0 text-right text-muted">{s.count}</span>
            </li>
          ))}
        </ul>
      </div>
      {r.latest.some((x) => x.comment) ? (
        <ul className="mt-4 space-y-3">
          {r.latest.filter((x) => x.comment).map((x) => (
            <li key={x.id} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="font-semibold">{x.name === "Customer" ? t.customer : x.name}</span>
                <span className="text-xs text-muted">{formatDate(x.date)}</span>
              </div>
              <div className="mt-1"><Stars rating={x.rating} size="size-3.5" label={fmt(t.outOf, { n: x.rating })} /></div>
              <p className="mt-2 text-sm text-muted">{x.comment}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
