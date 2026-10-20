"use client";

import { useState, useTransition } from "react";
import { acceptJob, completeJob, markOnTheWay, startJob } from "@/app/actions/partner";

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
  const { error, busy, run } = useAction();
  return (
    <div>
      <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => run(() => acceptJob(code))}>
        {busy ? "Accepting..." : "Accept job"}
      </button>
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}

export function JobActions({ code, status }: { code: string; status: string }) {
  const { error, busy, run } = useAction();
  const [startCode, setStartCode] = useState("");

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex flex-wrap items-end gap-2">
        {status === "ASSIGNED" ? (
          <button type="button" className="btn-outline" disabled={busy} onClick={() => run(() => markOnTheWay(code))}>I am on my way</button>
        ) : null}
        {status === "ASSIGNED" || status === "ON_THE_WAY" ? (
          <>
            <div>
              <label htmlFor={`sc-${code}`} className="label">Customer start code</label>
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
              Start job
            </button>
          </>
        ) : null}
        {status === "IN_PROGRESS" ? (
          <button
            type="button"
            className="btn-primary"
            disabled={busy}
            onClick={() => {
              if (confirm("Mark this job as complete? Collect payment first if the customer chose pay after service.")) run(() => completeJob(code));
            }}
          >
            Mark job complete
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
