import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { site } from "@/config/site";
import { rupees } from "@/lib/format";
import { LoginForm } from "./login-form";
import { strings, fmt } from "@/strings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: strings.login.metaTitle };
}

async function LoginGate({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  const user = await getCurrentUser();
  const d = strings;
  if (user) redirect(next);
  return (
    <>
      {sp.ref === "1" ? (
        <p className="mt-4 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
          {fmt(d.login.invited, { amount: rupees(site.referral.friendCredit) })}
        </p>
      ) : null}
      <LoginForm next={next} />
    </>
  );
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const d = strings;
  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-12">
      <div className="card w-full max-w-md p-7 shadow-sm sm:p-9">
        <h1 className="text-2xl font-bold">{d.login.title}</h1>
        <p className="mt-2 text-sm text-muted">{d.login.lead}</p>
        <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-xl bg-surface" />}>
          <LoginGate searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
