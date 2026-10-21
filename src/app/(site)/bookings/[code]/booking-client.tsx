"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { cancelBooking, confirmOnlinePayment, rateBooking, rescheduleBooking } from "@/app/actions/booking";
import { SlotPicker, type SlotDayData } from "@/components/slot-picker";
import { site } from "@/config/site";
import { strings, fmt } from "@/strings";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

function loadCheckout(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/** Opens Razorpay Checkout and confirms the payment on the server. */
export function PayNow({ code, orderId, keyId, amount, name, phone }: { code: string; orderId: string; keyId: string; amount: number; name: string; phone: string }) {
  const t = strings.booking;
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  async function pay() {
    setError("");
    const ok = await loadCheckout();
    if (!ok || !window.Razorpay) {
      setError(t.payLoadError);
      return;
    }
    const rzp = new window.Razorpay({
      key: keyId,
      order_id: orderId,
      amount: amount * 100,
      currency: "INR",
      name: site.name,
      description: fmt(t.payDescription, { code }),
      prefill: { name, contact: `+91${phone}` },
      theme: { color: "#0b685a" },
      handler: (r: RazorpayResponse) => {
        start(async () => {
          const res = await confirmOnlinePayment(code, { orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature });
          if (!res.ok) setError(res.error);
        });
      },
    });
    rzp.on("payment.failed", (r) => setError(r.error?.description ?? t.payFailed));
    rzp.open();
  }

  return (
    <div className="mt-4">
      <button type="button" onClick={pay} disabled={busy} className="btn-primary px-6">
        {busy ? t.confirming : fmt(t.pay, { amount: `₹${amount.toLocaleString("en-IN")}` })}
      </button>
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}


export function BookingActions({ code, slotDays, paid }: { code: string; slotDays: SlotDayData[]; paid: boolean }) {
  const t = strings.booking;
  const [mode, setMode] = useState<"none" | "reschedule" | "cancel">("none");
  const [slot, setSlot] = useState("");
  const [reason, setReason] = useState(t.reasons[0]);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  function run(fn: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError("");
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error);
      else setMode("none");
    });
  }

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="font-bold">{t.changeTitle}</h2>
      <p className="mt-1 text-sm text-muted">{t.changeText}</p>
      {mode === "none" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="btn-outline" onClick={() => setMode("reschedule")}>{t.reschedule}</button>
          <button type="button" className="btn-ghost text-danger" onClick={() => setMode("cancel")}>{t.cancel}</button>
        </div>
      ) : null}

      {mode === "reschedule" ? (
        <div className="mt-4">
          <SlotPicker days={slotDays} value={slot} onChange={setSlot} />
          <div className="mt-4 flex gap-2">
            <button type="button" className="btn-primary" disabled={!slot || busy} onClick={() => run(() => rescheduleBooking(code, slot))}>
              {busy ? t.saving : t.confirmTime}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setMode("none")}>{t.back}</button>
          </div>
        </div>
      ) : null}

      {mode === "cancel" ? (
        <div className="mt-4 space-y-3">
          <label className="label" htmlFor="reason">{t.whyCancel}</label>
          <select id="reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
            {t.reasons.map((r) => <option key={r}>{r}</option>)}
          </select>
          {paid ? <p className="text-sm text-muted">{t.refundNote}</p> : null}
          <div className="flex gap-2">
            <button type="button" className="btn bg-danger text-white hover:bg-red-700" disabled={busy} onClick={() => run(() => cancelBooking(code, reason))}>
              {busy ? t.cancelling : t.yesCancel}
            </button>
            <button type="button" className="btn-ghost" onClick={() => setMode("none")}>{t.keep}</button>
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-danger" role="alert">{error}</p> : null}
    </section>
  );
}

export function RateBooking({ code }: { code: string }) {
  const t = strings.booking;
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const shown = hover || stars;

  return (
    <div>
      <h2 className="font-bold">{t.rateTitle}</h2>
      <p className="mt-1 text-sm text-muted">{t.rateText}</p>
      <div className="mt-3 flex gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label={t.ratingLabel}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={stars === n} aria-label={fmt(n > 1 ? t.stars : t.star, { n })} onMouseEnter={() => setHover(n)} onClick={() => setStars(n)}>
            <Star className={`size-8 ${n <= shown ? "fill-saffron text-saffron" : "text-line"}`} />
          </button>
        ))}
      </div>
      <textarea className="input mt-3" rows={2} maxLength={500} placeholder={t.tellMore} value={comment} onChange={(e) => setComment(e.target.value)} />
      <button
        type="button"
        className="btn-primary mt-3"
        disabled={!stars || busy}
        onClick={() =>
          start(async () => {
            const r = await rateBooking(code, stars, comment);
            if (!r.ok) setError(r.error);
          })
        }
      >
        {busy ? t.sending : t.submitRating}
      </button>
      {error ? <p className="mt-2 text-sm text-danger" role="alert">{error}</p> : null}
    </div>
  );
}
