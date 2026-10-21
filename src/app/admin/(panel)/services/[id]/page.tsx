import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { saveService, saveVariant } from "@/app/actions/admin";
import { parseList } from "@/lib/format";
import { ActionForm, AdminLoading } from "../../ui";

export const metadata = { title: "Edit service" };

function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm font-medium">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-brand-700" />
      {label}
    </label>
  );
}

function VariantFields({ v }: { v?: { name: string; price: number; mrp: number | null; durationMins: number; active: boolean; unit: string; minGuests: number; maxGuests: number } }) {
  return (
    <div className="space-y-3">
      <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <div>
          <label className="label">Option name</label>
          <input name="name" className="input" defaultValue={v?.name} placeholder="2 BHK" />
        </div>
        <div>
          <label className="label">Price (₹)</label>
          <input name="price" type="number" min={1} className="input" defaultValue={v?.price} />
        </div>
        <div>
          <label className="label">Original price (₹)</label>
          <input name="mrp" type="number" min={1} className="input" defaultValue={v?.mrp ?? ""} placeholder="Optional" />
        </div>
        <div>
          <label className="label">Minutes</label>
          <input name="durationMins" type="number" min={10} step={5} className="input" defaultValue={v?.durationMins ?? 60} />
        </div>
        <div className="pb-2.5"><Check name="active" label="Live" defaultChecked={v?.active ?? true} /></div>
      </div>
      <div className="grid items-end gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Priced</label>
          <select name="unit" className="input" defaultValue={v?.unit ?? "job"}>
            <option value="job">Per visit (customer picks a quantity)</option>
            <option value="plate">Per plate (catering, with guests and a menu)</option>
          </select>
        </div>
        <div>
          <label className="label">Min guests <span className="font-normal text-muted">(per plate only)</span></label>
          <input name="minGuests" type="number" min={0} className="input" defaultValue={v?.minGuests || ""} placeholder="50" />
        </div>
        <div>
          <label className="label">Max guests <span className="font-normal text-muted">(per plate only)</span></label>
          <input name="maxGuests" type="number" min={0} className="input" defaultValue={v?.maxGuests || ""} placeholder="2000" />
        </div>
      </div>
    </div>
  );
}

async function EditServiceContent({ params, searchParams }: PageProps<"/admin/services/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  await requireAdmin(`/admin/services/${id}`);
  const isNew = id === "new";
  const [service, categories] = await Promise.all([
    isNew ? null : db.service.findUnique({ where: { id }, include: { variants: { orderBy: [{ sortOrder: "asc" }, { price: "asc" }] }, category: true } }),
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!isNew && !service) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/admin/services" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ChevronLeft className="size-4" aria-hidden="true" /> Services
      </Link>
      <div className="mb-6 mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{service ? service.name : "New service"}</h1>
        {service ? (
          <Link href={`/s/${service.slug}`} className="btn-ghost text-brand-700" target="_blank">
            View on website <ExternalLink className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      {sp.created === "1" ? <p className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Service created. Add at least one price option below so customers can book it.</p> : null}

      <section className="card p-5 sm:p-6">
        <h2 className="font-bold">Details</h2>
        <ActionForm action={saveService} className="mt-4" submitLabel={isNew ? "Create service" : "Save details"}>
          {service ? <input type="hidden" name="id" value={service.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" name="name" className="input" defaultValue={service?.name} required />
            </div>
            <div>
              <label className="label" htmlFor="categoryId">Category</label>
              <select id="categoryId" name="categoryId" className="input" defaultValue={service?.categoryId ?? categories[0]?.id}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="summary">Short summary (shown on cards)</label>
              <input id="summary" name="summary" className="input" defaultValue={service?.summary} maxLength={160} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="description">Description</label>
              <textarea id="description" name="description" rows={4} className="input" defaultValue={service?.description} />
            </div>
            <div>
              <label className="label" htmlFor="includes">What is included (one per line)</label>
              <textarea id="includes" name="includes" rows={5} className="input" defaultValue={parseList(service?.includes).join("\n")} />
            </div>
            <div>
              <label className="label" htmlFor="excludes">What is not included (one per line)</label>
              <textarea id="excludes" name="excludes" rows={5} className="input" defaultValue={parseList(service?.excludes).join("\n")} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="image">Image path <span className="font-normal text-muted">(for example /img/svc/sofa.jpg; leave empty to use the category photo)</span></label>
              <input id="image" name="image" className="input" defaultValue={service?.image ?? ""} />
            </div>
            <div className="flex gap-6 sm:col-span-2">
              <Check name="active" label="Live on website" defaultChecked={service?.active ?? true} />
              <Check name="featured" label="Show in Most booked" defaultChecked={service?.featured ?? false} />
            </div>
          </div>
        </ActionForm>
      </section>

      {service ? (
        <section className="card mt-6 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">Price options</h2>
            {service.variants.some((v) => v.unit === "plate") ? (
              <Link href={`/admin/services/${service.id}/menu`} className="btn-outline">Menu and dishes</Link>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted">Prices include GST. The original price is shown struck through when it is higher. For per-plate options, the price is per guest and customers choose dishes from the menu.</p>
          <div className="mt-4 space-y-4">
            {service.variants.map((v) => (
              <ActionForm key={v.id} action={saveVariant} className="rounded-xl border border-line p-4" submitLabel="Save option">
                <input type="hidden" name="id" value={v.id} />
                <input type="hidden" name="serviceId" value={service.id} />
                <VariantFields v={v} />
              </ActionForm>
            ))}
            <ActionForm action={saveVariant} className="rounded-xl border border-dashed border-brand-300 bg-brand-50/40 p-4" submitLabel="Add option" resetOnSuccess>
              <p className="mb-3 text-sm font-semibold">Add a price option</p>
              <input type="hidden" name="serviceId" value={service.id} />
              <VariantFields />
            </ActionForm>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Own Suspense boundary, so moving between admin pages shows a placeholder instead of blocking. */
export default function EditService(props: PageProps<"/admin/services/[id]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <EditServiceContent {...props} />
    </Suspense>
  );
}
