"use client";

export type CityChoice = { id: string; name: string; state: string };

/** Fields for a new address. Used at checkout and on the account page. */
export function AddressFields({ cities, cityId, onCityChange }: { cities: CityChoice[]; cityId?: string; onCityChange?: (id: string) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="line1">House or flat number, building and street</label>
        <input id="line1" name="line1" className="input" autoComplete="address-line1" placeholder="Flat 302, Sai Residency, Road No. 5" />
      </div>
      <div>
        <label className="label" htmlFor="line2">Area or locality <span className="font-normal text-muted">(optional)</span></label>
        <input id="line2" name="line2" className="input" autoComplete="address-line2" placeholder="Banjara Hills" />
      </div>
      <div>
        <label className="label" htmlFor="landmark">Landmark <span className="font-normal text-muted">(optional)</span></label>
        <input id="landmark" name="landmark" className="input" placeholder="Near City Hospital" />
      </div>
      <div>
        <label className="label" htmlFor="cityId">City</label>
        <select id="cityId" name="cityId" className="input" defaultValue={cityId ?? ""} onChange={(e) => onCityChange?.(e.target.value)}>
          <option value="" disabled>Choose your city</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>{c.name}, {c.state}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="pincode">PIN code</label>
        <input id="pincode" name="pincode" className="input" inputMode="numeric" maxLength={6} autoComplete="postal-code" placeholder="500034" />
      </div>
      <div className="sm:col-span-2">
        <span className="label">Save as</span>
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
