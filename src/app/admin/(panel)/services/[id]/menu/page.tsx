import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { deleteCourse, deleteDish, saveCourse, saveDish, savePackageRules } from "@/app/actions/menu";
import { rupees } from "@/lib/format";
import { ActionButton, ActionForm, AdminLoading } from "../../../ui";

export const metadata = { title: "Menu and dishes" };

async function MenuEditorContent({ params }: PageProps<"/admin/services/[id]/menu">) {
  const { id } = await params;
  await requireAdmin(`/admin/services/${id}/menu`);
  const service = await db.service.findUnique({
    where: { id },
    include: {
      variants: { where: { unit: "plate" }, orderBy: { sortOrder: "asc" }, include: { menuRules: true } },
      menuCourses: { orderBy: { sortOrder: "asc" }, include: { dishes: { orderBy: { sortOrder: "asc" } } } },
    },
  });
  if (!service) notFound();
  const choice = service.menuCourses.filter((c) => !c.fixed);

  return (
    <div>
      <Link href={`/admin/services/${service.id}`} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
        <ChevronLeft className="size-4" aria-hidden="true" /> {service.name}
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Menu and dishes</h1>
        <Link href={`/s/${service.slug}/menu`} target="_blank" className="btn-outline">
          See it as a customer <ExternalLink className="size-4" aria-hidden="true" />
        </Link>
      </div>
      <p className="mb-6 max-w-3xl text-sm text-muted">
        Customers pick dishes per course for each package. In each package, &quot;Included&quot; dishes are in the plate price; they must pick at least
        &quot;Min&quot; and at most &quot;Max&quot;, and each dish beyond the included ones adds &quot;Extra&quot; per plate. A premium dish (for example mutton) can also
        add its own extra. Leave a course blank to leave it out of a package. &quot;Always served&quot; courses are part of every package and need no choice.
      </p>

      <section className="card mb-8 p-5">
        <h2 className="font-bold">Packages</h2>
        {service.variants.length ? (
          <div className="mt-4 space-y-6">
            {service.variants.map((v) => {
              const rule = new Map(v.menuRules.map((r) => [r.courseId, r]));
              return (
                <ActionForm key={v.id} action={savePackageRules.bind(null, v.id)} submitLabel={`Save ${v.name}`} className="rounded-xl border border-line p-4">
                  <p className="mb-3 font-semibold">
                    {v.name} · {rupees(v.price)} per plate{v.active ? "" : " (not live)"}
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead className="text-left text-muted">
                        <tr>
                          <th className="py-1.5 pr-3 font-medium">Course</th>
                          <th className="py-1.5 pr-3 font-medium">Included</th>
                          <th className="py-1.5 pr-3 font-medium">Min</th>
                          <th className="py-1.5 pr-3 font-medium">Max</th>
                          <th className="py-1.5 font-medium">Extra (₹ per plate)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {choice.map((c) => {
                          const r = rule.get(c.id);
                          return (
                            <tr key={c.id} className="border-t border-line">
                              <td className="py-1.5 pr-3 font-medium">{c.name}</td>
                              {(["inc", "min", "max", "extra"] as const).map((k) => (
                                <td key={k} className="py-1.5 pr-3">
                                  <input
                                    name={`${k}_${c.id}`}
                                    type="number"
                                    min={0}
                                    aria-label={`${c.name} ${k}`}
                                    className="input w-20 px-2 py-1.5"
                                    defaultValue={r ? { inc: r.included, min: r.minPick, max: r.maxPick, extra: r.extraPrice }[k] : ""}
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </ActionForm>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">
            No per-plate packages yet. On the service page, add a price option and set Priced to &quot;Per plate&quot;.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-bold">Courses and dishes</h2>
        {service.menuCourses.map((c) => (
          <div key={c.id} className="card p-5">
            <ActionForm action={saveCourse.bind(null, service.id, c.id)} submitLabel="Save course">
              <div className="grid items-end gap-3 sm:grid-cols-[2fr_auto_120px]">
                <div>
                  <label className="label" htmlFor={`course-${c.id}`}>Course</label>
                  <input id={`course-${c.id}`} name="name" className="input" defaultValue={c.name} />
                </div>
                <label className="flex items-center gap-2 pb-2.5 text-sm font-medium">
                  <input type="checkbox" name="fixed" defaultChecked={c.fixed} className="size-4 accent-brand-700" /> Always served
                </label>
                <div>
                  <label className="label" htmlFor={`order-${c.id}`}>Order</label>
                  <input id={`order-${c.id}`} name="sortOrder" type="number" min={0} className="input" defaultValue={c.sortOrder} />
                </div>
              </div>
            </ActionForm>
            <ul className="mt-4 space-y-2">
              {c.dishes.map((d) => (
                <li key={d.id} className="rounded-xl border border-line p-3">
                  <ActionForm action={saveDish.bind(null, c.id, d.id)} submitLabel="Save" className="flex flex-wrap items-end gap-3">
                    <div className="min-w-48 flex-1">
                      <label className="label" htmlFor={`dish-${d.id}`}>Dish</label>
                      <input id={`dish-${d.id}`} name="name" className="input" defaultValue={d.name} />
                    </div>
                    <div className="w-32">
                      <label className="label" htmlFor={`extra-${d.id}`}>Extra (₹/plate)</label>
                      <input id={`extra-${d.id}`} name="extraPrice" type="number" min={0} className="input" defaultValue={d.extraPrice} />
                    </div>
                    <label className="flex items-center gap-2 pb-2.5 text-sm"><input type="checkbox" name="veg" defaultChecked={d.veg} className="size-4 accent-brand-700" /> Veg</label>
                    <label className="flex items-center gap-2 pb-2.5 text-sm"><input type="checkbox" name="active" defaultChecked={d.active} className="size-4 accent-brand-700" /> On the menu</label>
                  </ActionForm>
                  <div className="mt-2 text-right">
                    <ActionButton action={deleteDish.bind(null, d.id)} label="Delete dish" confirmText={`Delete ${d.name}?`} className="btn-ghost px-2 py-1 text-xs text-danger" />
                  </div>
                </li>
              ))}
            </ul>
            <ActionForm action={saveDish.bind(null, c.id, null)} submitLabel="Add dish" resetOnSuccess className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-brand-300 bg-brand-50/40 p-3">
              <div className="min-w-48 flex-1">
                <label className="label" htmlFor={`new-dish-${c.id}`}>New dish</label>
                <input id={`new-dish-${c.id}`} name="name" className="input" placeholder="Dish name" />
              </div>
              <div className="w-32">
                <label className="label" htmlFor={`new-extra-${c.id}`}>Extra (₹/plate)</label>
                <input id={`new-extra-${c.id}`} name="extraPrice" type="number" min={0} className="input" defaultValue={0} />
              </div>
              <label className="flex items-center gap-2 pb-2.5 text-sm"><input type="checkbox" name="veg" defaultChecked className="size-4 accent-brand-700" /> Veg</label>
            </ActionForm>
            <div className="mt-3 text-right">
              <ActionButton action={deleteCourse.bind(null, c.id)} label="Delete course" confirmText={`Delete ${c.name} and its dishes?`} className="btn-ghost px-2 py-1 text-xs text-danger" />
            </div>
          </div>
        ))}
        <div className="card border-dashed p-5">
          <ActionForm action={saveCourse.bind(null, service.id, null)} submitLabel="Add course" resetOnSuccess>
            <div className="grid items-end gap-3 sm:grid-cols-[2fr_auto_120px]">
              <div>
                <label className="label" htmlFor="new-course">New course</label>
                <input id="new-course" name="name" className="input" placeholder="Live counters" />
              </div>
              <label className="flex items-center gap-2 pb-2.5 text-sm font-medium">
                <input type="checkbox" name="fixed" className="size-4 accent-brand-700" /> Always served
              </label>
              <div>
                <label className="label" htmlFor="new-order">Order</label>
                <input id="new-order" name="sortOrder" type="number" min={0} className="input" defaultValue={service.menuCourses.length} />
              </div>
            </div>
          </ActionForm>
        </div>
      </section>
    </div>
  );
}

/** Own Suspense boundary, so moving between admin pages shows a placeholder instead of blocking. */
export default function MenuEditor(props: PageProps<"/admin/services/[id]/menu">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <MenuEditorContent {...props} />
    </Suspense>
  );
}
