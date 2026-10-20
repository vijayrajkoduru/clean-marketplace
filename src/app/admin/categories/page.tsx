import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { saveCategory } from "@/app/actions/admin";
import { CategoryIcon } from "@/components/icons";
import { ActionForm, PageTitle, AdminLoading } from "../ui";

export const metadata = { title: "Categories" };

async function AdminCategoriesContent() {
  await requireRole("ADMIN", "/admin/categories");
  const categories = await db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { services: true } } } });

  return (
    <div className="max-w-4xl">
      <PageTitle title="Categories" />
      <div className="space-y-4">
        {categories.map((c) => (
          <details key={c.id} className="card group p-5">
            <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
              <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><CategoryIcon name={c.icon} className="size-5" /></span>
              <span className="flex-1">
                <span className="font-semibold">{c.name}</span>
                <span className="block text-xs text-muted">{c._count.services} services · /c/{c.slug}</span>
              </span>
              {c.active ? <span className="text-sm font-medium text-emerald-700">Live</span> : <span className="chip">Hidden</span>}
            </summary>
            <ActionForm action={saveCategory} className="mt-5 border-t border-line pt-5">
              <input type="hidden" name="id" value={c.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Name</label>
                  <input name="name" className="input" defaultValue={c.name} />
                </div>
                <div>
                  <label className="label">Tagline</label>
                  <input name="tagline" className="input" defaultValue={c.tagline} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Description</label>
                  <textarea name="description" rows={3} className="input" defaultValue={c.description} />
                </div>
                <div>
                  <label className="label">Image path</label>
                  <input name="image" className="input" defaultValue={c.image ?? ""} />
                </div>
                <label className="inline-flex items-center gap-2 self-end pb-2.5 text-sm font-medium">
                  <input type="checkbox" name="active" defaultChecked={c.active} className="size-4 accent-brand-700" /> Live on website
                </label>
              </div>
            </ActionForm>
          </details>
        ))}
      </div>
    </div>
  );
}

/** Own Suspense boundary, so moving between admin pages shows a placeholder instead of blocking. */
export default function AdminCategories() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminCategoriesContent />
    </Suspense>
  );
}
