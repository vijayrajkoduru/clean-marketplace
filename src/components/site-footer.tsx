import Link from "next/link";
import { Logo } from "./logo";
import { site } from "@/config/site";
import { getCategories, getCities } from "@/lib/catalog";
import { countWork } from "@/lib/portfolio";
import { fmt, strings } from "@/strings";

export async function SiteFooter() {
  const [categories, cities, workCount] = await Promise.all([getCategories(), getCities(), countWork()]);
  const d = strings;
  const f = d.footer;
  return (
    <footer className="mt-auto bg-ink text-white/80 print:hidden">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo light />
          <p className="max-w-xs text-sm leading-relaxed text-white/60">{d.meta.description}</p>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold text-white">{f.services}</h2>
          <ul className="space-y-2.5 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/c/${c.slug}`} className="hover:text-white">{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold text-white">{f.company}</h2>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/about" className="hover:text-white">{f.about}</Link></li>
            {workCount ? <li><Link href="/our-work" className="hover:text-white">{d.work.nav}</Link></li> : null}
            <li><Link href="/plus" className="hover:text-white">{fmt(f.plus, { name: site.name })}</Link></li>
            <li><Link href="/account" className="hover:text-white">{f.refer}</Link></li>
            <li><Link href="/partner/join" className="hover:text-white">{f.becomePro}</Link></li>
            <li><Link href="/help" className="hover:text-white">{f.help}</Link></li>
            <li><Link href="/contact" className="hover:text-white">{f.contact}</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold text-white">{f.cities}</h2>
          <ul className="space-y-2.5 text-sm">
            {cities.map((c) => (
              <li key={c.id}>
                <Link href={`/in/${c.slug}`} className="hover:text-white">{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>{f.note}</p>
          <nav className="flex flex-wrap gap-4" aria-label="Legal">
            <Link href="/terms" className="hover:text-white">{f.terms}</Link>
            <Link href="/privacy" className="hover:text-white">{f.privacy}</Link>
            <Link href="/refund-policy" className="hover:text-white">{f.refunds}</Link>
            <Link href="/credits" className="hover:text-white">{f.credits}</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
