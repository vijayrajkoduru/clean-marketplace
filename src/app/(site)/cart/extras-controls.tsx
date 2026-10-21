"use client";

import { useTransition } from "react";
import { setPlus, setUseCredit } from "@/app/actions/cart";
import { strings } from "@/strings";

export function PlusToggle({ on }: { on: boolean }) {
  const [busy, start] = useTransition();
  const t = strings.cart;
  return on ? (
    <button type="button" disabled={busy} onClick={() => start(() => setPlus(false))} className="text-sm font-semibold text-danger">
      {t.remove}
    </button>
  ) : (
    <button type="button" disabled={busy} onClick={() => start(() => setPlus(true))} className="btn-dark px-4 py-2">
      {busy ? t.adding : t.addPlus}
    </button>
  );
}

export function CreditToggle({ on, label }: { on: boolean; label: string }) {
  const [busy, start] = useTransition();
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm">
      <input type="checkbox" className="mt-0.5 size-4 accent-brand-700" checked={on} disabled={busy} onChange={(e) => start(() => setUseCredit(e.target.checked))} />
      <span>{label}</span>
    </label>
  );
}
