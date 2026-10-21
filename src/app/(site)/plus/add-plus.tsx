"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPlus } from "@/app/actions/cart";
import { strings } from "@/strings";

/** Adds Plus to the cart, then sends the customer to their cart. */
export function AddPlusButton() {
  const t = strings.plus;
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() =>
        start(async () => {
          await setPlus(true);
          router.push("/cart");
        })
      }
      className="btn w-full bg-saffron py-3 text-base text-ink hover:bg-amber-400"
    >
      {busy ? t.adding : t.add}
    </button>
  );
}
