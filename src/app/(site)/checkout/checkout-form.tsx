"use client";

import { submitKeepingValues } from "@/lib/forms";
import { useActionState, useState } from "react";
import { Banknote, CalendarClock, CreditCard, MapPin, Plus, User } from "lucide-react";
import { placeOrder, type CheckoutState } from "@/app/actions/checkout";
import { AddressFields, type CityChoice } from "@/components/address-fields";
import { SlotPicker, type SlotDayData } from "@/components/slot-picker";
import { strings, fmt } from "@/strings";

type SavedAddress = { id: string; label: string; cityId: string; text: string };

function Step({ n, icon: Icon, title, children }: { n: number; icon: typeof User; title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5 sm:p-6" aria-labelledby={`step-${n}`}>
      <h2 id={`step-${n}`} className="flex items-center gap-2.5 text-lg font-bold">
        <span className="grid size-8 place-items-center rounded-full bg-brand-50 text-brand-700"><Icon className="size-4" aria-hidden="true" /></span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function CheckoutForm({
  name,
  phone,
  addresses,
  cities,
  slotsByCity,
  total,
  onlineEnabled,
}: {
  name: string;
  phone: string;
  addresses: SavedAddress[];
  cities: CityChoice[];
  slotsByCity: Record<string, SlotDayData[]>;
  total: number;
  onlineEnabled: boolean;
}) {
  const [state, submit, placing] = useActionState<CheckoutState, FormData>(placeOrder, {});
  const t = strings.checkout;
  const [addressId, setAddressId] = useState(addresses[0]?.id ?? "new");
  const [newCityId, setNewCityId] = useState("");
  const [slot, setSlot] = useState("");
  const [slotMissing, setSlotMissing] = useState(false);

  function pickSlot(iso: string) {
    setSlot(iso);
    setSlotMissing(false);
  }

  /** Without a time slot, point the customer at the slot picker instead of sending the form. */
  function checkSlot(): boolean {
    if (slot) return true;
    setSlotMissing(true);
    document.getElementById("step-3")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return false;
  }
  const [payment, setPayment] = useState(onlineEnabled ? "ONLINE" : "PAY_AFTER_SERVICE");

  const cityId = addressId === "new" ? newCityId : addresses.find((a) => a.id === addressId)?.cityId ?? "";
  const days = cityId ? slotsByCity[cityId] ?? [] : [];
  const amount = `₹${total.toLocaleString("en-IN")}`;

  return (
    <form onSubmit={submitKeepingValues(submit, checkSlot)} className="min-w-0 space-y-5">
      <Step n={1} icon={User} title={t.contact}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="name">{t.yourName}</label>
            <input id="name" name="name" className="input" defaultValue={name} autoComplete="name" required minLength={2} />
          </div>
          <div>
            <span className="label">{t.mobile}</span>
            <p className="input bg-surface text-muted">+91 {phone}</p>
          </div>
        </div>
      </Step>

      <Step n={2} icon={MapPin} title={t.address}>
        <input type="hidden" name="addressId" value={addressId} />
        {addresses.length ? (
          <div className="space-y-2">
            {addresses.map((a) => (
              <label key={a.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3.5 ${addressId === a.id ? "border-brand-700 bg-brand-50/60" : "border-line"}`}>
                <input
                  type="radio"
                  name="addressChoice"
                  className="mt-1 accent-brand-700"
                  checked={addressId === a.id}
                  onChange={() => { setAddressId(a.id); setSlot(""); }}
                />
                <span className="text-sm">
                  <span className="font-semibold">{a.label}</span>
                  <span className="block text-muted">{a.text}</span>
                </span>
              </label>
            ))}
            <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 ${addressId === "new" ? "border-brand-700 bg-brand-50/60" : "border-line"}`}>
              <input type="radio" name="addressChoice" className="accent-brand-700" checked={addressId === "new"} onChange={() => { setAddressId("new"); setSlot(""); }} />
              <span className="flex items-center gap-1.5 text-sm font-semibold"><Plus className="size-4" aria-hidden="true" /> {t.newAddress}</span>
            </label>
          </div>
        ) : null}
        {addressId === "new" ? (
          <div className={addresses.length ? "mt-4 border-t border-line pt-4" : ""}>
            <AddressFields cities={cities} cityId={newCityId} onCityChange={(id) => { setNewCityId(id); setSlot(""); }} />
          </div>
        ) : null}
      </Step>

      <Step n={3} icon={CalendarClock} title={t.dateTime}>
        {slotMissing ? (
          <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-danger" role="alert">
            {cityId ? t.pickTime : t.pickCityFirst}
          </p>
        ) : null}
        {cityId ? (
          <SlotPicker key={cityId} days={days} value={slot} onChange={pickSlot} />
        ) : (
          <p className="text-sm text-muted">{t.chooseCity}</p>
        )}
        <div className="mt-4">
          <label className="label" htmlFor="notes">{t.notes} <span className="font-normal text-muted">{t.optional}</span></label>
          <textarea id="notes" name="notes" rows={2} maxLength={500} className="input" placeholder={t.notesPlaceholder} />
        </div>
      </Step>

      <Step n={4} icon={CreditCard} title={t.payment}>
        <input type="hidden" name="payment" value={payment} />
        <div className="grid gap-2 sm:grid-cols-2">
          {onlineEnabled ? (
            <button
              type="button"
              onClick={() => setPayment("ONLINE")}
              aria-pressed={payment === "ONLINE"}
              className={`flex items-start gap-3 rounded-xl border p-3.5 text-left ${payment === "ONLINE" ? "border-brand-700 bg-brand-50/60" : "border-line"}`}
            >
              <CreditCard className="mt-0.5 size-5 text-brand-700" aria-hidden="true" />
              <span className="text-sm"><span className="font-semibold">{t.payOnline}</span><span className="block text-muted">{t.payOnlineText}</span></span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setPayment("PAY_AFTER_SERVICE")}
            aria-pressed={payment === "PAY_AFTER_SERVICE"}
            className={`flex items-start gap-3 rounded-xl border p-3.5 text-left ${payment === "PAY_AFTER_SERVICE" ? "border-brand-700 bg-brand-50/60" : "border-line"}`}
          >
            <Banknote className="mt-0.5 size-5 text-brand-700" aria-hidden="true" />
            <span className="text-sm"><span className="font-semibold">{t.payAfter}</span><span className="block text-muted">{t.payAfterText}</span></span>
          </button>
        </div>
      </Step>

      {state.error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-danger" role="alert">{state.error}</p> : null}

      <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">{t.freeChange}</p>
        <button className="btn-primary px-8 py-3 text-base" disabled={placing}>
          {placing ? t.booking : fmt(payment === "ONLINE" ? t.continuePay : t.confirm, { amount })}
        </button>
      </div>
    </form>
  );
}
