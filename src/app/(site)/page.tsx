import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  CalendarClock,
  Crown,
  IndianRupee,
  PartyPopper,
  Search,
  ShieldCheck,
  Sparkles,
  ThumbsUp,
  Wallet,
} from "lucide-react";
import { getCategories, getCategory, getCities, getFeaturedServices } from "@/lib/catalog";
import { getWork } from "@/lib/portfolio";
import { WorkCard } from "@/components/work-card";
import { rupees } from "@/lib/format";
import { CategoryIcon } from "@/components/icons";
import { ServiceCard, stagger } from "@/components/service-card";
import { CategoryTile, PhotoServiceCard } from "@/components/category-tile";
import { CountUp, RotatingWords } from "@/components/motion";
import { site } from "@/config/site";
import { fmt, strings } from "@/strings";

const STEP_ICONS = [Sparkles, CalendarClock, ThumbsUp];
const PROMISE_ICONS = [BadgeCheck, IndianRupee, ShieldCheck, Wallet];
const TRUST_ICONS = [BadgeCheck, IndianRupee, ShieldCheck];

/** Soft moving colour behind a section. */
function Aurora({ dark = false }: { dark?: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className={`absolute -left-32 -top-40 size-[30rem] rounded-full blur-3xl animate-aurora ${dark ? "bg-brand-500/30" : "bg-brand-300/45"}`} />
      <div className={`absolute -right-24 top-10 size-[26rem] rounded-full blur-3xl animate-aurora [animation-delay:-6s] ${dark ? "bg-saffron/20" : "bg-saffron/25"}`} />
      <div className={`absolute -bottom-40 left-1/3 size-[24rem] rounded-full blur-3xl animate-aurora [animation-delay:-11s] ${dark ? "bg-brand-700/40" : "bg-brand-200/60"}`} />
    </div>
  );
}

