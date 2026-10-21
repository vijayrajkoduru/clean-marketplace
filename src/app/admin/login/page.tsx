import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/auth";
import { safeAdminNext } from "@/lib/safe-next";
import { Logo } from "@/components/logo";
import { LoginForm } from "@/app/(site)/login/login-form";

export const metadata: Metadata = { title: "Admin login", robots: { index: false } };

async function AdminLoginGate({ searchParams }: { searchParams: PageProps<"/admin/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeAdminNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  if (await getAdminUser()) redirect(next);
  return <LoginForm next={next} admin />;
}

/** The admin panel's own login. It is separate from the website login, so both can be open in one browser. */
export default function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main className="grid flex-1 place-items-center bg-surface px-4 py-12">
      <div className="card w-full max-w-md p-7 shadow-sm sm:p-9">
        <Logo />
        <h1 className="mt-6 text-2xl font-bold">Admin login</h1>
        <p className="mt-2 text-sm text-muted">
          This login is separate from the website. Logging in or out of the website as a customer in this browser does not sign you out here.
        </p>
        <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-xl bg-surface" />}>
          <AdminLoginGate searchParams={searchParams} />
        </Suspense>
        <Link href="/" className="mt-6 block text-center text-sm text-muted hover:text-ink">Go to the website</Link>
      </div>
    </main>
  );
}
