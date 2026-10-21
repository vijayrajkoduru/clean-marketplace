import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { rupees } from "@/lib/format";
import { PageTitle, AdminLoading } from "../ui";

export const metadata = { title: "Services and prices" };

async function AdminServicesContent() {
  await requireAdmin("/admin/services");
  const categories = await db.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      services: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { variants: { orderBy: { price: "asc" } }, _count: { select: { bookingItems: true } } },
      },
    },
  });

  return (
    <div>
      <PageTitle title="Services and prices">
        <Link href="/admin/services/new" className="btn-primary"><Plus className="size-4" aria-hidden="true" /> New service</Link>
      </PageTitle>
      <div className="space-y-6">
        {categories.map((c) => (
          <section key={c.id}>
            <h2 className="mb-2 flex items-center gap-2 font-bold">
              {c.name}
              {!c.active ? <span className="chip">Hidden</span> : null}
            </h2>
            <div className="overflow-x-auto rounded-2xl border border-line bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
                  <tr><th className="px-4 py-2.5">Service</th><th className="px-4 py-2.5">Price options</th><th className="px-4 py-2.5">Booked</th><th className="px-4 py-2.5">Rating</th><th className="px-4 py-2.5">Visibility</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {c.services.map((s) => {
                    const live = s.variants.filter((v) => v.active);
                    return (
                      <tr key={s.id} className="hover:bg-surface">
                        <td className="px-4 py-3"><Link href={`/admin/services/${s.id}`} className="font-semibold text-brand-700">{s.name}</Link></td>
                        <td className="px-4 py-3">
                          {live.length ? `${live.length} from ${rupees(live[0].price)}` : <span className="font-semibold text-danger">No active price</span>}
                        </td>
                        <td className="px-4 py-3">{s._count.bookingItems}</td>
                        <td className="px-4 py-3">{s.ratingCount ? `${(s.ratingSum / s.ratingCount).toFixed(1)} (${s.ratingCount})` : "-"}</td>
                        <td className="px-4 py-3">
                          {s.active ? <span className="font-medium text-emerald-700">Live</span> : <span className="text-muted">Hidden</span>}
                          {s.featured ? <span className="chip ml-2">Featured</span> : null}
                        </td>
                      </tr>
                    );
                  })}
                  {!c.services.length ? <tr><td colSpan={5} className="px-4 py-4 text-muted">No services in this category.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Own Suspense boundary, so moving between admin pages shows a placeholder instead of blocking. */
export default function AdminServices() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminServicesContent />
    </Suspense>
  );
}
