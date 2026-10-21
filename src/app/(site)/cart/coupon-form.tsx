"use client";

import { submitKeepingValues } from "@/lib/forms";
import { useActionState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { applyCoupon, removeCoupon, type CouponState } from "@/app/actions/cart";
import { strings } from "@/strings";

export function CouponForm({ applied, invalid }: { applied: { code: string; description: string } | null; invalid: string | null }) {
  const [state, apply, applying] = useActionState<CouponState, FormData>(applyCoupon, {});
  const [removing, startRemove] = useTransition();
  const d = strings;

  if (applied) {
    return (
      <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-emerald-50 px-3 py-2.5">
        <p className="flex items-start gap-2 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span><span className="font-mono font-bold">{applied.code}</span> {d.coupon.appliedLabel} {applied.description}</span>
        </p>
        <button type="button" disabled={removing} onClick={() => startRemove(() => removeCoupon())} className="text-sm font-semibold text-danger">
          {d.cart.remove}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submitKeepingValues(apply)} className="mt-3">
      <div className="flex gap-2">
        <label htmlFor="coupon" className="sr-only">{d.coupon.label}</label>
        <input id="coupon" name="code" className="input uppercase" placeholder={d.coupon.placeholder} autoComplete="off" />
        <button className="btn-dark shrink-0" disabled={applying}>{applying ? "..." : d.coupon.apply}</button>
      </div>
      {state.error || invalid ? <p className="mt-2 text-sm text-danger" role="alert">{state.error ?? invalid}</p> : null}
      {invalid && !state.error ? (
        <button type="button" onClick={() => startRemove(() => removeCoupon())} className="mt-1 text-xs font-semibold text-muted underline">
          {d.coupon.clear}
        </button>
      ) : null}
    </form>
  );
}
