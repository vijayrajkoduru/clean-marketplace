"use client";

import { submitKeepingValues } from "@/lib/forms";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import type { AdminState } from "@/app/actions/admin";

type FormAction = (state: AdminState, form: FormData) => Promise<AdminState>;

/** A form wired to an admin Server Action, with its message shown under the button. */
export function ActionForm({
  action,
  children,
  submitLabel = "Save",
  className = "",
  resetOnSuccess = false,
}: {
  action: FormAction;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, run, pending] = useActionState<AdminState, FormData>(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} onSubmit={submitKeepingValues(run)} className={className}>
      {children}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Saving..." : submitLabel}</button>
        {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
        {state.message ? <p className="text-sm font-medium text-emerald-700" role="status">{state.message}</p> : null}
      </div>
    </form>
  );
}

/** A button that runs a bound Server Action. Shows the error, if any. */
export function ActionButton({
  action,
  label,
  confirmText,
  className = "btn-outline",
}: {
  action: () => Promise<unknown>;
  label: string;
  confirmText?: string;
  className?: string;
}) {
  const [busy, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <span className="inline-flex flex-col">
      <button
        type="button"
        className={className}
        disabled={busy}
        onClick={() => {
          if (confirmText && !confirm(confirmText)) return;
          setError("");
          start(async () => {
            const r = (await action()) as { ok?: boolean; error?: string } | undefined;
            if (r && r.ok === false && r.error) setError(r.error);
          });
        }}
      >
        {busy ? "..." : label}
      </button>
      {error ? <span className="mt-1 text-xs text-danger" role="alert">{error}</span> : null}
    </span>
  );
}

/** Placeholder while an admin page loads. */
export function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-6 h-8 w-48 animate-pulse rounded-lg bg-white" />
      <div className="h-80 animate-pulse rounded-2xl bg-white" />
    </div>
  );
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      {children}
    </div>
  );
}
