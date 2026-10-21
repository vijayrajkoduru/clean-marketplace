import type { MenuLine } from "@/lib/menu-rules";
import { rupees } from "@/lib/format";

/** The dishes chosen for a catering order, by course. */
export function MenuSummary({ lines, className = "" }: { lines: MenuLine[]; className?: string }) {
  if (!lines.length) return null;
  return (
    <dl className={`grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr] ${className}`}>
      {lines.map((l) => (
        <div key={l.course} className="contents">
          <dt className="font-semibold text-ink">{l.course}</dt>
          <dd className="text-muted">
            {l.dishes.join(", ")}
            {l.extra ? <span className="ml-1 font-medium text-amber-700">(+{rupees(l.extra)} per plate)</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}
