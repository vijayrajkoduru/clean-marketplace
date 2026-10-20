import Link from "next/link";
import { site } from "@/config/site";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label={`${site.name} home`}>
      <span className="grid size-9 place-items-center rounded-xl bg-brand-700 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 11.5 12 5l8 6.5" />
          <path d="M6.5 10v8.5h11V10" />
          <path d="M10.2 14.6c.7.9 1.4 1.3 1.8 1.3.9 0 1.8-1.2 1.8-2.4" />
        </svg>
      </span>
      <span className={`text-xl font-extrabold tracking-tight ${light ? "text-white" : "text-ink"}`}>
        {site.wordmark}
        <span className="text-saffron">.</span>
      </span>
    </Link>
  );
}
