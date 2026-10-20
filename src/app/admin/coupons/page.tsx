import { Suspense } from "react";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { saveCoupon, toggleCoupon } from "@/app/actions/admin";
import { formatDate, rupees } from "@/lib/format";
import { ActionButton, ActionForm, PageTitle, AdminLoading } from "../ui";

export const metadata = { title: "Coupons" };

function CouponFields({ c }: { c?: { code: string; description: string; type: string; value: number; minOrder: number; maxDiscount: number | null; usageLimit: number | null; expiresAt: Date | null } }) {
  const expires = c?.expiresAt ? new Date(c.expiresAt.getTime() + 330 * 60 * 1000).toISOString().slice(0, 10) : "";
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <label className="label">Code</label>
        {c ? (
          <>
            <input type="hidden" name="code" value={c.code} />
            <p className="input bg-surface font-mono font-bold">{c.code}</p>
          </>
        ) : (
          <input name="code" className="input font-mono uppercase" placeholder="DIWALI20" />
        )}
      </div>
      <div className="lg:col-span-3">
        <label className="label">Description (shown to customers)</label>
        <input name="description" className="input" defaultValue={c?.description} placeholder="20% off up to ₹250 on orders above ₹999" />
      </div>
      <div>
        <label className="label">Type</label>
        <select name="type" className="input" defaultValue={c?.type ?? "PERCENT"}>
          <option value="PERCENT">Percent off</option>
          <option value="FLAT">Flat ₹ off</option>
        </select>
      </div>
      <div>
        <label className="label">Value</label>
        <input name="value" type="number" min={1} className="input" defaultValue={c?.value} />
      </div>
      <div>
        <label className="label">Minimum order (₹)</label>
        <input name="minOrder" type="number" min={0} className="input" defaultValue={c?.minOrder ?? 0} />
      </div>
      <div>
        <label className="label">Max discount (₹)</label>
        <input name="maxDiscount" type="number" min={1} className="input" defaultValue={c?.maxDiscount ?? ""} placeholder="No cap" />
      </div>
      <div>
        <label className="label">Total uses allowed</label>
        <input name="usageLimit" type="number" min={1} className="input" defaultValue={c?.usageLimit ?? ""} placeholder="Unlimited" />
      </div>
      <div>
        <label className="label">Last valid date</label>
        <input name="expiresAt" type="date" className="input" defaultValue={expires} />
      </div>
    </div>
  );
}

async function AdminCouponsContent() {
  await requireRole("ADMIN", "/admin/coupons");
  const coupons = await db.coupon.findMany({ orderBy: [{ active: "desc" }, { createdAt: "desc" }] });

  return (
    <div className="max-w-5xl">
      <PageTitle title="Coupons" />
      <section className="card p-5 sm:p-6">
        <h2 className="font-bold">New coupon</h2>
        <ActionForm action={saveCoupon} className="mt-4" submitLabel="Create coupon" resetOnSuccess>
          <CouponFields />
        </ActionForm>
      </section>

      <div className="mt-6 space-y-3">
        {coupons.map((c) => (
          <details key={c.id} className="card p-5">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 [&::-webkit-details-marker]:hidden">
              <span className="font-mono text-lg font-bold">{c.code}</span>
              <span className="flex-1 text-sm text-muted">
                {c.type === "PERCENT" ? `${c.value}% off` : `${rupees(c.value)} off`}
                {c.minOrder ? ` · min ${rupees(c.minOrder)}` : ""}
                {c.maxDiscount ? ` · up to ${rupees(c.maxDiscount)}` : ""}
                {` · used ${c.usedCount}${c.usageLimit ? ` of ${c.usageLimit}` : ""}`}
                {c.expiresAt ? ` · until ${formatDate(c.expiresAt)}` : ""}
              </span>
              {c.active ? <span className="text-sm font-medium text-emerald-700">Active</span> : <span className="chip">Off</span>}
            </summary>
            <div className="mt-5 border-t border-line pt-5">
              <ActionForm action={saveCoupon} submitLabel="Save changes">
                <CouponFields c={c} />
              </ActionForm>
              <div className="mt-3">
                <ActionButton action={toggleCoupon.bind(null, c.code)} label={c.active ? "Turn off" : "Turn on"} className="btn-ghost text-sm" />
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

/** Own Suspense boundary, so moving between admin pages shows a placeholder instead of blocking. */
export default function AdminCoupons() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <AdminCouponsContent />
    </Suspense>
  );
}
