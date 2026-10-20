import Link from "next/link";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4">
      <div className="text-center">
        <div className="flex justify-center"><Logo /></div>
        <p className="mt-10 text-sm font-semibold text-brand-700">404</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">We could not find that page</h1>
        <p className="mt-3 text-muted">The link may be old, or the service may no longer be offered.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn-primary">Go home</Link>
          <Link href="/services" className="btn-outline">Browse services</Link>
        </div>
      </div>
    </main>
  );
}
