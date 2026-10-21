import Link from "next/link";
import { Suspense } from "react";
import { Bell, CalendarCheck, ChevronDown, LayoutDashboard, LogOut, Search, ShoppingCart, User, Wrench } from "lucide-react";
import { Logo } from "./logo";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { cartCount } from "@/lib/cart";
import { countWork } from "@/lib/portfolio";
import { logout } from "@/app/actions/auth";
import { strings, fmt, type Strings } from "@/strings";

function SearchForm({ d, className = "" }: { d: Strings; className?: string }) {
  return (
    <form action="/services" className={`relative ${className}`} role="search">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input name="q" type="search" placeholder={d.header.searchPlaceholder} aria-label={d.header.searchLabel} className="input rounded-full bg-surface pl-10" />
    </form>
  );
}

async function HeaderActions() {
  const [user, count] = await Promise.all([getCurrentUser(), cartCount()]);
  const d = strings;
  const [unread, partner] = user
    ? await Promise.all([
        db.notification.count({ where: { userId: user.id, readAt: null } }),
        db.partner.findUnique({ where: { userId: user.id }, select: { id: true } }),
      ])
    : [0, null];
  const h = d.header;
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {user ? (
        <Link href="/notifications" className="btn-ghost relative px-3" aria-label={unread ? fmt(h.notificationsUnread, { n: unread }) : h.notifications}>
          <Bell className="size-5" aria-hidden="true" />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>
          ) : null}
        </Link>
      ) : null}
      <Link href="/cart" className="btn-ghost relative px-3" aria-label={fmt(h.cartLabel, { n: count })}>
        <ShoppingCart className="size-5" aria-hidden="true" />
        <span className="hidden sm:inline">{h.cart}</span>
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-saffron text-[11px] font-bold text-ink">{count}</span>
        ) : null}
      </Link>
      {user ? (
        <details className="relative">
          <summary className="btn-ghost cursor-pointer list-none px-3 [&::-webkit-details-marker]:hidden">
            <span className="grid size-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
              {(user.name ?? "U").slice(0, 1).toUpperCase()}
            </span>
            <span className="hidden max-w-28 truncate sm:inline">{user.name ?? h.myAccount}</span>
            <ChevronDown className="size-4" aria-hidden="true" />
          </summary>
          <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-line bg-white py-2 shadow-xl">
            <Link href="/bookings" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface">
              <CalendarCheck className="size-4 text-muted" aria-hidden="true" /> {h.myBookings}
            </Link>
            <Link href="/account" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface">
              <User className="size-4 text-muted" aria-hidden="true" /> {h.accountAddresses}
            </Link>
            {partner ? (
              <Link href="/partner" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface">
                <Wrench className="size-4 text-muted" aria-hidden="true" /> {h.partnerJobs}
              </Link>
            ) : null}
            {user.role === "ADMIN" ? (
              <Link href="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface">
                <LayoutDashboard className="size-4 text-muted" aria-hidden="true" /> {h.adminPanel}
              </Link>
            ) : null}
            <form action={logout} className="border-t border-line pt-1">
              <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-danger hover:bg-surface">
                <LogOut className="size-4" aria-hidden="true" /> {h.logout}
              </button>
            </form>
          </div>
        </details>
      ) : (
        <Link href="/login" className="btn-primary whitespace-nowrap px-4 py-2">
          {h.login}
        </Link>
      )}
    </div>
  );
}

export async function SiteHeader() {
  const d = strings;
  const workCount = await countWork();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur print:hidden">
      <div className="container-page flex h-16 items-center gap-4">
        <Logo />
        <nav className="ml-4 hidden items-center gap-1 text-sm font-medium lg:flex" aria-label="Main">
          <Link href="/services" className="relative whitespace-nowrap rounded-lg px-3 py-2 text-muted transition hover:text-ink after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-brand-500 after:transition-transform after:duration-300 hover:after:scale-x-100">{d.header.allServices}</Link>
          {workCount ? (
            <Link href="/our-work" className="relative whitespace-nowrap rounded-lg px-3 py-2 text-muted transition hover:text-ink after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-brand-500 after:transition-transform after:duration-300 hover:after:scale-x-100">{d.work.nav}</Link>
          ) : null}
          <Link href="/partner/join" className="relative whitespace-nowrap rounded-lg px-3 py-2 text-muted transition hover:text-ink after:absolute after:inset-x-3 after:bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-brand-500 after:transition-transform after:duration-300 hover:after:scale-x-100">{d.header.becomePro}</Link>
        </nav>
        <SearchForm d={d} className="mx-auto hidden w-full max-w-sm md:block" />
        <div className="ml-auto md:ml-0">
          <Suspense fallback={<div className="h-10 w-36 animate-pulse rounded-xl bg-surface" />}>
            <HeaderActions />
          </Suspense>
        </div>
      </div>
      <div className="container-page pb-3 md:hidden">
        <SearchForm d={d} />
      </div>
    </header>
  );
}
