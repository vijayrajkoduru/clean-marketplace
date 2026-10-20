import { Suspense } from "react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { formatDate, formatDateTime, rupees } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { PageTitle, AdminLoading } from "../ui";

export const metadata = { title: "Customers" };

async function AdminCustomersContent({ searchParams }: PageProps<"/admin/customers">) {
  await requireRole("ADMIN", "/admin/customers");
  const sp = await searchParams;
  const q = String((Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "").trim();
  const digits = q.replace(/\D/g, "");
  const where: Prisma.UserWhereInput = q
    ? { OR: [...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []), { name: { contains: q } }] }
    : {};

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      _count: { select: { bookings: true } },
      bookings: { orderBy: { scheduledAt: "desc" }, take: q ? 10 : 1, select: { code: true, scheduledAt: true, status: true, total: true } },
    },
  });
  const spend = await db.booking.groupBy({
    by: ["customerId"],
    where: { customerId: { in: users.map((u) => u.id) }, paymentStatus: "PAID" },
    _sum: { total: true },
  });
  const spendOf = new Map(spend.map((s) => [s.customerId, s._sum.total ?? 0]));

  return (
    <div>
      <PageTitle title="Customers" />
      <form className="card mb-5 flex gap-2 p-4">
        <input name="q" defaultValue={q} placeholder="Search by phone or name" className="input max-w-md" aria-label="Search customers" />
        <button className="btn-dark">Search</button>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Bookings</th><th className="px-4 py-3 text-right">Paid total</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map((u) => (
              <tr key={u.id} className="align-top">
                <td className="px-4 py-3 font-medium">{u.name ?? "-"}{u.email ? <span className="block text-xs font-normal text-muted">{u.email}</span> : null}</td>
                <td className="px-4 py-3">{u.phone}</td>
                <td className="px-4 py-3 text-xs font-semibold">{u.role}</td>
                <td className="whitespace-nowrap px-4 py-3">{formatDate(u.createdAt)}</td>
                <td className="px-4 py-3">
                  {u._count.bookings}
                  {u.bookings.map((b) => (
                    <Link key={b.code} href={`/admin/bookings/${b.code}`} className="mt-1 flex items-center gap-2 text-xs text-brand-700">
                      <span className="font-mono">{b.code}</span>
                      <span className="text-muted">{formatDateTime(b.scheduledAt)} · {rupees(b.total)}</span>
                      <StatusBadge status={b.status} />
                    </Link>
                  ))}
                </td>
                <td className="px-4 py-3 text-right font-medium">{rupees(spendOf.get(u.id) ?? 0)}</td>
              </tr>
            ))}
            {!users.length ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No customers found.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Own Suspense boundary, so moving between admin pages shows a placeholder instead of blocking. */
export default function AdminCustomers(props: PageProps<"/admin/customers">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminCustomersContent {...props} />
    </Suspense>
  );
}
