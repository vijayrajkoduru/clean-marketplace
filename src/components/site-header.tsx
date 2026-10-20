import Link from "next/link";
import { Suspense } from "react";
import { CalendarCheck, ChevronDown, LayoutDashboard, LogOut, Search, ShoppingCart, User, Wrench } from "lucide-react";
import { Logo } from "./logo";
import { getCurrentUser } from "@/lib/auth";
import { cartCount } from "@/lib/cart";
import { logout } from "@/app/actions/auth";

function SearchForm({ className = "" }: { className?: string }) {
  return (
    <form action="/services" className={`relative ${className}`} role="search">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
      <input name="q" type="search" placeholder="Search for 'AC service' or 'sofa cleaning'" aria-label="Search services" className="input rounded-full bg-surface pl-10" />
    </form>
  );
}

async function HeaderActions() {
  const [user, count] = await Promise.all([getCurrentUser(), cartCount()]);
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Link href="/cart" className="btn-ghost relative px-3" aria-label={`Cart, ${count} items`}>
        <ShoppingCart className="size-5" aria-hidden="true" />
        <span className="hidden sm:inline">Cart</span>
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
            <span className="hidden max-w-28 truncate sm:inline">{user.name ?? "My account"}</span>
            <ChevronDown className="size-4" aria-hidden="true" />
          </summary>
          <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-line bg-white py-2 shadow-xl">
            <Link href="/bookings" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface">
              <CalendarCheck className="size-4 text-muted" aria-hidden="true" /> My bookings
            </Link>
            <Link href="/account" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface">
              <User className="size-4 text-muted" aria-hidden="true" /> Account and addresses
            </Link>
            {user.role === "PARTNER" || user.role === "ADMIN" ? (
              <Link href="/partner" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface">
                <Wrench className="size-4 text-muted" aria-hidden="true" /> Partner jobs
              </Link>
            ) : null}
            {user.role === "ADMIN" ? (
              <Link href="/admin" className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-surface">
                <LayoutDashboard className="size-4 text-muted" aria-hidden="true" /> Admin panel
              </Link>
            ) : null}
            <form action={logout} className="border-t border-line pt-1">
              <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-danger hover:bg-surface">
                <LogOut className="size-4" aria-hidden="true" /> Log out
              </button>
            </form>
          </div>
        </details>
      ) : (
        <Link href="/login" className="btn-primary px-4 py-2">
          Log in
        </Link>
      )}
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        <Logo />
        <nav className="ml-4 hidden items-center gap-1 text-sm font-medium lg:flex" aria-label="Main">
          <Link href="/services" className="rounded-lg px-3 py-2 text-muted hover:text-ink">All services</Link>
          <Link href="/partner/join" className="rounded-lg px-3 py-2 text-muted hover:text-ink">Become a professional</Link>
        </nav>
        <SearchForm className="mx-auto hidden w-full max-w-sm md:block" />
        <div className="ml-auto md:ml-0">
          <Suspense fallback={<div className="h-10 w-36 animate-pulse rounded-xl bg-surface" />}>
            <HeaderActions />
          </Suspense>
        </div>
      </div>
      <div className="container-page pb-3 md:hidden">
        <SearchForm />
      </div>
    </header>
  );
}
