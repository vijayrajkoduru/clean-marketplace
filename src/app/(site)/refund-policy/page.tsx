import type { Metadata } from "next";
import { site } from "@/config/site";
import { TextPage } from "@/components/text-page";

export const metadata: Metadata = { title: "Cancellation and refund policy" };

export default function RefundPolicyPage() {
  const hours = site.changeCutoffMinutes / 60;
  return (
    <TextPage title="Cancellation and refund policy" updated="20 October 2026">
      <h2>Cancelling a booking</h2>
      <ul>
        <li>Cancel for free from My bookings up to {hours} hours before your slot.</li>
        <li>Within {hours} hours of the slot, please write to <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>. We will try to help, but the professional may already be on the way.</li>
        <li>Online bookings that are not paid within 30 minutes are cancelled automatically and the slot is released.</li>
      </ul>

      <h2>Rescheduling</h2>
      <p>Reschedule for free from My bookings up to {hours} hours before your slot, to any open slot in the next {site.slots.days} days.</p>

      <h2>If we cancel</h2>
      <p>
        If we cannot send a professional, we will tell you as early as possible and offer another slot. If you paid online and do not want a new slot, you get a full refund.
      </p>

      <h2>Refunds</h2>
      <ul>
        <li>Refunds go back to the original payment method.</li>
        <li>They are sent within 2 working days of cancellation and usually reach you within 5 to 7 working days, depending on your bank.</li>
        <li>Pay-after-service bookings need no refund, because nothing was paid.</li>
      </ul>

      <h2>Not happy with the work</h2>
      <p>
        Tell us within 7 days of the visit, with your booking code and photos if possible. We will send a professional for a free redo. If the work cannot be fixed, we will
        refund the price of that service.
      </p>

      <h2>Warranty</h2>
      <p>If the same problem comes back within {site.warrantyDays} days of the visit, we will arrange a free repeat visit.</p>
    </TextPage>
  );
}
