import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { saveCity, toggleCity } from "@/app/actions/admin";
import { ActionButton, ActionForm, PageTitle, AdminLoading } from "../ui";

export const metadata = { title: "Cities" };

async function AdminCitiesContent() {
  await requireRole("ADMIN", "/admin/cities");
  const cities = await db.city.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { bookings: true, partners: { where: { status: "APPROVED" } } } } },
  });

  return (
    <div className="max-w-4xl">
      <PageTitle title="Cities" />
      <p className="-mt-3 mb-6 text-sm text-muted">Bookings per slot is how many visits can start at the same hour in that city. Keep it at or below your number of active professionals.</p>
      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
            <tr><th className="px-4 py-3">City</th><th className="px-4 py-3">Bookings per slot</th><th className="px-4 py-3">Professionals</th><th className="px-4 py-3">Bookings</th><th className="px-4 py-3">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {cities.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium">{c.name}<span className="block text-xs font-normal text-muted">{c.state}</span></td>
                <td className="px-4 py-3">
                  <ActionForm action={saveCity} submitLabel="Save" className="flex items-center gap-2 [&>div]:mt-0">
                    <input type="hidden" name="name" value={c.name} />
                    <input type="hidden" name="state" value={c.state} />
                    <input name="slotCapacity" type="number" min={1} max={200} defaultValue={c.slotCapacity} className="input w-20" aria-label={`Bookings per slot in ${c.name}`} />
                  </ActionForm>
                </td>
                <td className="px-4 py-3">{c._count.partners}{c._count.partners < c.slotCapacity ? <span className="block text-xs text-amber-700">Fewer than slot capacity</span> : null}</td>
                <td className="px-4 py-3">{c._count.bookings}</td>
                <td className="px-4 py-3">
                  <ActionButton action={toggleCity.bind(null, c.id)} label={c.active ? "Live (turn off)" : "Off (turn on)"} className={c.active ? "btn-ghost text-emerald-700" : "btn-ghost text-muted"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="card mt-6 p-5 sm:p-6">
        <h2 className="font-bold">Add a city</h2>
        <ActionForm action={saveCity} className="mt-4" submitLabel="Add city" resetOnSuccess>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">City</label>
              <input name="name" className="input" placeholder="Warangal" />
            </div>
            <div>
              <label className="label">State</label>
              <input name="state" className="input" placeholder="Telangana" />
            </div>
            <div>
              <label className="label">Bookings per slot</label>
              <input name="slotCapacity" type="number" min={1} max={200} defaultValue={4} className="input" />
            </div>
          </div>
        </ActionForm>
      </section>
    </div>
  );
}

/** Own Suspense boundary, so moving between admin pages shows a placeholder instead of blocking. */
export default function AdminCities() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminCitiesContent />
    </Suspense>
  );
}
