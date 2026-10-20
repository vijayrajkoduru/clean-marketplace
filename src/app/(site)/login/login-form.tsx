"use client";

import { useActionState, useState } from "react";
import { confirmCode, requestCode, type LoginState } from "@/app/actions/auth";

export function LoginForm({ next }: { next: string }) {
  const [sent, sendCode, sending] = useActionState<LoginState, FormData>(requestCode, { step: "phone", next });
  const [checked, verify, verifying] = useActionState<LoginState, FormData>(confirmCode, { step: "code", next });
  const [editing, setEditing] = useState(false);
  const onCodeStep = sent.step === "code" && !editing;

  if (!onCodeStep) {
    return (
      <form action={(fd) => { setEditing(false); sendCode(fd); }} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="label" htmlFor="phone">Mobile number</label>
          <div className="flex rounded-xl border border-line focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100">
            <span className="grid place-items-center border-r border-line px-3 text-sm text-muted">+91</span>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              defaultValue={sent.phone}
              placeholder="98765 43210"
              className="w-full rounded-r-xl px-3.5 py-2.5 text-sm focus:outline-none"
              autoFocus
            />
          </div>
        </div>
        {sent.error ? <p className="text-sm font-medium text-danger" role="alert">{sent.error}</p> : null}
        <button className="btn-primary w-full" disabled={sending}>{sending ? "Sending code..." : "Get code"}</button>
        <p className="text-xs text-muted">By continuing you agree to our terms and privacy policy.</p>
      </form>
    );
  }

  return (
    <form action={verify} className="mt-6 space-y-4">
      <input type="hidden" name="phone" value={sent.phone} />
      <input type="hidden" name="next" value={next} />
      <p className="text-sm">
        Code sent to <span className="font-semibold">+91 {sent.phone}</span>.{" "}
        <button type="button" onClick={() => setEditing(true)} className="font-semibold text-brand-700">Change number</button>
      </p>
      {sent.devCode ? (
        <p className="rounded-xl bg-saffron-50 px-3 py-2 text-sm text-amber-900">Test mode: your code is <span className="font-mono font-bold">{sent.devCode}</span></p>
      ) : null}
      <div>
        <label className="label" htmlFor="code">6-digit code</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input text-center font-mono text-lg tracking-[0.5em]" autoFocus />
      </div>
      {checked.error ? <p className="text-sm font-medium text-danger" role="alert">{checked.error}</p> : null}
      <button className="btn-primary w-full" disabled={verifying}>{verifying ? "Checking..." : "Verify and continue"}</button>
    </form>
  );
}
