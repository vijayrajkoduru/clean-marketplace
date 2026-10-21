import Link from "next/link";
import { Suspense } from "react";
import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { rupees } from "@/lib/format";
import { bookingsInRange, rangeBounds, RANGES, summarize, type RangeKey } from "@/lib/reports";
import { AdminLoading, PageTitle } from "../ui";

export const metadata = { title: "Reports" };

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** A table with a bar per row, scaled to the largest value. */
function BarTable({ title, rows, valueLabel }: { title: string; rows: { label: string; bookings: number; value: number }[]; valueLabel: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="card p-5">
      <h2 className="font-bold">{title}</h2>
      {rows.length ? (
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted">
            <tr><th className="pb-2 font-semibold">Name</th><th className="pb-2 text-right font-semibold">Bookings</th><th className="pb-2 pl-4 font-semibold">{valueLabel}</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="py-1.5 pr-3">{r.label}</td>
                <td className="py-1.5 text-right tabular-nums">{r.bookings}</td>
                <td className="w-1/2 py-1.5 pl-4">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 rounded-r bg-brand-600" style={{ width: `${Math.max(2, Math.round((r.value / max) * 100))}%` }} aria-hidden="true" />
                    <span className="shrink-0 tabular-nums">{rupees(r.value)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-2 text-sm text-muted">No completed bookings in this period.</p>
      )}
    </section>
  );
}

async function ReportsContent({ searchParams }: PageProps<"/admin/reports">) {
  await requireAdmin("/admin/reports");
  const sp = await searchParams;
  const raw = Array.isArray(sp.range) ? sp.range[0] : sp.range;
  const range: RangeKey = raw && raw in RANGES ? (raw as RangeKey) : "month";
  const [bookings, bounds] = await Promise.all([bookingsInRange(range), rangeBounds(range)]);
  const r = summarize(bookings, bounds);
  const maxDay = Math.max(1, ...r.days.map((d) => d.count));

  return (
    <div>
      <PageTitle title="Reports">
        <a href={`/api/admin/export?range=${range}`} className="btn-outline"><Download className="size-4" aria-hidden="true" /> Download bookings (Excel)</a>
      </PageTitle>
      <nav className="mb-6 flex flex-wrap gap-2" aria-label="Period">
        {(Object.keys(RANGES) as RangeKey[]).map((k) => (
          <Link key={k} href={`/admin/reports?range=${k}`} className={`rounded-full border px-4 py-1.5 text-sm font-medium ${k === range ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-white hover:border-brand-600"}`}>
            {RANGES[k]}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        <Kpi label="Booking value" value={rupees(r.totals.value)} hint="Completed visits" />
        <Kpi label="Your share" value={rupees(r.totals.share)} hint="After professionals' earnings" />
        <Kpi label="Average order" value={rupees(r.totals.average)} />
        <Kpi label="Bookings" value={String(r.totals.bookings)} hint={`${r.totals.completed} completed`} />
        <Kpi label="Cancelled" value={`${r.totals.cancelRate}%`} hint={`${r.totals.cancelled} ${r.totals.cancelled === 1 ? "booking" : "bookings"}`} />
        <Kpi label="Customers" value={String(r.totals.customers)} hint={`${r.totals.newCustomers} new`} />
        <Kpi label="Repeat customers" value={`${r.totals.repeatRate}%`} hint="Booked more than once" />
      </div>

      <section className="card mt-6 p-5">
        <h2 className="font-bold">Bookings per day</h2>
        <p className="text-xs text-muted">By visit date, excluding cancelled bookings.</p>
        <div className="mt-4 flex h-40 items-end gap-px overflow-x-auto" role="img" aria-label="Bookings per day chart">
          {r.days.map((d) => (
            <div key={d.day} className="group relative flex h-full min-w-1.5 max-w-10 flex-1 flex-col justify-end" title={`${d.day}: ${d.count}`}>
              <div className="rounded-t bg-brand-600 group-hover:bg-saffron" style={{ height: `${(d.count / maxDay) * 100}%`, minHeight: d.count ? 3 : 0 }} />
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted"><span>{r.days[0]?.day}</span><span>{r.days[r.days.length - 1]?.day}</span></div>
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs font-semibold text-brand-700">Show as table</summary>
          <table className="mt-2 text-xs">
            <tbody>
              {r.days.filter((d) => d.count).map((d) => <tr key={d.day}><td className="pr-4">{d.day}</td><td className="tabular-nums">{d.count}</td></tr>)}
            </tbody>
          </table>
        </details>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <BarTable title="By city" rows={r.byCity} valueLabel="Value" />
        <BarTable title="By category" rows={r.byCategory} valueLabel="Value" />
        <BarTable title="Top services" rows={r.topServices} valueLabel="Value" />
        <section className="card p-5">
          <h2 className="font-bold">Top professionals</h2>
          {r.pros.length ? (
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted">
                <tr><th className="pb-2 font-semibold">Name</th><th className="pb-2 text-right font-semibold">Jobs</th><th className="pb-2 text-right font-semibold">Earnings</th><th className="pb-2 text-right font-semibold">Rating</th></tr>
              </thead>
              <tbody>
                {r.pros.map((p) => (
                  <tr key={p.name}>
                    <td className="py-1.5">{p.name}</td>
                    <td className="py-1.5 text-right tabular-nums">{p.jobs}</td>
                    <td className="py-1.5 text-right tabular-nums">{rupees(p.earnings)}</td>
                    <td className="py-1.5 text-right tabular-nums">{p.ratings ? (p.ratingSum / p.ratings).toFixed(1) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="mt-2 text-sm text-muted">No completed jobs in this period.</p>
          )}
        </section>
      </div>
    </div>
  );
}

export default function AdminReports(props: PageProps<"/admin/reports">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <ReportsContent {...props} />
    </Suspense>
  );
}
