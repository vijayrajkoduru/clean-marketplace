"use client";

import { useTransition } from "react";
import { setCartQuantity } from "@/app/actions/cart";

/** Removes a catering line, which has no quantity buttons. */
export function RemoveLine({ variantId, label }: { variantId: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="text-sm font-semibold text-danger hover:underline disabled:opacity-50" disabled={pending} onClick={() => start(async () => void (await setCartQuantity(variantId, 0)))}>
      {label}
    </button>
  );
}
