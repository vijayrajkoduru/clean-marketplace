"use client";

import { strings } from "@/strings";

export type CityChoice = { id: string; name: string; state: string };

/** Fields for a new address. Used at checkout and on the account page. */
export function AddressFields({ cities, cityId, onCityChange }: { cities: CityChoice[]; cityId?: string; onCityChange?: (id: string) => void }) {
  const t = strings.address;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="line1">{t.line1}</label>
        <input id="line1" name="line1" className="input" autoComplete="address-line1" placeholder={t.line1Placeholder} required minLength={5} />
      </div>
      <div>
        <label className="label" htmlFor="line2">{t.line2} <span className="font-normal text-muted">{t.optional}</span></label>
        <input id="line2" name="line2" className="input" autoComplete="address-line2" placeholder={t.line2Placeholder} />
      </div>
      <div>
        <label className="label" htmlFor="landmark">{t.landmark} <span className="font-normal text-muted">{t.optional}</span></label>
        <input id="landmark" name="landmark" className="input" placeholder={t.landmarkPlaceholder} />
      </div>
      <div>
        <label className="label" htmlFor="cityId">{t.city}</label>
        <select id="cityId" name="cityId" className="input" required defaultValue={cityId ?? ""} onChange={(e) => onCityChange?.(e.target.value)}>
          <option value="" disabled>{t.chooseCity}</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}, {c.state}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="pincode">{t.pincode}</label>
        <input
          id="pincode"
          name="pincode"
          className="input"
          inputMode="numeric"
          maxLength={6}
          autoComplete="postal-code"
          placeholder="500034"
          required
          pattern="[0-9]{6}"
          title={t.pincodeHint}
          onInput={(e) => (e.currentTarget.value = e.currentTarget.value.replace(/D/g, ""))}
        />
      </div>
      <div className="sm:col-span-2">
        <span className="label">{t.saveAs}</span>
        <div className="flex gap-2">
          {["Home", "Work", "Other"].map((l, i) => (
            <label key={l} className="cursor-pointer">
              <input type="radio" name="label" value={l} defaultChecked={i === 0} className="peer sr-only" />
              <span className="inline-block rounded-full border border-line px-4 py-1.5 text-sm peer-checked:border-brand-700 peer-checked:bg-brand-50 peer-checked:text-brand-800">{l}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
