"use client";

import { useOptimistic, useTransition } from "react";
import { Minus, Plus } from "lucide-react";
import { setCartQuantity } from "@/app/actions/cart";
import { strings } from "@/strings";

/** "Add" button that turns into a quantity stepper once the item is in the cart. */
export function AddToCart({ variantId, quantity, label }: { variantId: string; quantity: number; label?: string }) {
  const d = strings.cartButton;
  const [pending, start] = useTransition();
  const [qty, setQty] = useOptimistic(quantity);

  function change(next: number) {
    start(async () => {
      setQty(next);
      const r = await setCartQuantity(variantId, next);
      if (!r.ok && r.error) alert(r.error);
    });
  }

  if (qty <= 0) {
    return (
      <button type="button" onClick={() => change(1)} disabled={pending} className="btn-outline min-w-24 border-brand-600 text-brand-700 hover:bg-brand-50">
        {label ?? d.add}
      </button>
    );
  }
  return (
    <div className="inline-flex min-w-24 items-center justify-between rounded-xl border border-brand-600 bg-brand-50 text-brand-800" aria-live="polite">
      <button type="button" onClick={() => change(qty - 1)} disabled={pending} className="grid size-10 place-items-center rounded-l-xl hover:bg-brand-100" aria-label={d.removeOne}>
        <Minus className="size-4" />
      </button>
      <span className="w-6 text-center text-sm font-bold">{qty}</span>
      <button type="button" onClick={() => change(qty + 1)} disabled={pending || qty >= 10} className="grid size-10 place-items-center rounded-r-xl hover:bg-brand-100" aria-label={d.addOne}>
        <Plus className="size-4" />
      </button>
    </div>
  );
}
