import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "Help and FAQs", description: "Answers about booking, payments, rescheduling, refunds and our professionals." };

const fee = `₹${site.convenienceFee}`;
const freeAbove = `₹${site.freeFeeAbove.toLocaleString("en-IN")}`;

const SECTIONS: { title: string; faqs: [string, string][] }[] = [
  {
    title: "Booking",
    faqs: [
      ["How do I book a service?", "Choose a service, pick the option that fits your home, add it to your cart, then choose an address and a time slot at checkout. You will see the booking in My bookings right away."],
      ["How soon can a professional come?", `The earliest slot is about ${site.slots.leadMinutes / 60} hours from now. Slots run every hour from ${site.slots.firstHour} AM to ${site.slots.lastHour - 12} PM, and you can book up to ${site.slots.days} days ahead.`],
      ["Can I book more than one service in one visit?", "Yes. Add everything to your cart and book together. The estimated time shown in the cart covers all of it."],
      ["What is the start code?", "Each booking has a 4-digit start code in My bookings. Share it with the professional only when they reach your home. This confirms the right person has arrived."],
    ],
  },
  {
    title: "Rescheduling and cancelling",
    faqs: [
      ["How do I reschedule?", `Open the booking in My bookings and tap Reschedule. It is free up to ${site.changeCutoffMinutes / 60} hours before the slot.`],
      ["How do I cancel?", `Open the booking and tap Cancel booking. Cancelling is free up to ${site.changeCutoffMinutes / 60} hours before the slot. After that, please contact support.`],
      ["When do I get my refund?", "If you paid online, the full amount goes back to your original payment method within 5 to 7 working days of cancelling."],
    ],
  },
  {
    title: "Payments and prices",
    faqs: [
      ["Do prices include GST?", "Yes. The price you see is the price you pay, including taxes."],
      ["Is there a minimum order?", `Yes. The smallest booking is ₹${site.minOrder.toLocaleString("en-IN")} of services. Add more services to the same visit to reach it.`],
      ["Is there a visiting fee?", `A visiting fee of ${fee} applies to orders below ${freeAbove}. Orders of ${freeAbove} or more have no visiting fee.`],
      ["How can I pay?", "Pay online when you book (UPI, cards, net banking or wallets), or choose pay after service and pay the professional by UPI or cash once the job is done."],
      ["What if the professional asks for more money?", `Our professionals must charge only the price on your booking. If extra work is needed, they will explain it and you can choose. If anyone asks for more than your booking, write to ${site.supportEmail}.`],
    ],
  },
  {
    title: "Quality and safety",
    faqs: [
      ["Who are the professionals?", "Independent, experienced professionals who partner with us. We check their ID and skills before they can take jobs, and customers rate every visit."],
      ["What does the warranty cover?", `If the same problem comes back within ${site.warrantyDays} days of the visit, we send a professional to fix it again at no charge. Spare parts bought separately are covered by their own maker's warranty.`],
      ["I am not happy with the service. What now?", `Rate the booking and write to ${site.supportEmail} with your booking code within 7 days. We will arrange a free redo or work out a fair solution.`],
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="container-page py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Help and FAQs</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        Quick answers to common questions. Need something else? <Link href="/contact" className="font-semibold text-brand-700">Contact us</Link>.
      </p>
      <div className="mt-8 max-w-3xl space-y-10">
        {SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-bold">{s.title}</h2>
            <div className="mt-3 divide-y divide-line rounded-2xl border border-line bg-white">
              {s.faqs.map(([q, a]) => (
                <details key={q} className="group px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold [&::-webkit-details-marker]:hidden">
                    {q}
                    <ChevronDown className="size-5 shrink-0 text-muted transition group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
