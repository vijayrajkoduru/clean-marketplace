import { rupees } from "@/lib/format";
import { fmt, strings } from "@/strings";

type Bill = {
  subtotal: number;
  mrpTotal?: number;
  discount: number;
  plusDiscount?: number;
  walletUsed?: number;
  plusFee?: number;
  fee: number;
  total: number;
  coupon?: { code: string } | null;
  couponCode?: string | null;
};

/** Item total, savings, fee and amount to pay. Used in the cart, checkout and booking pages. */
export function BillSummary({ totals, paid }: { totals: Bill; paid?: boolean }) {
  const t = strings.bill;
  const savedOnPrice = totals.mrpTotal ? totals.mrpTotal - totals.subtotal : 0;
  const couponCode = totals.coupon?.code ?? totals.couponCode;
  const saved = savedOnPrice + totals.discount + (totals.plusDiscount ?? 0) + (totals.walletUsed ?? 0);
  return (
    <dl className="mt-3 space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted">{t.itemTotal}</dt>
        <dd>
          {savedOnPrice > 0 ? <span className="mr-1.5 text-xs text-muted line-through">{rupees(totals.mrpTotal!)}</span> : null}
          {rupees(totals.subtotal)}
        </dd>
      </div>
      {totals.discount > 0 ? (
        <div className="flex justify-between text-emerald-700">
          <dt>{t.coupon}{couponCode ? ` (${couponCode})` : ""}</dt>
          <dd>-{rupees(totals.discount)}</dd>
        </div>
      ) : null}
      {totals.plusDiscount ? (
        <div className="flex justify-between text-emerald-700">
          <dt>{t.plusDiscount}</dt>
          <dd>-{rupees(totals.plusDiscount)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between">
        <dt className="text-muted">{t.visitingFee}</dt>
        <dd>{totals.fee > 0 ? rupees(totals.fee) : <span className="font-semibold text-emerald-700">{t.free}</span>}</dd>
      </div>
      {totals.plusFee ? (
        <div className="flex justify-between">
          <dt className="text-muted">{t.plusFee}</dt>
          <dd>{rupees(totals.plusFee)}</dd>
        </div>
      ) : null}
      {totals.walletUsed ? (
        <div className="flex justify-between text-emerald-700">
          <dt>{t.credit}</dt>
          <dd>-{rupees(totals.walletUsed)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
        <dt>{paid ? t.paid : t.total}</dt>
        <dd>{rupees(totals.total)}</dd>
      </div>
      <p className="text-xs text-muted">{t.taxes}</p>
      {saved > 0 ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{fmt(t.youSave, { amount: rupees(saved) })}</p> : null}
    </dl>
  );
}
