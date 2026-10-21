"use client";

import { useState } from "react";
import { strings } from "@/strings";

export type SlotDayData = { key: string; weekday: string; day: string; slots: { iso: string; label: string; available: boolean }[] };

/** Day tabs and time buttons. The chosen slot is submitted as the hidden "slot" field. */
export function SlotPicker({ days, name = "slot", value, onChange }: { days: SlotDayData[]; name?: string; value?: string; onChange?: (iso: string) => void }) {
  const text = strings.slots;
  const firstOpen = days.find((d) => d.slots.some((s) => s.available))?.key ?? days[0]?.key;
  const [dayKey, setDayKey] = useState(firstOpen);
  const [own, setOwn] = useState(value ?? "");
  const picked = onChange ? (value ?? "") : own;
  const setPicked = onChange ? () => {} : setOwn;
  const day = days.find((d) => d.key === dayKey) ?? days[0];

  if (!days.length) return <p className="text-sm text-muted">{text.none}</p>;

  function choose(iso: string) {
    setPicked(iso);
    onChange?.(iso);
  }

  return (
    <div>
      <input type="hidden" name={name} value={picked} />
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="tablist" aria-label={text.chooseDay}>
        {days.map((d) => {
          const open = d.slots.some((s) => s.available);
          const active = d.key === day?.key;
          return (
            <button
              key={d.key}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={!open}
              onClick={() => setDayKey(d.key)}
              className={`flex min-w-16 flex-col items-center rounded-xl border px-3 py-2 text-sm transition ${
                active ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-white hover:border-brand-600"
              } disabled:cursor-not-allowed disabled:opacity-40`}
            >
              <span className={`text-xs ${active ? "text-white/80" : "text-muted"}`}>{d.weekday}</span>
              <span className="font-semibold">{d.day}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {day?.slots.map((s) => (
          <button
            key={s.iso}
            type="button"
            disabled={!s.available}
            onClick={() => choose(s.iso)}
            aria-pressed={picked === s.iso}
            className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition ${
              picked === s.iso ? "border-brand-700 bg-brand-50 text-brand-800 ring-2 ring-brand-200" : "border-line bg-white hover:border-brand-600"
            } disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted/60 disabled:line-through`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
