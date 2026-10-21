"use client";

import { submitKeepingValues } from "@/lib/forms";
import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { applyAsPartner, type ApplyState } from "@/app/actions/partner";
import { strings } from "@/strings";

type Option = { id: string; name: string };

const ID_TYPES = ["AADHAAR", "PAN", "DRIVING_LICENCE", "VOTER_ID"] as const;

export function ApplyForm({ name, categories, cities }: { name: string; categories: Option[]; cities: (Option & { state: string })[] }) {
  const t = strings.join;
  const [state, apply, applying] = useActionState<ApplyState, FormData>(applyAsPartner, {});

  if (state.ok) {
    return (
      <div className="mt-4 flex gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-900">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p className="text-sm">{t.received}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submitKeepingValues(apply)} className="mt-4 space-y-4">
      <div>
        <label className="label" htmlFor="p-name">{t.fullName}</label>
        <input id="p-name" name="name" className="input" defaultValue={name} autoComplete="name" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="p-city">{t.city}</label>
          <select id="p-city" name="cityId" className="input" defaultValue="">
            <option value="" disabled>{t.chooseCity}</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="p-exp">{t.experience}</label>
          <input id="p-exp" name="experienceYears" type="number" min={0} max={50} defaultValue={1} className="input" />
        </div>
      </div>
      <fieldset>
        <legend className="label">{t.skills}</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <label key={c.id} className="cursor-pointer">
              <input type="checkbox" name="skills" value={c.id} className="peer sr-only" />
              <span className="inline-block rounded-full border border-line px-3 py-1.5 text-sm peer-checked:border-brand-700 peer-checked:bg-brand-50 peer-checked:text-brand-800 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-200">{c.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="p-id">{t.idProof}</label>
          <select id="p-id" name="idProofType" className="input" defaultValue="AADHAAR">
            {ID_TYPES.map((k) => <option key={k} value={k}>{t.idTypes[k]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="p-last4">{t.idLast4}</label>
          <input id="p-last4" name="idProofLast4" maxLength={4} className="input uppercase" placeholder="1234" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="p-iddoc">{t.idPhoto}</label>
        <input id="p-iddoc" name="idDoc" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-800" />
        <p className="mt-1 text-xs text-muted">{t.idPhotoNote}</p>
      </div>
      <div>
        <label className="label" htmlFor="p-photo">{t.yourPhoto} <span className="font-normal text-muted">{t.yourPhotoNote}</span></label>
        <input id="p-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="input file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-800" />
      </div>
      <p className="-mt-2 text-xs text-muted">{t.privacyNote}</p>
      <div>
        <label className="label" htmlFor="p-bio">{t.about} <span className="font-normal text-muted">{t.optional}</span></label>
        <textarea id="p-bio" name="bio" rows={3} maxLength={400} className="input" placeholder={t.aboutPlaceholder} />
      </div>
      {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
      <button className="btn-primary w-full" disabled={applying}>{applying ? t.sending : t.submit}</button>
    </form>
  );
}
