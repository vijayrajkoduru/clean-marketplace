"use client";

import { useState, useTransition } from "react";
import { adminSetStatus, assignPartner } from "@/app/actions/admin";

const STATUSES: [string, string][] = [
  ["CONFIRMED", "Confirmed (unassign professional)"],
  ["ASSIGNED", "Professional assigned"],
  ["ON_THE_WAY", "On the way"],
  ["IN_PROGRESS", "In progress"],
  ["COMPLETED", "Completed"],
  ["CANCELLED", "Cancelled"],
];

function useRun() {
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: success } : { ok: false, text: r.error });
    });
  }
  return { busy, msg, run };
}

function Msg({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <p className={`mt-2 text-sm ${msg.ok ? "text-emerald-700" : "text-danger"}`} role="status">{msg.text}</p>;
}

export function AssignPartner({ code, partners, current }: { code: string; partners: { id: string; name: string; phone: string }[]; current: string | null }) {
  const [partnerId, setPartnerId] = useState(current ?? partners[0]?.id ?? "");
  const { busy, msg, run } = useRun();
  if (!partners.length) return <p className="mt-3 text-sm text-amber-800">No approved professional in this city has all the skills this booking needs.</p>;
  return (
    <div className="mt-4">
      <div className="flex flex-wrap gap-2">
        <select className="input max-w-sm" value={partnerId} onChange={(e) => setPartnerId(e.target.value)} aria-label="Professional">
          {partners.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>)}
        </select>
        <button type="button" className="btn-primary" disabled={busy || !partnerId} onClick={() => run(() => assignPartner(code, partnerId), "Professional assigned.")}>
          {current ? "Reassign" : "Assign"}
        </button>
      </div>
      <Msg msg={msg} />
    </div>
  );
}

export function SetStatus({ code, current }: { code: string; current: string }) {
  const [status, setStatus] = useState(current);
  const [note, setNote] = useState("");
  const { busy, msg, run } = useRun();
  return (
    <div className="mt-4">
      <div className="grid gap-2 sm:grid-cols-[220px_1fr_auto]">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="New status">
          {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input className="input" placeholder="Note (shown in activity)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        <button
          type="button"
          className="btn-dark"
          disabled={busy || status === current}
          onClick={() => {
            if (status === "CANCELLED" && !confirm("Cancel this booking? A paid booking will be marked for refund.")) return;
            run(() => adminSetStatus(code, status, note), "Status updated.");
          }}
        >
          Update
        </button>
      </div>
      <Msg msg={msg} />
    </div>
  );
}