export default async function HomePage() {
  const [categories, featured, cleaning, appliances, events, cities, work] = await Promise.all([
    getCategories(),
    getFeaturedServices(),
    getCategory("cleaning"),
    getCategory("ac-appliance-repair"),
    getCategory("parties-events"),
    getCities(),
    getWork({ limit: 6, featuredFirst: true }),
  ]);
  const d = strings;
  const t = d.home;
  const w = d.work;
  const acFrom = appliances?.services.find((s) => s.slug === "ac-service")?.fromPrice ?? 499;
  const serviceTotal = categories.reduce((n, c) => n + c.serviceCount, 0);
  // Event services get their own showcase, so the main grid shows the everyday ones first.
  const everyday = featured.filter((s) => s.categoryName !== events?.name);

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
        <Aurora />
        <div aria-hidden="true" className="dot-grid pointer-events-none absolute inset-0 -z-10" />
        <div className="container-page grid items-center gap-12 py-12 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div className="animate-rise">
            <p className="chip mb-5 gap-2 bg-white/85 shadow-sm ring-1 ring-brand-100 backdrop-blur">
              <span className="size-2 rounded-full bg-brand-500 animate-pulse-ring" aria-hidden="true" />
              {fmt(t.cityChip, { n: cities.length })}
            </p>
            <h1 className="max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-[3.4rem]">{t.title}</h1>
            <p className="mt-5 text-lg font-medium text-ink/80 sm:text-xl">
              {t.heroFor} <RotatingWords words={t.heroWords} className="font-extrabold text-gradient" />
            </p>
            <p className="mt-3 max-w-lg text-muted">{t.lead}</p>

            <form action="/services" role="search" className="mt-8 flex max-w-xl items-center gap-2 rounded-2xl bg-white p-2 shadow-xl shadow-brand-900/10 ring-1 ring-line transition focus-within:ring-2 focus-within:ring-brand-300">
              <Search className="ml-2 size-5 shrink-0 text-muted" aria-hidden="true" />
              <input name="q" type="search" placeholder={d.header.searchPlaceholder} aria-label={d.header.searchLabel} className="min-w-0 flex-1 bg-transparent px-1 py-2 text-[15px] outline-none placeholder:text-muted/80" />
              <button className="btn-primary shine relative overflow-hidden px-6">{t.searchCta}</button>
            </form>

            <ul className="mt-5 flex flex-wrap gap-2">
              {categories.slice(0, 6).map((c, i) => (
                <li key={c.id} className="animate-rise" style={{ animationDelay: `${200 + i * 70}ms` }}>
                  <Link
                    href={`/c/${c.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-white/90 px-3.5 py-2 text-sm font-semibold text-ink shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700 hover:shadow-md"
                  >
                    <CategoryIcon name={c.icon} className="size-4 text-brand-600" />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-ink/80">
              {t.trust.map((label, i) => {
                const Icon = TRUST_ICONS[i] ?? BadgeCheck;
                return (
                  <li key={label} className="inline-flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-brand-700">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    {label}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Photo collage with floating cards */}
          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="grid h-[380px] grid-cols-2 grid-rows-2 gap-4 sm:h-[540px]">
              <div className="relative row-span-2 overflow-hidden rounded-[2rem] bg-brand-100 shadow-2xl shadow-brand-900/20 animate-float">
                <Image src="/img/hero/cleaner-mopping.jpg" alt={t.heroAlt1} fill priority sizes="(min-width: 1024px) 300px, 45vw" className="object-cover" />
              </div>
              <div className="relative overflow-hidden rounded-[2rem] bg-brand-100 shadow-xl shadow-brand-900/15 animate-float-slow [animation-delay:-2s]">
                <Image src="/img/hero/electrician-panel.jpg" alt={t.heroAlt2} fill priority sizes="(min-width: 1024px) 300px, 45vw" className="object-cover" />
              </div>
              <div className="relative overflow-hidden rounded-[2rem] bg-brand-100 shadow-xl shadow-brand-900/15 animate-float [animation-delay:-4s]">
                <Image src="/img/hero/wedding-mandap.jpg" alt={t.heroAlt3} fill priority sizes="(min-width: 1024px) 300px, 45vw" className="object-cover" />
              </div>
            </div>
            <div className="glass absolute -left-3 top-8 hidden items-center gap-3 rounded-2xl p-3 pr-4 sm:flex animate-float-slow">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-600 text-white">
                <BadgeCheck className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">{t.cardVerified}</span>
                <span className="block text-xs text-muted">{t.cardVerifiedText}</span>
              </span>
            </div>
            <div className="glass absolute -right-3 top-[46%] hidden items-center gap-3 rounded-2xl p-3 pr-4 sm:flex animate-float [animation-delay:-3s]">
              <span className="grid size-10 place-items-center rounded-xl bg-saffron text-ink">
                <CalendarCheck className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink">{t.cardSlots}</span>
                <span className="block text-xs text-muted">{t.cardSlotsText}</span>
              </span>
            </div>
            <Link
              href="/c/parties-events"
              className="glass absolute -bottom-5 left-6 flex items-center gap-3 rounded-2xl p-2.5 pr-4 transition hover:-translate-y-0.5 animate-float-slow [animation-delay:-5s]"
            >
              <span className="relative size-11 overflow-hidden rounded-xl">
                <Image src="/img/hero/makeup-artist.jpg" alt={t.heroAlt4} fill sizes="44px" className="object-cover" />
              </span>
              <span>
                <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  <PartyPopper className="size-4 text-saffron" aria-hidden="true" />
                  {t.cardEvents}
                </span>
                <span className="block text-xs text-muted">{t.cardEventsText}</span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Scrolling strip of categories ---------- */}
      <section aria-label={t.marqueeLabel} className="border-y border-line bg-white py-4">
        <div className="fade-edges overflow-hidden">
          <ul className="flex w-max gap-3 animate-marquee hover:[animation-play-state:paused]">
            {[...categories, ...categories].map((c, i) => {
              const copy = i >= categories.length;
              return (
                <li key={`${c.id}-${i}`} aria-hidden={copy || undefined}>
                  <Link
                    href={`/c/${c.slug}`}
                    tabIndex={copy ? -1 : undefined}
                    className="flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                  >
                    <CategoryIcon name={c.icon} className="size-4 text-brand-600" />
                    {c.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ---------- Categories as photo tiles ---------- */}
      <section className="container-page py-14 sm:py-20">
        <div className="mb-8 max-w-2xl" data-reveal suppressHydrationWarning>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{t.exploreKicker}</p>
          <h2 className="section-title mt-2">{t.exploreTitle}</h2>
          <p className="mt-2 text-muted">{fmt(t.exploreLead, { n: serviceTotal, c: categories.length })}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c, i) => (
            <CategoryTile key={c.id} c={c} index={i} wide={c.slug === "parties-events"} />
          ))}
        </div>
      </section>

      {/* ---------- Offers ---------- */}
      <section className="container-page pb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div data-reveal="left" suppressHydrationWarning className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 bg-[length:200%_auto] p-7 text-white animate-gradient">
            <p className="text-sm font-semibold text-brand-200">{t.newHere}</p>
            <h2 className="mt-1 text-2xl font-bold">{t.welcomeTitle}</h2>
            <p className="mt-2 text-sm text-white/75">
              {t.welcomeText.split("{code}")[0]}
              <span className="font-mono font-bold text-saffron">WELCOME100</span>
              {t.welcomeText.split("{code}")[1]}
            </p>
            <Link href="/c/cleaning" className="btn shine relative mt-5 overflow-hidden bg-white text-brand-800 hover:bg-brand-50">
              {t.welcomeCta} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </Link>
            <Sparkles className="absolute -bottom-6 -right-6 size-40 text-white/10 transition duration-700 group-hover:rotate-12 group-hover:scale-110" aria-hidden="true" />
          </div>
          <div data-reveal="right" suppressHydrationWarning className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-saffron-50 to-amber-100 p-7">
            <p className="text-sm font-semibold text-amber-700">{t.acKicker}</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">{fmt(t.acTitle, { price: rupees(acFrom) })}</h2>
            <p className="mt-2 text-sm text-muted">{t.acText}</p>
            <Link href="/s/ac-service" className="btn-dark shine relative mt-5 overflow-hidden">
              {t.acCta} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
            </Link>
            <CategoryIcon name="air-vent" className="absolute -bottom-5 -right-4 size-36 text-amber-300/50 transition duration-700 group-hover:-rotate-6 group-hover:scale-110" />
          </div>
        </div>
        <Link href="/plus" data-reveal suppressHydrationWarning className="group mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink px-6 py-4 text-white transition hover:bg-black">
          <span className="flex items-center gap-3">
            <Crown className="size-5 shrink-0 text-saffron transition group-hover:-rotate-12 group-hover:scale-110" aria-hidden="true" />
            <span>
              <span className="font-bold">{site.name} Plus</span>
              <span className="text-white/75"> · {fmt(t.plusText, { percent: site.plus.discountPercent, price: rupees(site.plus.price) })}</span>
            </span>
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-saffron">
            {t.plusCta} <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </Link>
      </section>

      {/* ---------- Most booked ---------- */}
      <section className="container-page py-12">
        <div className="mb-6 flex items-end justify-between gap-4" data-reveal suppressHydrationWarning>
          <h2 className="section-title">{t.mostBooked}</h2>
          <Link href="/services" className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
            {t.seeAll} <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
        {/* Three columns when the count fills rows of three better than rows of four (6 cards: 3 + 3, not 4 + 2). */}
        <div className={`grid gap-5 sm:grid-cols-2 ${everyday.slice(0, 8).length % 4 !== 0 && everyday.slice(0, 8).length % 3 === 0 ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
          {everyday.slice(0, 8).map((s, i) => (
            <ServiceCard key={s.id} s={s} index={i} />
          ))}
        </div>
      </section>

      {/* ---------- Parties and events ---------- */}
      {events && events.services.length ? (
        <section className="relative isolate overflow-hidden bg-ink py-16 text-white sm:py-24">
          <Aurora dark />
          <div className="container-page">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div data-reveal="left" suppressHydrationWarning>
                <p className="inline-flex items-center gap-2 rounded-full bg-saffron/15 px-3 py-1 text-sm font-semibold text-saffron ring-1 ring-saffron/30">
                  <PartyPopper className="size-4" aria-hidden="true" />
                  {t.eventsKicker}
                </p>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">{t.eventsTitle}</h2>
                <p className="mt-4 max-w-xl text-white/75">{t.eventsText}</p>
                <ul className="mt-6 flex flex-wrap gap-2">
                  {t.eventsPoints.map((p) => (
                    <li key={p} className="glass-dark rounded-full px-3.5 py-1.5 text-sm font-medium text-white/90">{p}</li>
                  ))}
                </ul>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link href={`/c/${events.slug}`} className="btn shine relative overflow-hidden bg-saffron px-6 py-3 text-ink hover:bg-amber-400">
                    {t.eventsCta} <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  <p className="text-sm text-white/60">{t.eventsNote}</p>
                </div>
              </div>
              <div data-reveal="right" suppressHydrationWarning className="relative">
                <div className="relative aspect-[16/10] overflow-hidden rounded-[2rem] ring-1 ring-white/10 shadow-2xl shadow-black/40">
                  <Image src="/img/banner/events.jpg" alt={t.eventsAlt} fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover transition duration-[1.5s] hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" aria-hidden="true" />
                </div>
                <div className="glass absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl p-3 pr-4 text-ink animate-float-slow">
                  <span className="grid size-10 place-items-center rounded-xl bg-brand-600 text-white">
                    <CalendarCheck className="size-5" aria-hidden="true" />
                  </span>
                  <span className="text-sm font-bold">{fmt(d.catalog.countFrom, { n: events.services.length, price: rupees(Math.min(...events.services.map((s) => s.fromPrice))) })}</span>
                </div>
              </div>
            </div>
            <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.services.map((s, i) => (
                <PhotoServiceCard key={s.id} s={s} index={i} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ---------- Category rows ---------- */}
      {[cleaning, appliances].map((cat) =>
        cat ? (
          <section key={cat.id} className="container-page py-12">
            <div className="mb-6 flex items-end justify-between gap-4" data-reveal suppressHydrationWarning>
              <div>
                <h2 className="section-title">{cat.name}</h2>
                <p className="mt-1 text-muted">{cat.tagline}</p>
              </div>
              <Link href={`/c/${cat.slug}`} className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
                {t.seeAll} <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {cat.services.slice(0, 4).map((s, i) => (
                <ServiceCard key={s.id} s={s} index={i} />
              ))}
            </div>
          </section>
        ) : null,
      )}

      {/* ---------- Our work (only once there are photos) ---------- */}
      {work.length ? (
        <section className="container-page py-12">
          <div className="mb-6 flex items-end justify-between gap-4" data-reveal suppressHydrationWarning>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{w.homeKicker}</p>
              <h2 className="section-title mt-1">{w.homeTitle}</h2>
              <p className="mt-1 text-muted">{w.homeLead}</p>
            </div>
            <Link href="/our-work" className="group inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
              {w.seeAll} <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {work.map((x, i) => (
              <WorkCard key={x.id} w={x} index={i} fixed />
            ))}
          </div>
        </section>
      ) : null}

      {/* ---------- Numbers ---------- */}
      <section className="container-page py-10">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-r from-brand-800 via-brand-600 to-brand-800 bg-[length:200%_auto] px-6 py-10 text-white animate-gradient sm:px-12 sm:py-12">
          <div aria-hidden="true" className="absolute -right-10 -top-10 -z-10 size-56 rounded-full bg-white/10 blur-2xl" />
          <dl className="grid grid-cols-2 gap-8 lg:grid-cols-4">
            {[
              { value: serviceTotal, label: t.stats.services },
              { value: categories.length, label: t.stats.categories },
              { value: cities.length, label: t.stats.cities },
              { value: 30, label: t.stats.warranty },
            ].map((s, i) => (
              <div key={s.label} data-reveal suppressHydrationWarning style={stagger(i, 110)} className="flex flex-col-reverse">
                <dt className="mt-1 text-sm text-white/80">{s.label}</dt>
                <dd className="text-4xl font-extrabold tracking-tight sm:text-5xl">
                  <CountUp value={s.value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="relative overflow-hidden bg-surface py-16 sm:py-20">
        <div className="container-page" data-reveal suppressHydrationWarning>
          <h2 className="section-title text-center">{t.howItWorks}</h2>
          <div className="relative mx-auto mt-12 max-w-5xl">
            <svg className="absolute left-[16%] top-8 hidden h-1 w-[68%] md:block" viewBox="0 0 100 2" preserveAspectRatio="none" aria-hidden="true">
              <line x1="0" y1="1" x2="100" y2="1" stroke="url(#steps-line)" strokeWidth="2" vectorEffect="non-scaling-stroke" className="draw-line" />
              <defs>
                <linearGradient id="steps-line" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="#16a088" />
                  <stop offset="1" stopColor="#f4a321" />
                </linearGradient>
              </defs>
            </svg>
            <ol className="relative grid gap-8 md:grid-cols-3">
              {t.steps.map((s, i) => {
                const Icon = STEP_ICONS[i] ?? Sparkles;
                return (
                  <li key={s.title} className="group text-center" data-reveal suppressHydrationWarning style={stagger(i, 160)}>
                    <span className="relative mx-auto grid size-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-lg shadow-brand-900/20 ring-8 ring-surface transition duration-300 group-hover:-translate-y-1 group-hover:rotate-3">
                      <Icon className="size-7" aria-hidden="true" />
                      <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-saffron text-xs font-extrabold text-ink">{i + 1}</span>
                    </span>
                    <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-brand-700">{fmt(t.step, { n: i + 1 })}</p>
                    <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
                    <p className="mx-auto mt-2 max-w-xs text-sm text-muted">{s.text}</p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------- Promises ---------- */}
      <section className="container-page py-16">
        <h2 className="section-title" data-reveal suppressHydrationWarning>{fmt(t.whyTitle, { name: site.name })}</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {t.promises.map((p, i) => {
            const Icon = PROMISE_ICONS[i] ?? BadgeCheck;
            return (
              <div
                key={p.title}
                data-reveal suppressHydrationWarning
                style={stagger(i)}
                className="group relative overflow-hidden rounded-3xl border border-line bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/10"
              >
                <span aria-hidden="true" className="absolute -right-8 -top-8 size-28 rounded-full bg-brand-50 transition duration-500 group-hover:scale-150" />
                <span className="relative grid size-12 place-items-center rounded-2xl bg-brand-100 text-brand-700 transition duration-300 group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="relative mt-5 font-bold">{p.title}</h3>
                <p className="relative mt-2 text-sm text-muted">{p.text}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------- For professionals ---------- */}
      <section className="container-page pb-16">
        <div data-reveal="zoom" suppressHydrationWarning className="group grid overflow-hidden rounded-[2rem] bg-ink text-white md:grid-cols-2">
          <div className="relative isolate p-8 sm:p-12">
            <div aria-hidden="true" className="absolute -left-16 -top-16 -z-10 size-64 rounded-full bg-brand-600/30 blur-3xl" />
            <p className="text-sm font-semibold text-saffron">{t.proKicker}</p>
            <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{t.proTitle}</h2>
            <p className="mt-3 text-white/70">{fmt(t.proText, { percent: site.partnerSharePercent })}</p>
            <Link href="/partner/join" className="btn shine relative mt-6 overflow-hidden bg-saffron text-ink hover:bg-amber-400">
              {t.proCta} <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="relative min-h-64 overflow-hidden">
            <Image src="/img/partner.jpg" alt={t.proAlt} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover transition duration-[1.5s] group-hover:scale-105" />
            <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-ink/60 to-transparent" />
            <span className="glass absolute bottom-5 right-5 rounded-full px-4 py-2 text-sm font-bold text-ink">
              {fmt(t.proBadge, { percent: site.partnerSharePercent })}
            </span>
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="bg-surface py-16">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div data-reveal suppressHydrationWarning>
            <h2 className="section-title">{t.faqTitle}</h2>
            <p className="mt-3 text-muted">
              {t.faqMore} <Link href="/help" className="font-semibold text-brand-700">{t.faqMoreLink}</Link>.
            </p>
          </div>
          <div className="space-y-3">
            {t.faqs.map((f, i) => (
              <details key={f.q} className="faq card group p-5 transition hover:border-brand-200 open:shadow-lg open:shadow-brand-900/5" data-reveal suppressHydrationWarning style={stagger(i)}>
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
        </div>
      </section>
    </>
  );
}
