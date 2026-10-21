import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { settlePartner } from "@/app/actions/admin";
import { formatDateTime, rupees } from "@/lib/format";
import { unsettledBalance } from "@/lib/payouts";
import { ActionForm, AdminLoading, PageTitle } from "../ui";

export const metadata = { title: "Payouts" };

function Direction({ amount }: { amount: number }) {
  if (amount > 0) return <span className="font-semibold text-emerald-700">Pay {rupees(amount)}</span>;
  if (amount < 0) return <span className="font-semibold text-amber-700">Collect {rupees(-amount)}</span>;
  return <span className="text-muted">Even</span>;
}

async function PayoutsContent() {
  await requireAdmin("/admin/payouts");
  const partners = await db.partner.findMany({
    where: { jobs: { some: { status: "COMPLETED", payoutId: null } } },
    include: { user: { select: { name: true, phone: true } }, city: { select: { name: true } } },
  });
  const rows = await Promise.all(partners.map(async (p) => ({ p, bal: await unsettledBalance(p.id) })));
  rows.sort((a, b) => Math.abs(b.bal.balance) - Math.abs(a.bal.balance));
  const history = await db.payout.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { partner: { include: { user: { select: { name: true } } } }, _count: { select: { bookings: true } } },
  });

  return (
    <div className="max-w-5xl">
      <PageTitle title="Payouts" />
      <p className="-mt-3 mb-6 text-sm text-muted">
        Each professional earns their share of every completed job. On pay-after-service jobs they collect the money from the customer, so that is
        subtracted. Pay the balance by UPI or bank transfer, or collect it if it is negative, then mark it settled here.
      </p>

      <section>
        <h2 className="mb-3 font-bold">To settle</h2>
        {rows.length ? (
          <ul className="space-y-3">
            {rows.map(({ p, bal }) => (
              <li key={p.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{p.user.name ?? "Professional"}</p>
                    <p className="text-sm text-muted">+91 {p.user.phone} · {p.city.name}</p>
                  </div>
                  <p className="text-lg"><Direction amount={bal.balance} /></p>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div><dt className="text-xs text-muted">Jobs</dt><dd className="font-medium">{bal.jobs}</dd></div>
                  <div><dt className="text-xs text-muted">Earnings</dt><dd className="font-medium">{rupees(bal.earnings)}</dd></div>
                  <div><dt className="text-xs text-muted">Cash they collected</dt><dd className="font-medium">{rupees(bal.collected)}</dd></div>
                </dl>
                <ActionForm action={settlePartner.bind(null, p.id)} submitLabel="Mark settled" className="mt-4 border-t border-line pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input name="reference" className="input" placeholder="UPI or bank reference (optional)" maxLength={80} />
                    <input name="note" className="input" placeholder="Note (optional)" maxLength={200} />
                  </div>
                </ActionForm>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-6 text-sm text-muted">Everyone is settled. Completed jobs appear here until you settle them.</p>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-bold">Settled</h2>
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Professional</th><th className="px-4 py-3">Jobs</th><th className="px-4 py-3">Earnings</th><th className="px-4 py-3">Collected</th><th className="px-4 py-3">Settled</th><th className="px-4 py-3">Reference</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="whitespace-nowrap px-4 py-3">{formatDateTime(h.createdAt)}</td>
                  <td className="px-4 py-3">{h.partner.user.name ?? "Professional"}</td>
                  <td className="px-4 py-3">{h._count.bookings}</td>
                  <td className="px-4 py-3">{rupees(h.earnings)}</td>
                  <td className="px-4 py-3">{rupees(h.collected)}</td>
                  <td className="px-4 py-3"><Direction amount={h.amount} /></td>
                  <td className="px-4 py-3 text-muted">{h.reference ?? "-"}{h.note ? <span className="block text-xs">{h.note}</span> : null}</td>
                </tr>
              ))}
              {!history.length ? <tr><td colSpan={7} className="px-4 py-6 text-center text-muted">No payouts yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function AdminPayouts() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <PayoutsContent />
    </Suspense>
  );
}
