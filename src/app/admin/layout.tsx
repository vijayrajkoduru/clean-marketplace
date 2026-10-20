import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarCheck, LayoutDashboard, MapPinned, Package, Shapes, TicketPercent, Users, UserRoundCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { requireRole } from "@/lib/auth";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Admin" }, robots: { index: false } };

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/partners", label: "Professionals", icon: UserRoundCheck },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/services", label: "Services and prices", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Shapes },
  { href: "/admin/coupons", label: "Coupons", icon: TicketPercent },
  { href: "/admin/cities", label: "Cities", icon: MapPinned },
] as const;

async function AdminUser() {
  const user = await requireRole("ADMIN", "/admin");
  return <p className="truncate text-xs text-white/70">Signed in as {user.name ?? user.phone}</p>;
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
      <aside className="bg-brand-900 text-white lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0">
        <div className="flex items-center justify-between gap-3 px-5 py-4 lg:block">
          <Logo light />
          <div className="lg:mt-3">
            <Suspense fallback={<span className="block h-4 w-32 animate-pulse rounded bg-white/10" />}>
              <AdminUser />
            </Suspense>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3" aria-label="Admin">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white">
              <n.icon className="size-4" aria-hidden="true" />
              {n.label}
            </Link>
          ))}
          <Link href="/" className="mt-auto flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/60 hover:text-white lg:mt-6">
            View website
          </Link>
        </nav>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-white" />}>{children}</Suspense>
      </main>
    </div>
  );
}
