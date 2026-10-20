import { rupees } from "@/lib/format";

type Bill = { subtotal: number; mrpTotal?: number; discount: number; fee: number; total: number; coupon?: { code: string } | null; couponCode?: string | null };

/** Item total, savings, fee and amount to pay. Used in the cart, checkout and booking pages. */
export function BillSummary({ totals, paid }: { totals: Bill; paid?: boolean }) {
  const savedOnPrice = totals.mrpTotal ? totals.mrpTotal - totals.subtotal : 0;
  const couponCode = totals.coupon?.code ?? totals.couponCode;
  return (
    <dl className="mt-3 space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted">Item total</dt>
        <dd>
          {savedOnPrice > 0 ? <span className="mr-1.5 text-xs text-muted line-through">{rupees(totals.mrpTotal!)}</span> : null}
          {rupees(totals.subtotal)}
        </dd>
      </div>
      {totals.discount > 0 ? (
        <div className="flex justify-between text-emerald-700">
          <dt>Coupon{couponCode ? ` (${couponCode})` : ""}</dt>
          <dd>-{rupees(totals.discount)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between">
        <dt className="text-muted">Visiting fee</dt>
        <dd>{totals.fee > 0 ? rupees(totals.fee) : <span className="font-semibold text-emerald-700">Free</span>}</dd>
      </div>
      <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
        <dt>{paid ? "Amount paid" : "Total"}</dt>
        <dd>{rupees(totals.total)}</dd>
      </div>
      <p className="text-xs text-muted">Prices include taxes.</p>
      {savedOnPrice + totals.discount > 0 ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">You save {rupees(savedOnPrice + totals.discount)} on this booking</p>
      ) : null}
    </dl>
  );
}
