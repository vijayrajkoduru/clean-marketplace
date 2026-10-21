import Link from "next/link";
import { Logo } from "@/components/logo";
import { strings } from "@/strings";

export default async function NotFound() {
  const t = strings.notFound;
  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4">
      <div className="text-center">
        <div className="flex justify-center"><Logo /></div>
        <p className="mt-10 text-sm font-semibold text-brand-700">404</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{t.title}</h1>
        <p className="mt-3 text-muted">{t.text}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className="btn-primary">{t.home}</Link>
          <Link href="/services" className="btn-outline">{t.browse}</Link>
        </div>
      </div>
    </main>
  );
}
