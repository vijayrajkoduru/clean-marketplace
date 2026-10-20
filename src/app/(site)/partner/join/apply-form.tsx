"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { applyAsPartner, type ApplyState } from "@/app/actions/partner";

type Option = { id: string; name: string };

export function ApplyForm({ name, categories, cities }: { name: string; categories: Option[]; cities: (Option & { state: string })[] }) {
  const [state, apply, applying] = useActionState<ApplyState, FormData>(applyAsPartner, {});

  if (state.ok) {
    return (
      <div className="mt-4 flex gap-3 rounded-xl bg-emerald-50 p-4 text-emerald-900">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p className="text-sm">Application received. Our team will call you within 2 working days to verify your ID and skills.</p>
      </div>
    );
  }

  return (
    <form action={apply} className="mt-4 space-y-4">
      <div>
        <label className="label" htmlFor="p-name">Full name (as on your ID)</label>
        <input id="p-name" name="name" className="input" defaultValue={name} autoComplete="name" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="p-city">City</label>
          <select id="p-city" name="cityId" className="input" defaultValue="">
            <option value="" disabled>Choose city</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="p-exp">Years of experience</label>
          <input id="p-exp" name="experienceYears" type="number" min={0} max={50} defaultValue={1} className="input" />
        </div>
      </div>
      <fieldset>
        <legend className="label">Services you are trained in</legend>
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
          <label className="label" htmlFor="p-id">ID proof</label>
          <select id="p-id" name="idProofType" className="input" defaultValue="AADHAAR">
            <option value="AADHAAR">Aadhaar</option>
            <option value="PAN">PAN card</option>
            <option value="DRIVING_LICENCE">Driving licence</option>
            <option value="VOTER_ID">Voter ID</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="p-last4">Last 4 characters of ID</label>
          <input id="p-last4" name="idProofLast4" maxLength={4} className="input uppercase" placeholder="1234" />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted">We never ask for your full ID number online. We check the original during your verification call.</p>
      <div>
        <label className="label" htmlFor="p-bio">About your work <span className="font-normal text-muted">(optional)</span></label>
        <textarea id="p-bio" name="bio" rows={3} maxLength={400} className="input" placeholder="Where you have worked, tools you own, languages you speak" />
      </div>
      {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
      <button className="btn-primary w-full" disabled={applying}>{applying ? "Sending..." : "Submit application"}</button>
    </form>
  );
}
