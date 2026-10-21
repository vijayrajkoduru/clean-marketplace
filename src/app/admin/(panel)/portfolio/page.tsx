import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addWork, deleteWork, featureWork, toggleWork, updateWork } from "@/app/actions/portfolio";
import { formatDate } from "@/lib/format";
import { workPhotoUrl } from "@/lib/work-photos";
import { ActionButton, ActionForm, AdminLoading, PageTitle } from "../ui";

export const metadata = { title: "Our work" };

type Options = {
  categories: { id: string; name: string; services: { id: string; name: string }[] }[];
  cities: { id: string; name: string }[];
};

type ItemValues = {
  title: string;
  description: string;
  categoryId: string | null;
  serviceId: string | null;
  cityId: string | null;
  doneOn: Date | null;
  featured: boolean;
};

/** The day in India, as YYYY-MM-DD for a date input. */
const isoDay = (d: Date) => new Date(d.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10);

function WorkFields({ o, w, idPrefix }: { o: Options; w?: ItemValues; idPrefix: string }) {
  const id = (n: string) => `${idPrefix}-${n}`;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2">
        <label className="label" htmlFor={id("title")}>Title</label>
        <input id={id("title")} name="title" className="input" defaultValue={w?.title} placeholder="Birthday balloon decor in Madhapur" required />
      </div>
      <div>
        <label className="label" htmlFor={id("category")}>Category</label>
        <select id={id("category")} name="categoryId" className="input" defaultValue={w?.categoryId ?? ""}>
          <option value="">None</option>
          {o.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={id("service")}>Service <span className="font-normal text-muted">(for the Book button)</span></label>
        <select id={id("service")} name="serviceId" className="input" defaultValue={w?.serviceId ?? ""}>
          <option value="">None</option>
          {o.categories.map((c) => (
            <optgroup key={c.id} label={c.name}>
              {c.services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor={id("description")}>Description <span className="font-normal text-muted">(optional)</span></label>
        <textarea id={id("description")} name="description" rows={2} maxLength={600} className="input" defaultValue={w?.description} placeholder="What was done, for whom (no customer names), and anything special." />
      </div>
      <div>
        <label className="label" htmlFor={id("city")}>City</label>
        <select id={id("city")} name="cityId" className="input" defaultValue={w?.cityId ?? ""}>
          <option value="">None</option>
          {o.cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={id("doneOn")}>Date of the work</label>
        <input id={id("doneOn")} name="doneOn" type="date" className="input" defaultValue={w?.doneOn ? isoDay(w.doneOn) : ""} />
      </div>
      <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2 lg:col-span-4">
        <input type="checkbox" name="featured" defaultChecked={w?.featured} className="size-4 accent-brand-700" />
        Show on the home page
      </label>
    </div>
  );
}

async function AdminWorkContent() {
  await requireAdmin("/admin/portfolio");
  const [items, categories, cities] = await Promise.all([
    db.portfolioItem.findMany({
      orderBy: { createdAt: "desc" },
      include: { category: { select: { name: true } }, service: { select: { name: true } }, city: { select: { name: true } } },
    }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, services: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true } } } }),
    db.city.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const o: Options = { categories, cities };
  const live = items.filter((i) => i.active).length;

  return (
    <div>
      <PageTitle title="Our work">
        {live ? (
          <Link href="/our-work" className="btn-outline" target="_blank">View the gallery</Link>
        ) : null}
      </PageTitle>
      <p className="mb-6 max-w-3xl text-sm text-muted">
        Photos of real jobs and events, shown on the website and in the app under Our work. Use your own photos, and ask the customer before
        showing their home or event. Photos are resized and their hidden location data is removed when you upload them.
      </p>

      <div className="card mb-8 p-5">
        <h2 className="mb-4 font-bold">Add work</h2>
        <ActionForm action={addWork} submitLabel="Add to Our work" resetOnSuccess>
          <WorkFields o={o} idPrefix="new" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="new-photo">Photo of the finished work</label>
              <input id="new-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="input" required />
            </div>
            <div>
              <label className="label" htmlFor="new-before">Before photo <span className="font-normal text-muted">(optional, shows a before and after slider)</span></label>
              <input id="new-before" name="before" type="file" accept="image/jpeg,image/png,image/webp" className="input" />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">JPG, PNG or WEBP, up to 8 MB each.</p>
        </ActionForm>
      </div>

      <h2 className="mb-3 font-bold">
        {items.length} {items.length === 1 ? "item" : "items"} · {live} shown
      </h2>
      {items.length ? (
        <ul className="space-y-4">
          {items.map((w) => (
            <li key={w.id} className={`card overflow-hidden ${w.active ? "" : "opacity-60"}`}>
              <div className="flex flex-col gap-4 p-4 sm:flex-row">
                <div className="flex shrink-0 gap-2">
                  {w.beforeImage ? (
                    <div className="relative size-28 overflow-hidden rounded-xl bg-surface">
                      <Image src={workPhotoUrl(w.beforeImage)} alt="" fill sizes="112px" className="object-cover" />
                      <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[10px] font-bold text-white">BEFORE</span>
                    </div>
                  ) : null}
                  <div className="relative size-28 overflow-hidden rounded-xl bg-surface">
                    <Image src={workPhotoUrl(w.image)} alt="" fill sizes="112px" className="object-cover" />
                    {w.beforeImage ? <span className="absolute left-1 top-1 rounded bg-brand-700 px-1.5 text-[10px] font-bold text-white">AFTER</span> : null}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{w.title}</p>
                    {w.featured ? <span className="chip">On home page</span> : null}
                    {!w.active ? <span className="chip bg-surface text-muted">Hidden</span> : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {[w.category?.name, w.service?.name, w.city?.name, w.doneOn ? formatDate(w.doneOn) : null].filter(Boolean).join(" · ") || "No category"}
                  </p>
                  {w.description ? <p className="mt-1 line-clamp-2 text-sm">{w.description}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {w.active ? <Link href={`/our-work/${w.id}`} className="btn-outline" target="_blank">View</Link> : null}
                    <ActionButton action={featureWork.bind(null, w.id)} label={w.featured ? "Remove from home page" : "Show on home page"} />
                    <ActionButton action={toggleWork.bind(null, w.id)} label={w.active ? "Hide" : "Show"} />
                    <ActionButton action={deleteWork.bind(null, w.id)} label="Delete" confirmText={`Delete "${w.title}" and its photos? This cannot be undone.`} className="btn-ghost text-danger" />
                  </div>
                </div>
              </div>
              <details className="border-t border-line px-4 py-3">
                <summary className="cursor-pointer text-sm font-semibold text-brand-700">Edit details</summary>
                <div className="mt-3">
                  <ActionForm action={updateWork.bind(null, w.id)} submitLabel="Save">
                    <WorkFields o={o} w={w} idPrefix={w.id} />
                  </ActionForm>
                </div>
              </details>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card p-8 text-center text-sm text-muted">Nothing here yet. Add your first photo above. The gallery appears on the website and in the app once something is added.</p>
      )}
    </div>
  );
}

/** Own Suspense boundary, so moving between admin pages shows a placeholder instead of blocking. */
export default function AdminWork() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminWorkContent />
    </Suspense>
  );
}
