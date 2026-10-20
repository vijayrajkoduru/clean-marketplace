import Link from "next/link";
import { Logo } from "./logo";
import { site } from "@/config/site";
import { getCategories, getCities } from "@/lib/catalog";

export async function SiteFooter() {
  const [categories, cities] = await Promise.all([getCategories(), getCities()]);
  return (
    <footer className="mt-auto bg-ink text-white/80">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo light />
          <p className="max-w-xs text-sm leading-relaxed text-white/60">{site.description}</p>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold text-white">Services</h2>
          <ul className="space-y-2.5 text-sm">
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/c/${c.slug}`} className="hover:text-white">{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold text-white">Company</h2>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/about" className="hover:text-white">About us</Link></li>
            <li><Link href="/partner/join" className="hover:text-white">Become a professional</Link></li>
            <li><Link href="/help" className="hover:text-white">Help and FAQs</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact us</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="mb-4 text-sm font-semibold text-white">Cities we serve</h2>
          <ul className="space-y-2.5 text-sm">
            {cities.map((c) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>Prices include GST. Services are delivered by independent, verified professionals.</p>
          <nav className="flex flex-wrap gap-4" aria-label="Legal">
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/refund-policy" className="hover:text-white">Cancellation and refunds</Link>
            <Link href="/credits" className="hover:text-white">Photo credits</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
