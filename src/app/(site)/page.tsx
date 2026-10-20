import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarClock, IndianRupee, ShieldCheck, Sparkles, ThumbsUp, Wallet } from "lucide-react";
import { getCategories, getCategory, getCities, getFeaturedServices } from "@/lib/catalog";
import { CategoryIcon } from "@/components/icons";
import { ServiceCard } from "@/components/service-card";
import { site } from "@/config/site";

const steps = [
  { icon: Sparkles, title: "Pick a service", text: "Choose from fixed-price services with everything included spelled out." },
  { icon: CalendarClock, title: "Choose a slot", text: "Book any day this week, from 8 AM to 7 PM, at a time that suits you." },
  { icon: ThumbsUp, title: "Relax", text: "A verified professional arrives on time. Pay online or after the job." },
];

const promises = [
  { icon: BadgeCheck, title: "Verified professionals", text: "Every professional passes ID checks and in-person training before their first job." },
  { icon: IndianRupee, title: "Fixed, upfront prices", text: "You see the full price before you book. No surprise charges at the door." },
  { icon: ShieldCheck, title: "30-day warranty", text: "If the same problem comes back within 30 days, we fix it free." },
  { icon: Wallet, title: "Pay your way", text: "UPI, cards and net banking online, or pay the professional after the service." },
];

const faqs = [
  { q: "How do I book a service?", a: "Pick a service, add it to your cart, choose an address and a time slot, and confirm. You get an SMS with your booking code." },
  { q: "Can I reschedule or cancel?", a: "Yes. Go to My bookings and reschedule or cancel free of charge up to 2 hours before your slot." },
  { q: "How do I pay?", a: "Pay online when you book, or pay the professional by UPI or cash after the job is done." },
  { q: "What if I am not happy with the service?", a: "Tell us within 7 days from My bookings and we will send a professional to redo the work at no cost." },
];

