"use client";

import { submitKeepingValues } from "@/lib/forms";
import { useActionState, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addAddress, deleteAddress, saveProfile, type FormState } from "@/app/actions/account";
import { AddressFields, type CityChoice } from "@/components/address-fields";
import { strings } from "@/strings";

function Message({ state }: { state: FormState }) {
  if (state.error) return <p className="text-sm text-danger" role="alert">{state.error}</p>;
  if (state.message) return <p className="text-sm font-medium text-emerald-700" role="status">{state.message}</p>;
  return null;
}

export function ProfileForm({ name, email, phone }: { name: string; email: string; phone: string }) {
  const t = strings.account;
  const [state, save, saving] = useActionState<FormState, FormData>(saveProfile, {});
  return (
    <form onSubmit={submitKeepingValues(save)} className="mt-4 space-y-4">
      <div>
        <label className="label" htmlFor="name">{t.name}</label>
        <input id="name" name="name" className="input" defaultValue={name} autoComplete="name" />
      </div>
      <div>
        <label className="label" htmlFor="email">{t.email} <span className="font-normal text-muted">{t.emailNote}</span></label>
        <input id="email" name="email" type="email" className="input" defaultValue={email} autoComplete="email" />
      </div>
      <div>
        <span className="label">{t.mobile}</span>
        <p className="input bg-surface text-muted">+91 {phone}</p>
      </div>
      <Message state={state} />
      <button className="btn-primary" disabled={saving}>{saving ? t.saving : t.saveProfile}</button>
    </form>
  );
}

export function AddAddressForm({ cities }: { cities: CityChoice[] }) {
  const t = strings.account;
  const [open, setOpen] = useState(false);
  const [state, add, adding] = useActionState<FormState, FormData>(async (prev, form) => {
    const result = await addAddress(prev, form);
    if (result.ok) setOpen(false);
    return result;
  }, {});

  if (!open) {
    return (
      <button type="button" className="btn-outline mt-4" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden="true" /> {t.addAddress}
      </button>
    );
  }
  return (
    <form onSubmit={submitKeepingValues(add)} className="mt-5 space-y-4 border-t border-line pt-5">
      <AddressFields cities={cities} />
      <Message state={state} />
      <div className="flex gap-2">
        <button className="btn-primary" disabled={adding}>{adding ? t.saving : t.saveAddress}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>{t.cancel}</button>
      </div>
    </form>
  );
}

export function DeleteAddressButton({ id }: { id: string }) {
  const t = strings.account;
  const [busy, start] = useTransition();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (confirm(t.removeConfirm)) start(() => deleteAddress(id));
      }}
      className="grid size-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-danger"
      aria-label={t.removeAddress}
    >
      <Trash2 className="size-4" />
    </button>
  );
}
