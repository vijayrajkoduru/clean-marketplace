import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Log in" };

async function LoginGate({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  if (await getCurrentUser()) redirect(next);
  return <LoginForm next={next} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-12">
      <div className="card w-full max-w-md p-7 shadow-sm sm:p-9">
        <h1 className="text-2xl font-bold">Log in or sign up</h1>
        <p className="mt-2 text-sm text-muted">We will send a 6-digit code to your mobile number. No password needed.</p>
        <Suspense fallback={<div className="mt-6 h-40 animate-pulse rounded-xl bg-surface" />}>
          <LoginGate searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