function HeroCollage() {
  const tiles = [
    { src: "/img/hero-1.jpg", alt: "A professional mopping a floor", className: "row-span-2" },
    { src: "/img/hero-2.jpg", alt: "An electrician repairing a switchboard", className: "" },
    { src: "/img/hero-3.jpg", alt: "A barber giving a haircut", className: "" },
  ];
  return (
    <div className="grid h-full min-h-[420px] grid-cols-2 grid-rows-2 gap-3">
      {tiles.map((t) => (
        <div key={t.src} className={`relative overflow-hidden rounded-3xl bg-brand-100 ${t.className}`}>
          <Image src={t.src} alt={t.alt} fill priority sizes="(min-width: 1024px) 300px, 45vw" className="object-cover" />
        </div>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const [categories, featured, cleaning, appliances, cities] = await Promise.all([
    getCategories(),
    getFeaturedServices(),
    getCategory("cleaning"),
    getCategory("ac-appliance-repair"),
    getCities(),
  ]);

  return (
    <>
      <section className="bg-gradient-to-b from-brand-50 to-white">
        <div className="container-page grid gap-10 py-10 lg:grid-cols-[1.05fr_1fr] lg:py-14">
          <div>
            <p className="chip mb-4">Now in {cities.length} cities across Andhra Pradesh and Telangana</p>
            <h1 className="max-w-xl text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Home services, done right, at your doorstep
            </h1>
            <p className="mt-4 max-w-lg text-lg text-muted">
              Cleaning, repairs, salon at home and more by verified professionals, at fixed prices.
            </p>
            <div className="card mt-8 p-4 shadow-sm sm:p-5">
              <h2 className="mb-4 text-sm font-semibold text-muted">What are you looking for?</h2>
              <ul className="grid grid-cols-3 gap-3">
                {categories.map((c) => (
                  <li key={c.id}>
                    <Link href={`/c/${c.slug}`} className="flex h-full flex-col items-center gap-2 rounded-2xl bg-surface p-3 text-center text-xs font-semibold text-ink transition hover:bg-brand-50 hover:text-brand-800 sm:text-sm">
                      <span className="grid size-11 place-items-center rounded-xl bg-white text-brand-700 shadow-sm">
                        <CategoryIcon name={c.icon} className="size-5" />
                      </span>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <HeroCollage />
        </div>
      </section>

      <section className="container-page py-10">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-3xl bg-brand-800 p-7 text-white">
            <p className="text-sm font-semibold text-brand-200">New here?</p>
            <h2 className="mt-1 text-2xl font-bold">₹100 off your first booking</h2>
            <p className="mt-2 text-sm text-white/75">Use code <span className="font-mono font-bold text-saffron">WELCOME100</span> on orders above ₹999.</p>
            <Link href="/c/cleaning" className="btn mt-5 bg-white text-brand-800 hover:bg-brand-50">Book a deep clean <ArrowRight className="size-4" /></Link>
            <Sparkles className="absolute -bottom-6 -right-6 size-36 text-white/10" aria-hidden="true" />
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-saffron-50 p-7">
            <p className="text-sm font-semibold text-saffron">Summer ready</p>
            <h2 className="mt-1 text-2xl font-bold text-ink">AC service from ₹499</h2>
            <p className="mt-2 text-sm text-muted">Foam-jet cleaning for better cooling and lower power bills.</p>
            <Link href="/s/ac-service" className="btn-dark mt-5">Book AC service <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </section>

      <section className="container-page py-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="section-title">Most booked services</h2>
          <Link href="/services" className="text-sm font-semibold text-brand-700 hover:text-brand-800">See all</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.slice(0, 8).map((s) => (
            <ServiceCard key={s.id} s={s} />
          ))}
        </div>
      </section>

      {[cleaning, appliances].map((cat) =>
        cat ? (
          <section key={cat.id} className="container-page py-8">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <h2 className="section-title">{cat.name}</h2>
                <p className="mt-1 text-muted">{cat.tagline}</p>
              </div>
              <Link href={`/c/${cat.slug}`} className="text-sm font-semibold text-brand-700 hover:text-brand-800">See all</Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {cat.services.slice(0, 4).map((s) => (
                <ServiceCard key={s.id} s={s} />
              ))}
            </div>
          </section>
        ) : null,
      )}

      <section className="bg-surface py-14">
        <div className="container-page">
          <h2 className="section-title text-center">How it works</h2>
          <ol className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="card p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-brand-700 text-white">
                  <s.icon className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-4 text-xs font-semibold text-brand-700">Step {i + 1}</p>
                <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-page py-14">
        <h2 className="section-title">Why people choose {site.name}</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {promises.map((p) => (
            <div key={p.title} className="rounded-2xl border border-line p-6">
              <p.icon className="size-7 text-brand-700" aria-hidden="true" />
              <h3 className="mt-4 font-bold">{p.title}</h3>
              <p className="mt-2 text-sm text-muted">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-14">
        <div className="grid overflow-hidden rounded-3xl bg-ink text-white md:grid-cols-2">
          <div className="p-8 sm:p-10">
            <p className="text-sm font-semibold text-saffron">For professionals</p>
            <h2 className="mt-2 text-3xl font-bold">Earn more with steady work near home</h2>
            <p className="mt-3 text-white/70">
              Join as a cleaner, technician, electrician, plumber, carpenter or beautician. Choose jobs that suit you and keep {site.partnerSharePercent}% of every job.
            </p>
            <Link href="/partner/join" className="btn mt-6 bg-saffron text-ink hover:bg-amber-400">Apply now <ArrowRight className="size-4" /></Link>
          </div>
          <div className="relative min-h-60">
            <Image src="/img/partner.jpg" alt="A professional at work" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          </div>
        </div>
      </section>

      <section className="bg-surface py-14">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="section-title">Questions people ask</h2>
            <p className="mt-3 text-muted">More answers on the <Link href="/help" className="font-semibold text-brand-700">help page</Link>.</p>
          </div>
          <div className="space-y-3">
            {faqs.map((f) => (
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
        </div>
      </section>
    </>
  );
}
