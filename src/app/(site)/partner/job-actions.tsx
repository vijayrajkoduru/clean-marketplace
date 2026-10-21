"use client";

import { useState, useTransition } from "react";
import { acceptJob, completeJob, markOnTheWay, startJob } from "@/app/actions/partner";
import { strings } from "@/strings";

type Result = { ok: true } | { ok: false; error: string };

function useAction() {
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  function run(fn: () => Promise<Result>) {
    setError("");
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error);
    });
  }
  return { error, busy, run };
}

export function AcceptJob({ code }: { code: string }) {
  const t = strings.partner;
  const { error, busy, run } = useAction();
  return (
    <div>
      <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => run(() => acceptJob(code))}>
        {busy ? t.accepting : t.accept}
      </button>
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}

export function JobActions({ code, status }: { code: string; status: string }) {
  const t = strings.partner;
  const { error, busy, run } = useAction();
  const [startCode, setStartCode] = useState("");

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex flex-wrap items-end gap-2">
        {status === "ASSIGNED" ? (
          <button type="button" className="btn-outline" disabled={busy} onClick={() => run(() => markOnTheWay(code))}>{t.onMyWay}</button>
        ) : null}
        {status === "ASSIGNED" || status === "ON_THE_WAY" ? (
          <>
            <div>
              <label htmlFor={`sc-${code}`} className="label">{t.startCode}</label>
              <input
                id={`sc-${code}`}
                inputMode="numeric"
                maxLength={4}
                value={startCode}
                onChange={(e) => setStartCode(e.target.value.replace(/\D/g, ""))}
                className="input w-28 text-center font-mono tracking-[0.3em]"
              />
            </div>
            <button type="button" className="btn-primary" disabled={busy || startCode.length !== 4} onClick={() => run(() => startJob(code, startCode))}>
              {t.start}
            </button>
          </>
        ) : null}
        {status === "IN_PROGRESS" ? (
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => {
              if (confirm(t.completeConfirm)) run(() => completeJob(code));
            }}
          >
            {t.complete}
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
