"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus, UtensilsCrossed, Users } from "lucide-react";
import { setCartMenu } from "@/app/actions/cart";
import { checkMenu, type ServiceMenu } from "@/lib/menu-rules";
import type { Variant } from "@/lib/catalog";
import { rupees } from "@/lib/format";
import { fmt, type Strings } from "@/strings";

type Labels = Strings["menu"];

function VegMark({ veg, labels }: { veg: boolean; labels: Labels }) {
  return (
    <span
      className={`grid size-3.5 shrink-0 place-items-center rounded-[3px] border-2 bg-white ${veg ? "border-emerald-600" : "border-red-600"}`}
      role="img"
      aria-label={veg ? labels.veg : labels.nonVeg}
    >
      <span className={`size-1.5 rounded-full ${veg ? "bg-emerald-600" : "bg-red-600"}`} />
    </span>
  );
}

/**
 * Builds a catering order: package, guests and dishes per course, with the per-plate price
 * worked out as the customer picks. The server checks everything again when it is saved.
 */
export function MenuBuilder({
  packages,
  menu,
  initialVariant,
  initial,
  inCart,
  labels,
}: {
  packages: Variant[];
  menu: ServiceMenu;
  initialVariant: string;
  initial: { guests?: number; dishes?: string[] } | null;
  inCart: boolean;
  labels: Labels;
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(initialVariant);
  const pkg = packages.find((p) => p.id === variantId) ?? packages[0];
  const [guests, setGuests] = useState(initial?.guests ?? pkg.minGuests ?? 50);
  const [picked, setPicked] = useState<Set<string>>(new Set(initial?.dishes ?? []));
  const [error, setError] = useState<string | null>(null);
  const [saving, start] = useTransition();

  const rules = useMemo(() => new Map((menu.rules[pkg.id] ?? []).map((r) => [r.courseId, r])), [menu, pkg.id]);
  const courses = menu.courses.filter((c) => c.fixed || rules.has(c.id));

  // Live status per course, and the first thing still missing.
  const status = courses
    .filter((c) => !c.fixed)
    .map((c) => {
      const r = rules.get(c.id)!;
      const count = c.dishes.filter((d) => picked.has(d.id)).length;
      return { course: c, rule: r, count };
    });
  const missing = status.find((s) => s.count < s.rule.minPick);
  const over = status.find((s) => s.count > s.rule.maxPick);
  const guestsOk = Number.isInteger(guests) && guests >= (pkg.minGuests || 1) && (!pkg.maxGuests || guests <= pkg.maxGuests);
  const check = checkMenu(menu, pkg.id, [...picked]);
  const extra = check.ok ? check.extraPerPlate : 0;
  const plate = pkg.price + extra;
  const total = plate * (guestsOk ? guests : 0);
  const blocker = missing
    ? fmt(labels.needMore, { course: missing.course.name, n: missing.rule.minPick - missing.count })
    : over
      ? fmt(labels.tooMany, { course: over.course.name, n: over.count - over.rule.maxPick })
      : !guestsOk
        ? fmt(labels.guestsError, { min: pkg.minGuests || 1, max: pkg.maxGuests || 5000 })
        : null;

  const choosePackage = (id: string) => {
    const next = packages.find((p) => p.id === id);
    if (!next) return;
    setVariantId(id);
    setError(null);
    // Keep the dishes the new package allows, up to its limits.
    const nextRules = new Map((menu.rules[id] ?? []).map((r) => [r.courseId, r]));
    const kept = new Set<string>();
    for (const c of menu.courses) {
      const r = nextRules.get(c.id);
      if (!r || c.fixed) continue;
      c.dishes.filter((d) => picked.has(d.id)).slice(0, r.maxPick).forEach((d) => kept.add(d.id));
    }
    setPicked(kept);
    if (next.minGuests && guests < next.minGuests) setGuests(next.minGuests);
  };

  const toggle = (dishId: string, courseId: string) => {
    const r = rules.get(courseId);
    if (!r) return;
    setError(null);
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(dishId)) next.delete(dishId);
      else {
        const course = menu.courses.find((c) => c.id === courseId)!;
        const count = course.dishes.filter((d) => next.has(d.id)).length;
        if (count >= r.maxPick) return prev;
        next.add(dishId);
      }
      return next;
    });
  };

  const save = () =>
    start(async () => {
      const r = await setCartMenu(pkg.id, guests, [...picked]);
      if (!r.ok) {
        setError(r.error ?? null);
        return;
      }
      router.push("/cart");
    });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="min-w-0 space-y-8">
        <section aria-labelledby="pkg">
          <h2 id="pkg" className="mb-3 font-bold">{labels.package}</h2>
          <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-labelledby="pkg">
            {packages.map((p) => {
              const on = p.id === pkg.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => choosePackage(p.id)}
                  className={`relative rounded-2xl border p-4 text-left transition duration-300 hover:-translate-y-0.5 ${on ? "border-brand-600 bg-brand-50 shadow-lg shadow-brand-900/10 ring-2 ring-brand-600" : "border-line bg-white hover:border-brand-300"}`}
                >
                  {on ? (
                    <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-brand-600 text-white">
                      <Check className="size-4" aria-hidden="true" />
                    </span>
                  ) : null}
                  <span className="block font-bold">{p.name}</span>
                  <span className="mt-1 block text-lg font-extrabold">
                    {rupees(p.price)}
                    <span className="text-sm font-medium text-muted"> {labels.perPlate}</span>
                  </span>
                  {p.mrp && p.mrp > p.price ? <span className="text-xs text-muted line-through">{rupees(p.mrp)}</span> : null}
                  {p.minGuests ? <span className="mt-1 block text-xs text-muted">{fmt(labels.minGuests, { n: p.minGuests })}</span> : null}
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="guests" className="rounded-3xl border border-line bg-white p-5">
          <label id="guests" htmlFor="guest-count" className="flex items-center gap-2 font-bold">
            <Users className="size-5 text-brand-700" aria-hidden="true" />
            {labels.guests}
          </label>
          <div className="mt-3 flex items-center gap-3">
            <button type="button" aria-label={labels.lessGuests} onClick={() => setGuests((g) => Math.max(pkg.minGuests || 1, g - 10))} className="grid size-11 place-items-center rounded-xl border border-line transition hover:border-brand-400 hover:text-brand-700">
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <input
              id="guest-count"
              type="number"
              inputMode="numeric"
              min={pkg.minGuests || 1}
              max={pkg.maxGuests || 5000}
              value={Number.isFinite(guests) ? guests : ""}
              onChange={(e) => setGuests(Math.floor(Number(e.target.value)))}
              className="input w-28 text-center text-lg font-bold"
            />
            <button type="button" aria-label={labels.moreGuests} onClick={() => setGuests((g) => Math.min(pkg.maxGuests || 5000, (Number.isFinite(g) ? g : 0) + 10))} className="grid size-11 place-items-center rounded-xl border border-line transition hover:border-brand-400 hover:text-brand-700">
              <Plus className="size-4" aria-hidden="true" />
            </button>
            <span className="text-sm text-muted">{fmt(labels.guestsHint, { min: pkg.minGuests || 1, max: pkg.maxGuests || 5000 })}</span>
          </div>
        </section>

        {courses.map((c) => {
          if (c.fixed) {
            return (
              <section key={c.id} className="rounded-3xl bg-gradient-to-br from-brand-50 to-brand-100/50 p-5" data-reveal suppressHydrationWarning>
                <h3 className="font-bold">{labels.fixed}</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {c.dishes.map((d) => (
                    <li key={d.id} className="inline-flex items-center gap-2 rounded-full bg-white py-1 pl-1 pr-3 text-sm font-medium shadow-sm">
                      {d.image ? (
                        <span className="relative size-8 overflow-hidden rounded-full">
                          <Image src={d.image} alt="" fill sizes="32px" className="object-cover" />
                        </span>
                      ) : (
                        <Check className="ml-2 size-3.5 text-brand-700" aria-hidden="true" />
                      )}
                      {d.name}
                    </li>
                  ))}
                </ul>
              </section>
            );
          }
          const r = rules.get(c.id)!;
          const count = c.dishes.filter((d) => picked.has(d.id)).length;
          const done = count >= r.minPick;
          const full = count >= r.maxPick;
          return (
            <section key={c.id} aria-labelledby={`course-${c.id}`} className="rounded-3xl border border-line bg-white p-5" data-reveal suppressHydrationWarning>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 id={`course-${c.id}`} className="font-bold">{c.name}</h3>
                  <p className="mt-0.5 text-sm text-muted">
                    {r.minPick === r.maxPick ? fmt(labels.pick, { n: r.minPick }) : fmt(labels.pickRange, { min: r.minPick, max: r.maxPick })}
                    {" · "}
                    {fmt(labels.included, { n: r.included })}
                    {r.maxPick > r.included && r.extraPrice ? ` · ${fmt(labels.extraEach, { price: rupees(r.extraPrice) })}` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums transition ${done ? "bg-brand-600 text-white" : "bg-saffron-50 text-amber-800"}`} aria-live="polite">
                  {fmt(labels.picked, { n: count, max: r.maxPick })}
                </span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {c.dishes.map((d) => {
                  const on = picked.has(d.id);
                  const disabled = !on && full;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      aria-pressed={on}
                      disabled={disabled}
                      onClick={() => toggle(d.id, c.id)}
                      className={`group relative overflow-hidden rounded-2xl border bg-white text-left transition duration-300 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:grayscale ${on ? "border-brand-600 shadow-lg shadow-brand-900/15 ring-2 ring-brand-600" : "border-line hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"}`}
                    >
                      <span className="relative block aspect-[4/3] overflow-hidden bg-surface">
                        {d.image ? (
                          <Image src={d.image} alt={d.name} fill sizes="(min-width: 1280px) 200px, (min-width: 640px) 30vw, 45vw" className="object-cover transition duration-500 group-hover:scale-110" />
                        ) : (
                          <span className="absolute inset-0 grid place-items-center bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700">
                            <UtensilsCrossed className="size-7" aria-hidden="true" />
                          </span>
                        )}
                        <span className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" aria-hidden="true" />
                        <span className="absolute left-2 top-2 rounded-md bg-white/90 p-1 shadow-sm">
                          <VegMark veg={d.veg} labels={labels} />
                        </span>
                        {d.extraPrice ? (
                          <span className="absolute bottom-2 right-2 rounded-full bg-saffron px-2 py-0.5 text-xs font-extrabold text-ink shadow">{fmt(labels.premium, { price: rupees(d.extraPrice) })}</span>
                        ) : null}
                        <span
                          className={`absolute right-2 top-2 grid size-7 place-items-center rounded-full shadow transition duration-300 ${on ? "scale-100 bg-brand-600 text-white" : "scale-75 bg-white/85 text-transparent"}`}
                          aria-hidden="true"
                        >
                          <Check className="size-4" />
                        </span>
                      </span>
                      <span className={`block px-3 py-2.5 text-sm font-semibold leading-snug ${on ? "bg-brand-50 text-brand-800" : "text-ink"}`}>{d.name}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-3xl border border-line bg-white p-6 shadow-xl shadow-brand-900/10">
          <h2 className="font-bold">{pkg.name}</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{labels.base}</dt><dd>{rupees(pkg.price)}</dd></div>
            {extra ? <div className="flex justify-between"><dt className="text-muted">{labels.extras}</dt><dd>+{rupees(extra)}</dd></div> : null}
            <div className="flex justify-between border-t border-line pt-2 font-semibold"><dt>{labels.plate}</dt><dd>{rupees(plate)}</dd></div>
          </dl>
          <p className="mt-4 text-sm text-muted">{fmt(labels.total, { n: guestsOk ? guests : 0 })}</p>
          <p className="text-3xl font-extrabold tracking-tight tabular-nums">{rupees(total)}</p>
          {blocker ? <p className="mt-3 rounded-xl bg-saffron-50 px-3 py-2 text-sm font-medium text-amber-900">{blocker}</p> : null}
          {error ? <p className="mt-3 text-sm font-medium text-danger" role="alert">{error}</p> : null}
          <button type="button" onClick={save} disabled={Boolean(blocker) || saving} className="btn-primary shine relative mt-5 w-full overflow-hidden py-3">
            {saving ? labels.adding : inCart ? labels.update : labels.add}
          </button>
        </div>
      </aside>
    </div>
  );
}
